const express = require("express");
const {
  submitForApproval,
  getAllApprovals,
  getApprovalById,
  processApproval,
} = require("../controllers/approvalController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Submit quotation for approval (Admin, Procurement)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement"),
  submitForApproval
);

// Get all approval requests (Admin, Procurement, Manager)
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  getAllApprovals
);

// Get approval request by ID (Admin, Procurement, Manager)
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  getApprovalById
);

// Process approval (Approve or Reject) (Admin, Manager)
router.post(
  "/:id/action",
  authMiddleware,
  roleMiddleware("admin", "manager"),
  processApproval
);

module.exports = router;
