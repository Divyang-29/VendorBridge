const PurchaseOrder = require("../models/PurchaseOrder");
const Quotation = require("../models/Quotation");
const RFQ = require("../models/RFQ");
const { getVendorProfileForUser } = require("./rfqController");
const logActivity = require("../utils/logger");

// ======================================
// Generate Purchase Order
// ======================================
const createPO = async (req, res) => {
  try {
    const { quotationId } = req.body;

    if (!quotationId) {
      return res.status(400).json({
        success: false,
        message: "quotationId is required",
      });
    }

    // Verify quotation exists and is approved
    const quotation = await Quotation.findById(quotationId).populate("rfqId");
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    if (quotation.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Cannot generate PO from a quotation that is not accepted (Current Status: ${quotation.status})`,
      });
    }

    // Check if a PO is already created for this quotation
    const existingPO = await PurchaseOrder.findOne({ quotationId });
    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: "A Purchase Order has already been generated for this quotation",
        po: existingPO,
      });
    }

    // Generate unique sequential PO number
    const today = new Date();
    const dateStr = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");
    const count = await PurchaseOrder.countDocuments({
      poNumber: new RegExp(`^PO-${dateStr}-`),
    });
    const seq = String(count + 1).padStart(4, "0");
    const poNumber = `PO-${dateStr}-${seq}`;

    // Map items from quotation
    const items = quotation.items.map((item) => ({
      itemName: item.itemName,
      description: item.itemName, // default
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    // Calculate tax (let's assume 18% GST)
    const subtotal = quotation.totalPrice;
    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const po = await PurchaseOrder.create({
      poNumber,
      rfqId: quotation.rfqId._id,
      quotationId: quotation._id,
      vendorId: quotation.vendorId,
      items,
      taxAmount,
      totalAmount,
      status: "issued",
      createdBy: req.user.userId,
    });

    await logActivity(
      req.user.userId,
      "GENERATE_PO",
      "PurchaseOrder",
      po._id,
      `Generated Purchase Order ${po.poNumber} for RFQ ${quotation.rfqId.rfqNumber}`
    );

    res.status(201).json({
      success: true,
      message: "Purchase Order generated successfully",
      po,
    });
  } catch (error) {
    console.error("Create PO Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get All Purchase Orders
// ======================================
const getAllPOs = async (req, res) => {
  try {
    const query = {};

    // Vendor visibility filter
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile) {
        return res.status(200).json({
          success: true,
          count: 0,
          purchaseOrders: [],
        });
      }
      query.vendorId = vendorProfile._id;
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate("rfqId", "rfqNumber title")
      .populate("vendorId", "vendorName category email")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      purchaseOrders,
    });
  } catch (error) {
    console.error("Get All POs Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get PO By ID
// ======================================
const getPOById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate("rfqId", "rfqNumber title description deadline items")
      .populate("vendorId", "vendorName category email phone address gstNumber")
      .populate("createdBy", "name email role");

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    // Verify vendor access
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile || !po.vendorId._id.equals(vendorProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You cannot view this Purchase Order",
        });
      }
    }

    res.status(200).json({
      success: true,
      po,
    });
  } catch (error) {
    console.error("Get PO By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Update PO Status
// ======================================
const updatePOStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    // Role restrictions on status changes
    // Vendor: can only change to acknowledged or delivered
    // Procurement/Admin: can change to issued, delivered, or cancelled
    const validStatuses = ["issued", "acknowledged", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile || !po.vendorId.equals(vendorProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You cannot update this Purchase Order",
        });
      }
      if (!["acknowledged", "delivered"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Vendors are not authorized to update status to '${status}'`,
        });
      }
    } else {
      // Procurement or Admin
      if (!["admin", "procurement"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied",
        });
      }
    }

    po.status = status;
    await po.save();

    await logActivity(
      req.user.userId,
      "UPDATE_PO_STATUS",
      "PurchaseOrder",
      po._id,
      `Updated Purchase Order ${po.poNumber} status to ${status}`
    );

    res.status(200).json({
      success: true,
      message: "Purchase Order status updated successfully",
      po,
    });
  } catch (error) {
    console.error("Update PO Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createPO,
  getAllPOs,
  getPOById,
  updatePOStatus,
};
