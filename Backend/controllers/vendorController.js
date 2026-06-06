const Vendor = require("../models/Vendor");

// ======================================
// Create Vendor
// ======================================
const createVendor = async (req, res) => {
  try {
    const { vendorName, category, gstNumber, email, phone, address } = req.body;

    const existingVendor = await Vendor.findOne({
      gstNumber,
      isDeleted: false,
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor already exists",
      });
    }

    const vendor = await Vendor.create({
      vendorName,
      category,
      gstNumber,
      email,
      phone,
      address,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get All Vendors
// ======================================
const getAllVendors = async (req, res) => {
  try {
    const { search, category, status } = req.query;

    const query = {
      isDeleted: false,
    };

    if (search) {
      query.$or = [
        {
          vendorName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          gstNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const vendors = await Vendor.find(query)
      .populate("createdBy", "name email role")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get Vendor By ID
// ======================================
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("createdBy", "name email role");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      vendor,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Update Vendor
// ======================================
const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const { vendorName, category, gstNumber, email, phone, address } = req.body;

    vendor.vendorName = vendorName ?? vendor.vendorName;

    vendor.category = category ?? vendor.category;

    vendor.gstNumber = gstNumber ?? vendor.gstNumber;

    vendor.email = email ?? vendor.email;

    vendor.phone = phone ?? vendor.phone;

    vendor.address = address ?? vendor.address;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Update Vendor Status
// ======================================
const updateVendorStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["active", "inactive", "blacklisted"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const vendor = await Vendor.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.status = status;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor status updated",
      vendor,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Soft Delete Vendor
// ======================================
const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    vendor.isDeleted = true;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
};
