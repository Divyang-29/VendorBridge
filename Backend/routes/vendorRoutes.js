const express = require("express");

const {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  updateVendorStatus,
  deleteVendor,
} = require("../controllers/vendorController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// ===============================
// Create Vendor
// Admin, Procurement
// ===============================
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
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
// Update Vendor
// Admin, Procurement
// ===============================
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  updateVendor,
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
