const ActivityLog = require("../models/ActivityLog");

// ======================================
// Get Activity Logs
// ======================================
const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, entityType, action } = req.query;

    const query = {};

    // If role is vendor, scope logs to vendor's user ID
    if (req.user.role === "vendor") {
      query.userId = req.user.userId;
    }

    if (entityType) {
      query.entityType = entityType;
    }
    if (action) {
      query.action = action;
    }

    const totalLogs = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      totalPages: Math.ceil(totalLogs / parseInt(limit)),
      currentPage: parseInt(page),
      totalLogs,
      logs,
    });
  } catch (error) {
    console.error("Get Activity Logs Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  getActivityLogs,
};
