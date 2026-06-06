const express = require("express");
const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  downloadInvoicePDF,
  sendInvoiceEmail,
  updateInvoiceStatus,
} = require("../controllers/invoiceController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Get all invoices
router.get("/", authMiddleware, getAllInvoices);

// Get invoice by ID
router.get("/:id", authMiddleware, getInvoiceById);

// Generate Invoice from Purchase Order (Admin, Procurement, Vendor)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement", "vendor"),
  createInvoice
);

// Download Invoice PDF (Generates/serves PDF)
router.get("/:id/pdf", authMiddleware, downloadInvoicePDF);

// Send Invoice PDF via Email (Admin, Procurement, Manager, Vendor)
router.post(
  "/:id/send-email",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager", "vendor"),
  sendInvoiceEmail
);

// Update Invoice status (e.g., mark as Paid) (Admin, Procurement, Manager)
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  updateInvoiceStatus
);

module.exports = router;
