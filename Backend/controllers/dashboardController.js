const RFQ = require("../models/RFQ");
const Quotation = require("../models/Quotation");
const PurchaseOrder = require("../models/PurchaseOrder");
const Invoice = require("../models/Invoice");
const Vendor = require("../models/Vendor");
const { getVendorProfileForUser } = require("./rfqController");

// ======================================
// Get Dashboard Metrics
// ======================================
const getDashboardMetrics = async (req, res) => {
  try {
    const role = req.user.role;

    if (role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile) {
        return res.status(200).json({
          success: true,
          metrics: {
            activeRFQsCount: 0,
            pendingQuotationsCount: 0,
            recentPOs: [],
            recentInvoices: [],
            totalRevenue: 0,
          },
        });
      }

      // 1. Active RFQs count assigned to vendor
      const activeRFQsCount = await RFQ.countDocuments({
        assignedVendors: vendorProfile._id,
        status: "active",
        isDeleted: false,
      });

      // 2. Pending quotations count (submitted / revised)
      const pendingQuotationsCount = await Quotation.countDocuments({
        vendorId: vendorProfile._id,
        status: { $in: ["submitted", "revised"] },
      });

      // 3. Recent POs
      const recentPOs = await PurchaseOrder.find({ vendorId: vendorProfile._id })
        .populate("rfqId", "rfqNumber title")
        .sort({ createdAt: -1 })
        .limit(5);

      // 4. Recent Invoices
      const recentInvoices = await Invoice.find({ vendorId: vendorProfile._id })
        .populate("poId", "poNumber")
        .sort({ createdAt: -1 })
        .limit(5);

      // 5. Total Revenue (sum of POs not cancelled)
      const revenueData = await PurchaseOrder.aggregate([
        {
          $match: {
            vendorId: vendorProfile._id,
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]);
      const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

      return res.status(200).json({
        success: true,
        metrics: {
          activeRFQsCount,
          pendingQuotationsCount,
          recentPOs,
          recentInvoices,
          totalRevenue,
        },
      });
    }

    // --- Procurement Officer, Manager, Admin ---
    // 1. Active RFQs count
    const activeRFQsCount = await RFQ.countDocuments({
      status: "active",
      isDeleted: false,
    });

    // 2. Pending Approvals count (only Manager / Admin gets workflow count)
    const Approval = require("../models/Approval");
    const approvalQuery = { status: "pending_approval" };
    if (role === "manager") {
      approvalQuery.approverId = req.user.userId;
    }
    const pendingApprovalsCount = await Approval.countDocuments(approvalQuery);

    // 3. Recent POs
    const recentPOs = await PurchaseOrder.find()
      .populate("vendorId", "vendorName")
      .populate("rfqId", "rfqNumber title")
      .sort({ createdAt: -1 })
      .limit(5);

    // 4. Recent Invoices
    const recentInvoices = await Invoice.find()
      .populate("vendorId", "vendorName")
      .populate("poId", "poNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    // 5. Total Spend (POs not cancelled)
    const spendData = await PurchaseOrder.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);
    const totalSpend = spendData.length > 0 ? spendData[0].total : 0;

    // 6. Vendors count
    const totalVendors = await Vendor.countDocuments({ isDeleted: false });

    res.status(200).json({
      success: true,
      metrics: {
        activeRFQsCount,
        pendingApprovalsCount,
        recentPOs,
        recentInvoices,
        totalSpend,
        totalVendors,
      },
    });
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get Reports & Analytics
// ======================================
const getReportsAndAnalytics = async (req, res) => {
  try {
    if (req.user.role === "vendor") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Reports are only accessible to administrators and procurement staff",
      });
    }

    // 1. Monthly Spend Trends (aggregate POs by month)
    const monthlySpendTrends = await PurchaseOrder.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalSpend: { $sum: "$totalAmount" },
          poCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalSpend: 1,
          poCount: 1,
        },
      },
      {
        $sort: { year: -1, month: -1 },
      },
    ]);

    // 2. Spend by Vendor Category
    // We need to join POs with Vendors to group by vendor.category
    const spendByCategory = await PurchaseOrder.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "vendorId",
          foreignField: "_id",
          as: "vendorInfo",
        },
      },
      {
        $unwind: "$vendorInfo",
      },
      {
        $group: {
          _id: "$vendorInfo.category",
          totalSpend: { $sum: "$totalAmount" },
          poCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalSpend: 1,
          poCount: 1,
        },
      },
      {
        $sort: { totalSpend: -1 },
      },
    ]);

    // 3. Vendor Performance Summary (Total POs, total invoicing, rating estimation)
    const vendorPerformance = await PurchaseOrder.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "vendorId",
          foreignField: "_id",
          as: "vendorInfo",
        },
      },
      {
        $unwind: "$vendorInfo",
      },
      {
        $group: {
          _id: "$vendorId",
          vendorName: { $first: "$vendorInfo.vendorName" },
          category: { $first: "$vendorInfo.category" },
          totalOrders: { $sum: 1 },
          totalValue: { $sum: "$totalAmount" },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 1,
          vendorName: 1,
          category: 1,
          totalOrders: 1,
          totalValue: 1,
          deliveredOrders: 1,
          // Calculate an artificial rating/adherence score based on completed deliveries out of total orders
          deliveryRate: {
            $cond: [
              { $gt: ["$totalOrders", 0] },
              { $multiply: [{ $divide: ["$deliveredOrders", "$totalOrders"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $sort: { totalValue: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      reports: {
        monthlySpendTrends,
        spendByCategory,
        vendorPerformance,
      },
    });
  } catch (error) {
    console.error("Get Reports Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  getDashboardMetrics,
  getReportsAndAnalytics,
};
