const Approval = require("../models/Approval");
const Quotation = require("../models/Quotation");
const RFQ = require("../models/RFQ");
const logActivity = require("../utils/logger");

// ======================================
// Submit Quotation for Approval
// ======================================
const submitForApproval = async (req, res) => {
  try {
    const { rfqId, quotationId, approverId, remarks } = req.body;

    if (!rfqId || !quotationId) {
      return res.status(400).json({
        success: false,
        message: "rfqId and quotationId are required",
      });
    }

    // Verify RFQ and Quotation exist
    const rfq = await RFQ.findOne({ _id: rfqId, isDeleted: false });
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Check if there's already an active approval request for this RFQ
    const existingApproval = await Approval.findOne({
      rfqId,
      status: "pending_approval",
    });
    if (existingApproval) {
      return res.status(400).json({
        success: false,
        message: "There is already a pending approval request for this RFQ.",
      });
    }

    const approval = await Approval.create({
      rfqId,
      quotationId,
      submittedBy: req.user.userId,
      approverId: approverId || null,
      remarks,
      status: "pending_approval",
      timeline: [
        {
          status: "pending_approval",
          updatedBy: req.user.userId,
          remarks: remarks || "Submitted for approval",
        },
      ],
    });

    await logActivity(
      req.user.userId,
      "SUBMIT_APPROVAL",
      "Approval",
      approval._id,
      `Submitted quotation from vendor for RFQ ${rfq.rfqNumber} for approval`
    );

    res.status(201).json({
      success: true,
      message: "Quotation submitted for approval successfully",
      approval,
    });
  } catch (error) {
    console.error("Submit For Approval Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get All Approvals
// ======================================
const getAllApprovals = async (req, res) => {
  try {
    const query = {};

    // Managers can only see approvals assigned to them
    if (req.user.role === "manager") {
      query.approverId = req.user.userId;
    }

    const approvals = await Approval.find(query)
      .populate("rfqId", "rfqNumber title deadline status")
      .populate("quotationId", "totalPrice deliveryTimeline status")
      .populate("submittedBy", "name email role")
      .populate("approverId", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: approvals.length,
      approvals,
    });
  } catch (error) {
    console.error("Get All Approvals Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get Approval By ID
// ======================================
const getApprovalById = async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate("rfqId", "rfqNumber title description deadline status items")
      .populate({
        path: "quotationId",
        populate: {
          path: "vendorId",
          select: "vendorName category email phone address gstNumber",
        },
      })
      .populate("submittedBy", "name email role")
      .populate("approverId", "name email role")
      .populate("timeline.updatedBy", "name role");

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Approval workflow not found",
      });
    }

    // Access control for managers
    if (req.user.role === "manager" && !approval.approverId?.equals(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You are not the assigned approver for this request",
      });
    }

    res.status(200).json({
      success: true,
      approval,
    });
  } catch (error) {
    console.error("Get Approval By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Process Approval (Approve / Reject)
// ======================================
const processApproval = async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: 'approve' or 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'approve' or 'reject'",
      });
    }

    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Approval workflow not found",
      });
    }

    // Verify manager assignment
    if (req.user.role === "manager" && approval.approverId && !approval.approverId.equals(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You are not authorized to approve/reject this request",
      });
    }

    if (approval.status !== "pending_approval") {
      return res.status(400).json({
        success: false,
        message: `This request has already been processed (Status: ${approval.status})`,
      });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update approval workflow status and timeline
    approval.status = newStatus;
    approval.timeline.push({
      status: newStatus,
      updatedBy: req.user.userId,
      remarks: remarks || `Request ${newStatus} by manager`,
    });

    await approval.save();

    // Update quotation status and RFQ status based on action
    if (action === "approve") {
      // Mark accepted quotation
      await Quotation.findByIdAndUpdate(approval.quotationId, {
        status: "accepted",
      });

      // Reject all other quotations for the same RFQ
      await Quotation.updateMany(
        { rfqId: approval.rfqId, _id: { $ne: approval.quotationId } },
        { status: "rejected" }
      );

      // Close the RFQ since a quotation was selected and approved
      await RFQ.findByIdAndUpdate(approval.rfqId, {
        status: "closed",
      });
    } else {
      // Mark rejected quotation
      await Quotation.findByIdAndUpdate(approval.quotationId, {
        status: "rejected",
      });
    }

    await logActivity(
      req.user.userId,
      action === "approve" ? "APPROVE_QUOTATION" : "REJECT_QUOTATION",
      "Approval",
      approval._id,
      `Quotation under RFQ ID: ${approval.rfqId} has been ${newStatus}. Remarks: ${remarks || "None"}`
    );

    res.status(200).json({
      success: true,
      message: `Quotation approval request has been successfully ${newStatus}`,
      approval,
    });
  } catch (error) {
    console.error("Process Approval Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  submitForApproval,
  getAllApprovals,
  getApprovalById,
  processApproval,
};
