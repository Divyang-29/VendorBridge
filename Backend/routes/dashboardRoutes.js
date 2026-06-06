const express = require("express");
const {
  getDashboardMetrics,
  getReportsAndAnalytics,
} = require("../controllers/dashboardController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Get Dashboard metrics (internally switches response layout depending on role)
router.get("/metrics", authMiddleware, getDashboardMetrics);

// Get Reports & Analytical Trends (Admin, Procurement, Manager only)
router.get(
  "/reports",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager"),
  getReportsAndAnalytics
);

module.exports = router;
