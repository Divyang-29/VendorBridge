const ActivityLog = require("../models/ActivityLog");

/**
 * Helper to log an administrative or procurement action to the database.
 * @param {string} userId - ID of the User performing the action
 * @param {string} action - Action identifier (e.g. "CREATE_RFQ")
 * @param {string} entityType - Entity model affected ("RFQ", "Quotation", "Approval", "PurchaseOrder", "Invoice", "Vendor")
 * @param {string} entityId - ObjectId of the affected entity
 * @param {string} description - Brief details of what occurred
 */
const logActivity = async (userId, action, entityType, entityId, description) => {
  try {
    const log = await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      description,
    });
    return log;
  } catch (error) {
    console.error("Failed to create ActivityLog:", error);
  }
};

module.exports = logActivity;
