const RFQ = require("../models/RFQ");
const Vendor = require("../models/Vendor");
const User = require("../models/User");
const logActivity = require("../utils/logger");

// Helper to find vendor profile for user
const getVendorProfileForUser = async (user) => {
  if (user.role !== "vendor") return null;
  // Find vendor where email matches vendor user's email
  // The User collection contains email, and Vendor collection has email.
  const userRecord = await User.findById(user.userId);
  if (!userRecord) return null;
  return await Vendor.findOne({ email: userRecord.email, isDeleted: false });
};

// ======================================
// Create RFQ
// ======================================
const createRFQ = async (req, res) => {
  try {
    const { title, description, items, deadline, assignedVendors } = req.body;

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

    // Parse assignedVendors if sent as string
    let parsedVendors = assignedVendors;
    if (typeof assignedVendors === "string") {
      try {
        parsedVendors = JSON.parse(assignedVendors);
      } catch (err) {
        parsedVendors = assignedVendors.split(",").map(v => v.trim()).filter(Boolean);
      }
    }

    if (!title || !deadline || !parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title, deadline, and a non-empty list of items are required",
      });
    }

    // Generate unique RFQ number
    const today = new Date();
    const dateStr = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");
    const count = await RFQ.countDocuments({
      rfqNumber: new RegExp(`^RFQ-${dateStr}-`),
    });
    const seq = String(count + 1).padStart(4, "0");
    const rfqNumber = `RFQ-${dateStr}-${seq}`;

    // Map file attachments if uploaded
    let attachments = [];
    if (req.files) {
      attachments = req.files.map((file) => file.path);
    }

    const rfq = await RFQ.create({
      rfqNumber,
      title,
      description,
      items: parsedItems,
      deadline: new Date(deadline),
      attachments,
      assignedVendors: parsedVendors || [],
      createdBy: req.user.userId,
    });

    await logActivity(
      req.user.userId,
      "CREATE_RFQ",
      "RFQ",
      rfq._id,
      `Created RFQ ${rfq.rfqNumber}: "${rfq.title}"`
    );

    res.status(201).json({
      success: true,
      message: "RFQ created successfully",
      rfq,
    });
  } catch (error) {
    console.error("Create RFQ Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get All RFQs
// ======================================
const getAllRFQs = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = { isDeleted: false };

    // Role-based visibility
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile) {
        return res.status(200).json({
          success: true,
          count: 0,
          rfqs: [],
          message: "No vendor profile linked to this user account",
        });
      }
      query.assignedVendors = vendorProfile._id;
      query.status = "active"; // Vendors should generally only see active RFQs
    } else if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { rfqNumber: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const rfqs = await RFQ.find(query)
      .populate("assignedVendors", "vendorName category email")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rfqs.length,
      rfqs,
    });
  } catch (error) {
    console.error("Get All RFQs Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get RFQ By ID
// ======================================
const getRFQById = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ _id: req.params.id, isDeleted: false })
      .populate("assignedVendors", "vendorName category email phone address")
      .populate("createdBy", "name email role");

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    // Role verification for vendor
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile || !rfq.assignedVendors.some((v) => v._id.equals(vendorProfile._id))) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You are not assigned to this RFQ",
        });
      }
    }

    res.status(200).json({
      success: true,
      rfq,
    });
  } catch (error) {
    console.error("Get RFQ By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Update RFQ
// ======================================
const updateRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ _id: req.params.id, isDeleted: false });

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    const { title, description, items, deadline, assignedVendors, status } = req.body;

    let attachments = [...rfq.attachments];
    if (req.files) {
      attachments.push(...req.files.map((file) => file.path));
    }

    // Parse items if they were sent as a string (multipart/form-data)
    let parsedItems = items;
    if (items && typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid items format",
        });
      }
    }

    // Parse assignedVendors if sent as string
    let parsedVendors = assignedVendors;
    if (assignedVendors && typeof assignedVendors === "string") {
      try {
        parsedVendors = JSON.parse(assignedVendors);
      } catch (err) {
        parsedVendors = assignedVendors.split(",").map(v => v.trim()).filter(Boolean);
      }
    }

    rfq.title = title ?? rfq.title;
    rfq.description = description ?? rfq.description;
    rfq.items = parsedItems ?? rfq.items;
    rfq.deadline = deadline ? new Date(deadline) : rfq.deadline;
    rfq.assignedVendors = parsedVendors ?? rfq.assignedVendors;
    rfq.status = status ?? rfq.status;
    rfq.attachments = attachments;

    await rfq.save();

    await logActivity(
      req.user.userId,
      "UPDATE_RFQ",
      "RFQ",
      rfq._id,
      `Updated RFQ ${rfq.rfqNumber}`
    );

    res.status(200).json({
      success: true,
      message: "RFQ updated successfully",
      rfq,
    });
  } catch (error) {
    console.error("Update RFQ Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Soft Delete RFQ
// ======================================
const deleteRFQ = async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ _id: req.params.id, isDeleted: false });

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    rfq.isDeleted = true;
    await rfq.save();

    await logActivity(
      req.user.userId,
      "DELETE_RFQ",
      "RFQ",
      rfq._id,
      `Soft deleted RFQ ${rfq.rfqNumber}`
    );

    res.status(200).json({
      success: true,
      message: "RFQ deleted successfully",
    });
  } catch (error) {
    console.error("Delete RFQ Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createRFQ,
  getAllRFQs,
  getRFQById,
  updateRFQ,
  deleteRFQ,
  getVendorProfileForUser, // Exported to be shared with other controllers if needed
};
