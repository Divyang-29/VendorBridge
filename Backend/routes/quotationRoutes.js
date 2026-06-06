const express = require("express");
const {
  submitQuotation,
  getAllQuotations,
  getQuotationById,
  updateQuotation,
  getQuotationsByRFQ,
} = require("../controllers/quotationController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Get all quotations
router.get("/", authMiddleware, getAllQuotations);

// Get quotation by ID
router.get("/:id", authMiddleware, getQuotationById);

// Submit quotation (Vendor only)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("vendor"),
  upload.array("attachments"),
  submitQuotation
);

// Edit/update quotation (Vendor only)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("vendor"),
  upload.array("attachments"),
  updateQuotation
);

// Compare quotations side-by-side for a given RFQ (Admin, Procurement, Manager)
router.get(
  "/rfq/:rfqId",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  getQuotationsByRFQ
);

module.exports = router;
