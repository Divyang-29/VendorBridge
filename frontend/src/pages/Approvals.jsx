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
        setSuccessMsg(`Proposal successfully ${modalAction === "approve" ? "approved" : "rejected"}`);
        setShowActionModal(false);
        setRemarks("");
        // Reload details and list
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
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}

      <div className="row">
        {/* Left Side: Approvals List */}
        <div className="col-lg-5 mb-4">
          <div className="glass-panel p-4 h-100">
            <h5 className="fw-bold mb-4">Pending Approvals Directory</h5>
            {loading && approvals.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : approvals.length > 0 ? (
              <div className="list-group">
                {approvals.map((app) => (
                  <button
                    key={app._id}
                    onClick={() => fetchApprovalDetails(app._id)}
                    className={`list-group-item list-group-item-action border-0 p-3 mb-2 rounded glass-panel text-start ${
                      selectedApproval?._id === app._id ? "border-start border-primary border-3 bg-white" : "bg-light"
                    }`}
                  >
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold text-primary small">{app.rfqId?.rfqNumber}</span>
                      <span
                        className={`badge ${
                          app.status === "approved"
                            ? "bg-success-subtle text-success"
                            : app.status === "rejected"
                            ? "bg-danger-subtle text-danger"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {app.status?.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <h6 className="fw-semibold text-dark text-truncate mb-1">{app.rfqId?.title}</h6>
                    <div className="d-flex justify-content-between text-muted small mt-2">
                      <span>Bid: ₹{app.quotationId?.totalPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span>By: {app.submittedBy?.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                <i className="fa-solid fa-circle-check fs-2 text-success mb-3 d-block"></i>
                All clear! No approval requests waiting review.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Approval Details & Actions */}
        <div className="col-lg-7 mb-4">
          {selectedApproval ? (
            <div className="glass-panel p-4 animate-fade-in">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4">
                <div>
                  <span className="text-muted small">RFQ Reference: {selectedApproval.rfqId?.rfqNumber}</span>
                  <h5 className="fw-bold text-dark mb-0">{selectedApproval.rfqId?.title}</h5>
                </div>
                <span
                  className={`badge fs-6 py-2 px-3 ${
                    selectedApproval.status === "approved"
                      ? "bg-success text-white"
                      : selectedApproval.status === "rejected"
                      ? "bg-danger text-white"
                      : "bg-warning text-dark"
                  }`}
                >
                  {selectedApproval.status?.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* Quotation Bid summary */}
              <div className="card p-3 border-0 bg-light rounded-4 mb-4">
                <h6 className="fw-bold text-primary mb-3">Recommended Quotation Bidding</h6>
                <div className="row mb-2">
                  <div className="col-6">
                    <span className="text-muted small">Supplier:</span>
                    <strong className="d-block text-dark">{selectedApproval.quotationId?.vendorId?.vendorName}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted small">Estimated Delivery:</span>
                    <strong className="d-block text-dark">{selectedApproval.quotationId?.deliveryTimeline}</strong>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <span className="text-muted small">Total Price Bid:</span>
                    <strong className="d-block text-success fs-5">₹{selectedApproval.quotationId?.totalPrice?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted small">Supplier Category:</span>
                    <strong className="d-block text-dark">{selectedApproval.quotationId?.vendorId?.category}</strong>
                  </div>
                </div>

                <h7 className="fw-semibold text-dark mb-2">Items Specifications Detail:</h7>
                <ul className="list-unstyled mb-0">
                  {selectedApproval.quotationId?.items?.map((item, idx) => (
                    <li key={idx} className="small mb-1 d-flex justify-content-between border-bottom pb-1">
                      <span>{item.itemName}</span>
                      <span className="fw-semibold">
                        {item.quantity} x ₹{item.price?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ₹{item.subtotal?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Workflow timeline */}
              <h6 className="fw-bold mb-3 text-primary">Workflow History Timeline</h6>
              <ul className="approval-timeline mb-4">
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
                        By: {evt.updatedBy?.name} ({evt.updatedBy?.role})
                      </span>
                      {evt.remarks && <p className="small text-muted mb-0 italic mt-1">"{evt.remarks}"</p>}
                      <span className="timeline-time">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Actions Box */}
              {isManager && selectedApproval.status === "pending_approval" && (
                <div className="border-top pt-4 d-flex justify-content-end gap-2">
                  <button
                    onClick={() => handleOpenActionModal("reject")}
                    className="btn btn-danger-custom btn-secondary-custom text-danger border-danger border-opacity-25"
                  >
                    <i className="fa-solid fa-xmark me-2"></i> Reject Proposal
                  </button>
                  <button
                    onClick={() => handleOpenActionModal("approve")}
                    className="btn btn-primary-custom"
                  >
                    <i className="fa-solid fa-check me-2"></i> Approve Proposal & Close RFQ
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-5 text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center">
              <i className="fa-solid fa-arrow-left fs-3 text-primary mb-3"></i>
              <h5>Select an approval request to view workflow specs and submit decisions.</h5>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Remarks and Review Submission */}
      {showActionModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border-0">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark text-capitalize">{modalAction} Proposal</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowActionModal(false)}
                ></button>
              </div>
              <form onSubmit={handleProcessApproval}>
                <div className="modal-body py-4">
                  <div className="mb-3">
                    <label className="form-label small">Review Comments / Remarks</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder={`Provide remarks for this ${modalAction} decision...`}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0 d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowActionModal(false)}
                    className="btn btn-secondary-custom"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn ${modalAction === "approve" ? "btn-success" : "btn-danger"} rounded-pill px-4`}
                  >
                    Confirm {modalAction === "approve" ? "Approval" : "Rejection"}
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
