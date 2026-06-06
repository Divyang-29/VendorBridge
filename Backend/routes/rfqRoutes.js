const express = require("express");
const {
  createRFQ,
  getAllRFQs,
  getRFQById,
  updateRFQ,
  deleteRFQ,
} = require("../controllers/rfqController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Get all RFQs (internal role filtering logic in controller)
router.get("/", authMiddleware, getAllRFQs);

// Get RFQ by ID (internal role filtering logic in controller)
router.get("/:id", authMiddleware, getRFQById);

// Create RFQ (Admin, Procurement)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  upload.array("attachments"),
  createRFQ
);

// Update RFQ (Admin, Procurement)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  upload.array("attachments"),
  updateRFQ
);

// Soft delete RFQ (Admin, Procurement)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  deleteRFQ
);

module.exports = router;
