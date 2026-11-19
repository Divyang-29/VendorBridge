const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const { validateGSTIN, validateMSME } = require("../utils/complianceValidator");
const logActivity = require("../utils/logger");

// ======================================
// Create Vendor
// ======================================
const createVendor = async (req, res) => {
  try {
    const {
      vendorName,
      category,
      gstNumber,
      msmeNumber,
      msmeCategory,
      email,
      phone,
      address,
    } = req.body;

    if (!vendorName || !category || !gstNumber || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Vendor name, category, GSTIN, email, phone, and address are required.",
      });
    }

    // 1. Validate GSTIN
    const gstValidation = validateGSTIN(gstNumber);
    if (!gstValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: gstValidation.error,
      });
    }

    // Check duplicate GSTIN
    const existingGst = await Vendor.findOne({
      gstNumber: gstValidation.gstNumber,
      isDeleted: false,
    });

    if (existingGst) {
      return res.status(400).json({
        success: false,
        message: `Vendor with GSTIN ${gstValidation.gstNumber} already exists (${existingGst.vendorName}).`,
      });
    }

    // 2. Validate MSME (Optional)
    let cleanMsme = "";
    if (msmeNumber && msmeNumber.trim()) {
      const msmeValidation = validateMSME(msmeNumber);
      if (!msmeValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: msmeValidation.error,
        });
      }
      cleanMsme = msmeValidation.msmeNumber;

      const existingMsme = await Vendor.findOne({
        msmeNumber: cleanMsme,
        isDeleted: false,
      });
      if (existingMsme) {
        return res.status(400).json({
          success: false,
          message: `Vendor with MSME Udyam Number ${cleanMsme} already exists (${existingMsme.vendorName}).`,
        });
      }
    }

    // 3. Extract uploaded compliance certificates if any
    let gstCertificate = "";
    let msmeCertificate = "";
    if (req.files) {
      if (req.files.gstCertificate && req.files.gstCertificate[0]) {
        gstCertificate = `/uploads/compliance/${req.files.gstCertificate[0].filename}`;
      }
      if (req.files.msmeCertificate && req.files.msmeCertificate[0]) {
        msmeCertificate = `/uploads/compliance/${req.files.msmeCertificate[0].filename}`;
      }
    }

    // 4. Create Vendor Record
    const vendor = await Vendor.create({
      vendorName: vendorName.trim(),
      category: category.trim(),
      gstNumber: gstValidation.gstNumber,
      panNumber: gstValidation.panNumber,
      gstStateCode: gstValidation.stateCode,
      gstStateName: gstValidation.stateName,
      gstCertificate,
      gstVerificationStatus: "pending_verification",
      msmeNumber: cleanMsme,
      msmeCategory: msmeCategory || "Not Applicable",
      msmeCertificate,
      msmeVerificationStatus: cleanMsme ? "pending_verification" : "pending_verification",
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      createdBy: req.user.userId,
    });

    await logActivity(
      req.user.userId,
      "CREATE_VENDOR",
      "Vendor",
      vendor._id,
      `Onboarded supplier '${vendor.vendorName}' with GSTIN ${vendor.gstNumber} (${vendor.gstStateName})`
    );

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
        { vendorName: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
        { panNumber: { $regex: search, $options: "i" } },
        { msmeNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
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
      .populate("gstVerifiedBy", "name email")
      .populate("msmeVerifiedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    console.error("Get All Vendors Error:", error);
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
    })
      .populate("createdBy", "name email role")
      .populate("gstVerifiedBy", "name email")
      .populate("msmeVerifiedBy", "name email");

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
    console.error("Get Vendor By ID Error:", error);
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

    const {
      vendorName,
      category,
      gstNumber,
      msmeNumber,
      msmeCategory,
      email,
      phone,
      address,
    } = req.body;

    if (vendorName) vendor.vendorName = vendorName.trim();
    if (category) vendor.category = category.trim();
    if (email) vendor.email = email.trim().toLowerCase();
    if (phone) vendor.phone = phone.trim();
    if (address) vendor.address = address.trim();
    if (msmeCategory) vendor.msmeCategory = msmeCategory;

    // Validate GSTIN if changed
    if (gstNumber && gstNumber.trim().toUpperCase() !== vendor.gstNumber) {
      const gstValidation = validateGSTIN(gstNumber);
      if (!gstValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: gstValidation.error,
        });
      }

      // Check duplicate
      const duplicateGst = await Vendor.findOne({
        _id: { $ne: vendor._id },
        gstNumber: gstValidation.gstNumber,
        isDeleted: false,
      });

      if (duplicateGst) {
        return res.status(400).json({
          success: false,
          message: `Another vendor with GSTIN ${gstValidation.gstNumber} already exists.`,
        });
      }

      vendor.gstNumber = gstValidation.gstNumber;
      vendor.panNumber = gstValidation.panNumber;
      vendor.gstStateCode = gstValidation.stateCode;
      vendor.gstStateName = gstValidation.stateName;
      vendor.gstVerificationStatus = "pending_verification";
      vendor.gstVerifiedAt = null;
      vendor.gstVerifiedBy = null;
    }

    // Validate MSME if changed
    if (msmeNumber !== undefined) {
      const trimmedMsme = msmeNumber ? msmeNumber.trim().toUpperCase() : "";
      if (trimmedMsme && trimmedMsme !== vendor.msmeNumber) {
        const msmeValidation = validateMSME(trimmedMsme);
        if (!msmeValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: msmeValidation.error,
          });
        }

        const duplicateMsme = await Vendor.findOne({
          _id: { $ne: vendor._id },
          msmeNumber: msmeValidation.msmeNumber,
          isDeleted: false,
        });

        if (duplicateMsme) {
          return res.status(400).json({
            success: false,
            message: `Another vendor with MSME Udyam Number ${msmeValidation.msmeNumber} already exists.`,
          });
        }

        vendor.msmeNumber = msmeValidation.msmeNumber;
        vendor.msmeVerificationStatus = "pending_verification";
        vendor.msmeVerifiedAt = null;
        vendor.msmeVerifiedBy = null;
      } else if (!trimmedMsme && vendor.msmeNumber) {
        vendor.msmeNumber = "";
        vendor.msmeCategory = "Not Applicable";
        vendor.msmeVerificationStatus = "pending_verification";
      }
    }

    // Check certificate file replacements
    if (req.files) {
      if (req.files.gstCertificate && req.files.gstCertificate[0]) {
        vendor.gstCertificate = `/uploads/compliance/${req.files.gstCertificate[0].filename}`;
        vendor.gstVerificationStatus = "pending_verification";
      }
      if (req.files.msmeCertificate && req.files.msmeCertificate[0]) {
        vendor.msmeCertificate = `/uploads/compliance/${req.files.msmeCertificate[0].filename}`;
        vendor.msmeVerificationStatus = "pending_verification";
      }
    }

    await vendor.save();

    await logActivity(
      req.user.userId,
      "UPDATE_VENDOR",
      "Vendor",
      vendor._id,
      `Updated profile & compliance details for '${vendor.vendorName}'`
    );

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (error) {
    console.error("Update Vendor Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// ======================================
// Verify Statutory Compliance (GST & MSME)
// ======================================
const verifyVendorCompliance = async (req, res) => {
  try {
    const { complianceType, status, remarks, gstStatus, msmeStatus, gstRemarks, msmeRemarks } = req.body;

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

    const validStatuses = ["verified", "pending_verification", "rejected"];

    let updatedLogs = [];

    // GST verification
    if (complianceType === "gst" || gstStatus) {
      const targetStatus = gstStatus || status;
      if (!validStatuses.includes(targetStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid GST verification status: ${targetStatus}`,
        });
      }
      vendor.gstVerificationStatus = targetStatus;
      vendor.gstVerifiedAt = targetStatus === "pending_verification" ? null : new Date();
      vendor.gstVerifiedBy = targetStatus === "pending_verification" ? null : req.user.userId;
      vendor.gstVerificationRemarks = gstRemarks !== undefined ? gstRemarks : (remarks || "");
      updatedLogs.push(`GST status set to '${targetStatus}'`);
    }

    // MSME verification
    if (complianceType === "msme" || msmeStatus) {
      const targetStatus = msmeStatus || status;
      if (!validStatuses.includes(targetStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid MSME verification status: ${targetStatus}`,
        });
      }
      vendor.msmeVerificationStatus = targetStatus;
      vendor.msmeVerifiedAt = targetStatus === "pending_verification" ? null : new Date();
      vendor.msmeVerifiedBy = targetStatus === "pending_verification" ? null : req.user.userId;
      vendor.msmeVerificationRemarks = msmeRemarks !== undefined ? msmeRemarks : (remarks || "");
      updatedLogs.push(`MSME status set to '${targetStatus}'`);
    }

    // Batch verify all if complianceType === "all"
    if (complianceType === "all" && status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid verification status: ${status}`,
        });
      }
      vendor.gstVerificationStatus = status;
      vendor.gstVerifiedAt = status === "pending_verification" ? null : new Date();
      vendor.gstVerifiedBy = status === "pending_verification" ? null : req.user.userId;
      vendor.gstVerificationRemarks = remarks || "";

      if (vendor.msmeNumber) {
        vendor.msmeVerificationStatus = status;
        vendor.msmeVerifiedAt = status === "pending_verification" ? null : new Date();
        vendor.msmeVerifiedBy = status === "pending_verification" ? null : req.user.userId;
        vendor.msmeVerificationRemarks = remarks || "";
      }
      updatedLogs.push(`All statutory compliances set to '${status}'`);
    }

    if (updatedLogs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please specify complianceType ('gst', 'msme', or 'all') and a valid status.",
      });
    }

    await vendor.save();

    await logActivity(
      req.user.userId,
      "VERIFY_VENDOR_COMPLIANCE",
      "Vendor",
      vendor._id,
      `Statutory compliance audit for '${vendor.vendorName}': ${updatedLogs.join(", ")}`
    );

    const populatedVendor = await Vendor.findById(vendor._id)
      .populate("createdBy", "name email role")
      .populate("gstVerifiedBy", "name email")
      .populate("msmeVerifiedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Statutory compliance updated successfully",
      vendor: populatedVendor,
    });
  } catch (error) {
    console.error("Verify Compliance Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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

    const oldStatus = vendor.status;
    vendor.status = status;
    await vendor.save();

    await logActivity(
      req.user.userId,
      "UPDATE_VENDOR_STATUS",
      "Vendor",
      vendor._id,
      `Vendor '${vendor.vendorName}' status changed from '${oldStatus}' to '${status}'`
    );

    res.status(200).json({
      success: true,
      message: "Vendor status updated",
      vendor,
    });
  } catch (error) {
    console.error("Update Vendor Status Error:", error);
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

    await logActivity(
      req.user.userId,
      "DELETE_VENDOR",
      "Vendor",
      vendor._id,
      `Soft-deleted vendor '${vendor.vendorName}' (${vendor.gstNumber})`
    );

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("Delete Vendor Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get Vendor Statutory Certificate (Secure Stream)
// ======================================
const getVendorCertificate = async (req, res) => {
  try {
    const { id, type } = req.params;

    if (!["gst", "msme"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid certificate type requested. Must be 'gst' or 'msme'.",
      });
    }

    const vendor = await Vendor.findOne({ _id: id, isDeleted: false });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor record not found.",
      });
    }

    // Role-based document access control:
    // admin, procurement, manager -> authorized for all vendor compliance documents
    // vendor -> authorized only for their own organization's documents
    if (req.user.role === "vendor") {
      const userRecord = await User.findById(req.user.userId);
      const isOwner =
        (userRecord && userRecord.email.toLowerCase() === vendor.email.toLowerCase()) ||
        (vendor.createdBy && vendor.createdBy.toString() === req.user.userId);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You are not authorized to view compliance certificates for this vendor.",
        });
      }
    } else if (!["admin", "procurement", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Insufficient authorization to access statutory compliance archives.",
      });
    }

    const certPath = type === "gst" ? vendor.gstCertificate : vendor.msmeCertificate;
    if (!certPath) {
      return res.status(404).json({
        success: false,
        message: `No ${type.toUpperCase()} statutory certificate on record for this vendor.`,
      });
    }

    // Configurable compliance upload directory (auto-creates if missing)
    const configuredComplianceDir = process.env.COMPLIANCE_UPLOAD_DIR
      ? path.resolve(process.env.COMPLIANCE_UPLOAD_DIR)
      : path.join(__dirname, "../uploads/compliance");

    if (!fs.existsSync(configuredComplianceDir)) {
      fs.mkdirSync(configuredComplianceDir, { recursive: true });
    }

    // Strict path-traversal protection:
    // Strip any directory traversal components from the stored path
    const safeFilename = path.basename(certPath);

    // Allowed base roots for document resolution
    const allowedRoots = [
      configuredComplianceDir,
      path.resolve(__dirname, "../uploads/compliance"),
      path.resolve(__dirname, "../uploads"),
    ];

    const candidatePaths = [
      path.join(configuredComplianceDir, safeFilename),
      path.join(__dirname, "../uploads/compliance", safeFilename),
      path.join(__dirname, "../uploads", safeFilename),
      path.join(__dirname, "..", certPath.startsWith("/") ? certPath.slice(1) : certPath),
    ];

    let resolvedPath = null;
    for (const cand of candidatePaths) {
      const normalized = path.resolve(cand);
      if (fs.existsSync(normalized)) {
        // Enforce strict boundary check: must reside inside one of the allowed roots
        const isWithinBoundary = allowedRoots.some(
          (root) => normalized === root || normalized.startsWith(root + path.sep)
        );
        if (isWithinBoundary) {
          resolvedPath = normalized;
          break;
        }
      }
    }

    if (!resolvedPath) {
      return res.status(404).json({
        success: false,
        message: "Compliance document file not found or failed path-traversal verification.",
      });
    }

    // Determine MIME type
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeMap = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${vendor.vendorName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${type}_certificate${ext}"`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  } catch (error) {
    console.error("Get Vendor Certificate Error:", error);
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
  verifyVendorCompliance,
  getVendorCertificate,
  deleteVendor,
};
