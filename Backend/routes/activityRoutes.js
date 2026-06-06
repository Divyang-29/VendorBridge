const express = require("express");
const { getActivityLogs } = require("../controllers/activityController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Get Activity logs (Admin, Procurement, Manager only)
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  getActivityLogs
);

module.exports = router;
