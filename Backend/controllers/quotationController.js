const Quotation = require("../models/Quotation");
const RFQ = require("../models/RFQ");
const Vendor = require("../models/Vendor");
const { getVendorProfileForUser } = require("./rfqController");
const logActivity = require("../utils/logger");

// ======================================
// Submit Quotation
// ======================================
const submitQuotation = async (req, res) => {
  try {
    const { rfqId, items, deliveryTimeline, notes } = req.body;

    // Parse items if they were sent as a string (useful for multipart/form-data requests)
    let parsedItems = items;
    if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid items format",
        });
      }
    }

    if (!rfqId || !parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0 || !deliveryTimeline) {
      return res.status(400).json({
        success: false,
        message: "rfqId, items, and delivery timeline are required",
      });
    }

    // Find the vendor profile linked to the logged-in vendor user
    const vendorProfile = await getVendorProfileForUser(req.user);
    if (!vendorProfile) {
      return res.status(403).json({
        success: false,
        message: "No vendor profile matches this user account",
      });
    }

    // Verify RFQ exists, is active, and assigned to this vendor
    const rfq = await RFQ.findOne({ _id: rfqId, isDeleted: false });
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    if (rfq.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `This RFQ is not active (Status: ${rfq.status})`,
      });
    }

    if (new Date(rfq.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "RFQ deadline has already passed",
      });
    }

    if (!rfq.assignedVendors.includes(vendorProfile._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to submit a quotation for this RFQ",
      });
    }

    // Verify vendor hasn't already submitted a quotation for this RFQ
    const existingQuotation = await Quotation.findOne({
      rfqId,
      vendorId: vendorProfile._id,
    });
    if (existingQuotation) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a quotation for this RFQ. Please update the existing one if allowed.",
      });
    }

    let totalPrice = 0;
    const validatedItems = parsedItems.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const subtotal = quantity * price;
      totalPrice += subtotal;

      return {
        itemName: item.itemName,
        quantity,
        price,
        subtotal,
      };
    });

    let attachments = [];
    if (req.files) {
      attachments = req.files.map((file) => file.path);
    }

    const quotation = await Quotation.create({
      rfqId,
      vendorId: vendorProfile._id,
      vendorUserId: req.user.userId,
      items: validatedItems,
      totalPrice,
      deliveryTimeline,
      notes,
      attachments,
    });

    await logActivity(
      req.user.userId,
      "SUBMIT_QUOTATION",
      "Quotation",
      quotation._id,
      `Vendor ${vendorProfile.vendorName} submitted quotation for RFQ ${rfq.rfqNumber}`
    );

    res.status(201).json({
      success: true,
      message: "Quotation submitted successfully",
      quotation,
    });
  } catch (error) {
    console.error("Submit Quotation Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get All Quotations
// ======================================
const getAllQuotations = async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile) {
        return res.status(200).json({
          success: true,
          count: 0,
          quotations: [],
        });
      }
      query.vendorId = vendorProfile._id;
    }

    const quotations = await Quotation.find(query)
      .populate("rfqId", "rfqNumber title deadline status")
      .populate("vendorId", "vendorName category email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quotations.length,
      quotations,
    });
  } catch (error) {
    console.error("Get All Quotations Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get Quotation By ID
// ======================================
const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("rfqId", "rfqNumber title description deadline status items")
      .populate("vendorId", "vendorName category email phone address gstNumber");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Access control for vendors
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile || !quotation.vendorId._id.equals(vendorProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You cannot view this quotation",
        });
      }
    }

    res.status(200).json({
      success: true,
      quotation,
    });
  } catch (error) {
    console.error("Get Quotation By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Update Quotation (Edit)
// ======================================
const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Access check
    const vendorProfile = await getVendorProfileForUser(req.user);
    if (!vendorProfile || !quotation.vendorId.equals(vendorProfile._id)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You cannot modify this quotation",
      });
    }

    // Check if quotation can be edited (e.g. status must be submitted or revised)
    if (["accepted", "rejected"].includes(quotation.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a quotation that has already been ${quotation.status}`,
      });
    }

    const { items, deliveryTimeline, notes } = req.body;

    let attachments = [...quotation.attachments];
    if (req.files) {
      attachments.push(...req.files.map((file) => file.path));
    }

    if (items) {
      let parsedItems = items;
      if (typeof items === "string") {
        try {
          parsedItems = JSON.parse(items);
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: "Invalid items format",
          });
        }
      }

      let totalPrice = 0;
      const validatedItems = parsedItems.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const subtotal = quantity * price;
        totalPrice += subtotal;

        return {
          itemName: item.itemName,
          quantity,
          price,
          subtotal,
        };
      });

      quotation.items = validatedItems;
      quotation.totalPrice = totalPrice;
    }

    quotation.deliveryTimeline = deliveryTimeline ?? quotation.deliveryTimeline;
    quotation.notes = notes ?? quotation.notes;
    quotation.attachments = attachments;
    quotation.status = "revised"; // Automatically mark as revised if edited

    await quotation.save();

    await logActivity(
      req.user.userId,
      "UPDATE_QUOTATION",
      "Quotation",
      quotation._id,
      `Vendor ${vendorProfile.vendorName} updated quotation for RFQ ID: ${quotation.rfqId}`
    );

    res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      quotation,
    });
  } catch (error) {
    console.error("Update Quotation Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get Quotations For Side-By-Side Comparison
// ======================================
const getQuotationsByRFQ = async (req, res) => {
  try {
    const { rfqId } = req.params;

    const rfq = await RFQ.findOne({ _id: rfqId, isDeleted: false });
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    const quotations = await Quotation.find({ rfqId })
      .populate("vendorId", "vendorName category email phone address gstNumber status")
      .sort({ totalPrice: 1 }); // Sorted by lowest price first

    if (quotations.length === 0) {
      return res.status(200).json({
        success: true,
        rfq,
        comparison: {
          lowestPriceQuotationId: null,
          fastestDeliveryQuotationId: null,
          quotations: [],
        },
      });
    }

    // Side-by-side and highlight calculations
    let lowestPriceId = quotations[0]._id;
    let lowestPrice = quotations[0].totalPrice;

    // Delivery days parser helper (e.g. "5 days" -> 5)
    const parseDeliveryDays = (timelineStr) => {
      const match = timelineStr.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : Infinity;
    };

    let fastestDeliveryId = quotations[0]._id;
    let minDeliveryDays = parseDeliveryDays(quotations[0].deliveryTimeline);

    quotations.forEach((q) => {
      // Find lowest price
      if (q.totalPrice < lowestPrice) {
        lowestPrice = q.totalPrice;
        lowestPriceId = q._id;
      }
      // Find fastest delivery
      const days = parseDeliveryDays(q.deliveryTimeline);
      if (days < minDeliveryDays) {
        minDeliveryDays = days;
        fastestDeliveryId = q._id;
      }
    });

    res.status(200).json({
      success: true,
      rfq,
      comparison: {
        lowestPriceQuotationId: lowestPriceId,
        fastestDeliveryQuotationId: fastestDeliveryId,
        quotations: quotations.map((q) => ({
          _id: q._id,
          vendor: q.vendorId,
          items: q.items,
          totalPrice: q.totalPrice,
          deliveryTimeline: q.deliveryTimeline,
          notes: q.notes,
          status: q.status,
          attachments: q.attachments,
          isLowestPrice: q._id.equals(lowestPriceId),
          isFastestDelivery: q._id.equals(fastestDeliveryId),
        })),
      },
    });
  } catch (error) {
    console.error("Get Quotations By RFQ Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  submitQuotation,
  getAllQuotations,
  getQuotationById,
  updateQuotation,
  getQuotationsByRFQ,
};
