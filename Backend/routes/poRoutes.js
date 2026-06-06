const express = require("express");
const {
  createPO,
  getAllPOs,
  getPOById,
  updatePOStatus,
} = require("../controllers/poController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Get all Purchase Orders
router.get("/", authMiddleware, getAllPOs);

// Get Purchase Order by ID
router.get("/:id", authMiddleware, getPOById);

// Generate Purchase Order from Approved Quotation (Admin, Procurement)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  createPO
);

// Update Purchase Order status (Admin, Procurement, Vendor)
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("admin", "procurement", "vendor"),
  updatePOStatus
);

module.exports = router;
