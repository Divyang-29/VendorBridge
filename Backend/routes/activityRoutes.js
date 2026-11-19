const express = require("express");
const { getActivityLogs } = require("../controllers/activityController");

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Get Activity logs (Accessible to all authenticated enterprise roles, scoped per role)
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "procurement", "manager", "vendor"),
  getActivityLogs
);

module.exports = router;
