const express = require("express");

const {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  updateVendorStatus,
  verifyVendorCompliance,
  getVendorCertificate,
  deleteVendor,
} = require("../controllers/vendorController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const { complianceUpload } = require("../middlewares/uploadMiddleware");
const {
  vendorUploadLimiter,
  complianceVerificationLimiter,
} = require("../middlewares/rateLimiters");

const router = express.Router();

// Multer upload config for sensitive statutory documents (GST & MSME certificates)
const uploadComplianceFields = complianceUpload.fields([
  { name: "gstCertificate", maxCount: 1 },
  { name: "msmeCertificate", maxCount: 1 },
]);

// ===============================
// Create Vendor (with Rate Limiting & Audit)
// Admin, Procurement
// ===============================
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  vendorUploadLimiter,
  uploadComplianceFields,
  createVendor,
);

// ===============================
// Get All Vendors
// Admin, Procurement, Manager
// ===============================
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  getAllVendors,
);

// ===============================
// Get Vendor By ID
// Admin, Procurement, Manager
// ===============================
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  getVendorById,
);

// ===============================
// Get Vendor Statutory Certificate (Secure Stream)
// Admin, Procurement, Manager, or Owning Vendor
// ===============================
router.get(
  "/:id/certificate/:type",
  authMiddleware,
  getVendorCertificate,
);

// ===============================
// Update Vendor
// Admin, Procurement
// ===============================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  vendorUploadLimiter,
  uploadComplianceFields,
  updateVendor,
);

// ===============================
// Verify Statutory Compliance (GST & MSME)
// Admin, Procurement (Rate Limited)
// ===============================
router.patch(
  "/:id/verify-compliance",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  complianceVerificationLimiter,
  verifyVendorCompliance,
);

// ===============================
// Update Vendor Status
// Admin Only
// ===============================
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("admin"),
  updateVendorStatus,
);

// ===============================
// Delete Vendor
// Admin Only
// ===============================
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteVendor);

module.exports = router;
