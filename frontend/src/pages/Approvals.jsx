import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "./Approvals.css";

const Approvals = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Action states
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalAction, setModalAction] = useState(""); // "approve" or "reject"
  const [remarks, setRemarks] = useState("");

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.get("/approvals");
      if (res.success) {
        setApprovals(res.approvals);
      }
    } catch (err) {
      setError(err.message || "Failed to load approval workflows");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalDetails = async (id) => {
    try {
      const res = await api.get(`/approvals/${id}`);
      if (res.success) {
        setSelectedApproval(res.approval);
      }
    } catch (err) {
      setError("Failed to fetch detailed workflow specs");
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleOpenActionModal = (action) => {
    setModalAction(action);
    setShowActionModal(true);
  };

  const handleProcessApproval = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.post(`/approvals/${selectedApproval._id}/action`, {
        action: modalAction,
        remarks,
      });

      if (res.success) {
        setSuccessMsg(`Proposal decision recorded: [${modalAction.toUpperCase()}]. Workflow closed.`);
        setShowActionModal(false);
        setRemarks("");
        fetchApprovalDetails(selectedApproval._id);
        fetchApprovals();
      }
    } catch (err) {
      setError(err.message || "Approval action failed");
    }
  };

  const isManager = user?.role === "manager" || user?.role === "admin";

  return (
    <div className="approvals-page">
      {/* Alerts */}
      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center">
          <span><i className="fa-solid fa-circle-exclamation me-2"></i>{error}</span>
          <button onClick={() => setError("")} className="btn-close btn-close-white" style={{ fontSize: "0.65rem" }}></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center">
          <span><i className="fa-solid fa-circle-check me-2"></i>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="btn-close" style={{ fontSize: "0.65rem" }}></button>
        </div>
      )}

      <div className="row g-3">
        {/* Left Side: Approvals Queue */}
        <div className="col-lg-5">
          <div className="approval-list-card">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <span className="text-mono-xs text-muted d-block">MANAGERIAL QUEUE</span>
                <h6 className="fw-bold mb-0 text-dark">Procurement Approvals & Authorizations</h6>
              </div>
              <span className="text-mono-xs text-muted">{approvals.length} CASES</span>
            </div>

            {loading && approvals.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-secondary" role="status">
                  <span className="visually-hidden">Loading queue...</span>
                </div>
              </div>
            ) : approvals.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {approvals.map((app) => (
                  <button
                    key={app._id}
                    onClick={() => fetchApprovalDetails(app._id)}
                    className={`approval-item-btn ${selectedApproval?._id === app._id ? "selected" : ""}`}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="font-mono text-dark fw-bold small">{app.rfqId?.rfqNumber}</span>
                      <span
                        className={`badge-industrial ${
                          app.status === "approved"
                            ? "badge-verified"
                            : app.status === "rejected"
                            ? "badge-risk"
                            : "badge-pending"
                        }`}
                      >
                        {app.status?.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="fw-semibold text-dark text-truncate small mb-1">{app.rfqId?.title}</div>
                    <div className="d-flex justify-content-between align-items-center text-muted small mt-2 pt-1 border-top">
                      <span className="font-mono-numbers fw-semibold text-dark">
                        ₹{app.quotationId?.totalPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-mono-xs">By: {app.submittedBy?.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                <i className="fa-solid fa-circle-check fs-3 text-muted mb-2 d-block"></i>
                <p className="mb-0 fw-semibold text-dark small">All approval queues cleared.</p>
                <span className="text-mono-xs text-muted">NO PENDING DECISION CASES</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Approval Details & Actions */}
        <div className="col-lg-7">
          {selectedApproval ? (
            <div className="industrial-card p-4 animate-fade-in">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <span className="text-mono-xs text-muted d-block">CASE: {selectedApproval._id.substring(18).toUpperCase()}</span>
                  <h5 className="fw-bold text-dark mb-0">{selectedApproval.rfqId?.title}</h5>
                  <span className="text-mono-xs text-muted">RFQ REF: {selectedApproval.rfqId?.rfqNumber}</span>
                </div>
                <span
                  className={`badge-industrial ${
                    selectedApproval.status === "approved"
                      ? "badge-verified"
                      : selectedApproval.status === "rejected"
                      ? "badge-risk"
                      : "badge-pending"
                  }`}
                >
                  {selectedApproval.status?.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* Quotation Bid summary */}
              <div className="p-3 bg-light border rounded-1 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                  <span className="text-mono-xs text-muted">RECOMMENDED SUPPLIER PROPOSAL</span>
                  <span className="badge-industrial badge-accent">
                    {selectedApproval.quotationId?.vendorId?.category || "Industrial"}
                  </span>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <span className="text-mono-xs text-muted d-block">SUPPLIER ENTITY</span>
                    <strong className="text-dark small">{selectedApproval.quotationId?.vendorId?.vendorName}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-mono-xs text-muted d-block">DELIVERY TIMELINE</span>
                    <strong className="text-dark font-mono small">{selectedApproval.quotationId?.deliveryTimeline}</strong>
                  </div>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <span className="text-mono-xs text-muted d-block">GROSS COMMERCIAL BID</span>
                    <strong className="text-dark font-mono-numbers fs-6">
                      ₹{selectedApproval.quotationId?.totalPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="col-6">
                    <span className="text-mono-xs text-muted d-block">SUBMITTED BY</span>
                    <span className="text-dark small">{selectedApproval.submittedBy?.name} ({selectedApproval.submittedBy?.email})</span>
                  </div>
                </div>

                <span className="text-mono-xs text-muted d-block mb-1">LINE ITEM AUDIT SPECIFICATIONS</span>
                <div className="bg-white border rounded-1 p-2">
                  {selectedApproval.quotationId?.items?.map((item, idx) => (
                    <div key={idx} className="bid-item-row small">
                      <span className="text-dark fw-semibold">{item.itemName}</span>
                      <span className="font-mono text-muted">
                        {item.quantity} x ₹{item.price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })} = ₹{item.subtotal?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow history timeline */}
              <div className="mb-4">
                <span className="text-mono-xs text-muted d-block mb-1">AUDITABLE WORKFLOW TRAIL</span>
                <ul className="approval-timeline">
                  {selectedApproval.timeline?.map((evt, idx) => (
                    <li
                      key={idx}
                      className={`timeline-event ${
                        evt.status === "approved"
                          ? "event-approved"
                          : evt.status === "rejected"
                          ? "event-rejected"
                          : ""
                      }`}
                    >
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <strong className="small text-dark text-capitalize">
                          {evt.status?.replace("_", " ")}
                        </strong>
                        <span className="text-muted small d-block">
                          By: {evt.updatedBy?.name} [{evt.updatedBy?.role?.toUpperCase()}]
                        </span>
                        {evt.remarks && (
                          <div className="p-2 my-1 bg-light border rounded-1 small text-secondary">
                            "{evt.remarks}"
                          </div>
                        )}
                        <span className="timeline-time">
                          {new Date(evt.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decision Action Buttons */}
              {isManager && selectedApproval.status === "pending_approval" && (
                <div className="border-top pt-3 d-flex justify-content-end gap-2">
                  <button
                    onClick={() => handleOpenActionModal("reject")}
                    className="btn-secondary-industrial text-danger"
                  >
                    <i className="fa-solid fa-xmark me-1"></i> Reject Proposal
                  </button>
                  <button
                    onClick={() => handleOpenActionModal("approve")}
                    className="btn-primary-industrial"
                    style={{ backgroundColor: "var(--status-verified)", borderColor: "var(--status-verified)" }}
                  >
                    <i className="fa-solid fa-check me-1"></i> Authorize & Approve Purchase
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="industrial-card p-5 text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center">
              <i className="fa-solid fa-arrow-left fs-3 text-muted mb-2"></i>
              <h6 className="fw-semibold text-dark">Select a procurement approval case</h6>
              <span className="text-mono-xs text-muted">INSPECT COMMERCIAL TERMS, BOQ SPECS, AND DECISION AUDIT</span>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {showActionModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15,23,42,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content industrial-card border">
              <div className="modal-header py-3 px-4 bg-light border-bottom">
                <div>
                  <span className="text-mono-xs text-muted d-block">MANAGERIAL DECISION</span>
                  <h6 className="modal-title fw-bold text-dark text-capitalize mb-0">
                    {modalAction} Procurement Proposal
                  </h6>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowActionModal(false)}
                ></button>
              </div>
              <form onSubmit={handleProcessApproval}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small">Official Audit Comments & Justification</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="4"
                      placeholder={`Document the operational justification for this ${modalAction} authorization...`}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer py-2 px-4 bg-light border-top d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowActionModal(false)}
                    className="btn-secondary-industrial"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-industrial"
                    style={{
                      backgroundColor: modalAction === "approve" ? "var(--status-verified)" : "var(--status-risk)",
                      borderColor: modalAction === "approve" ? "var(--status-verified)" : "var(--status-risk)",
                    }}
                  >
                    Confirm {modalAction === "approve" ? "Authorization" : "Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
