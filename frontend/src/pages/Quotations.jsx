import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api, { BASE_URL } from "../utils/api";
import "./Quotations.css";

const Quotations = () => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState("");
  const [comparison, setComparison] = useState(null);
  const [managers, setManagers] = useState([]);

  // Modal and submission state
  const [submitApprovalModal, setSubmitApprovalModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [assignedApproverId, setAssignedApproverId] = useState("");
  const [approvalRemarks, setApprovalRemarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchRFQs = async () => {
    try {
      const res = await api.get("/rfqs");
      if (res.success) {
        setRfqs(res.rfqs);
      }
    } catch (err) {
      console.error("Failed to load RFQs list:", err);
    }
  };

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/quotations");
      if (res.success) {
        setQuotations(res.quotations);
      }
    } catch (err) {
      setError(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async (rfqId) => {
    if (!rfqId) {
      setComparison(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/quotations/rfq/${rfqId}`);
      if (res.success) {
        setComparison(res.comparison);
      }
    } catch (err) {
      setError(err.message || "Failed to compare quotations");
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get("/auth/managers");
      if (res.success && res.managers) {
        setManagers(res.managers);
      }
    } catch (err) {
      console.error("Failed to load managers:", err);
    }
  };

  useEffect(() => {
    fetchRFQs();
    fetchQuotations();
    fetchManagers();
  }, []);

  useEffect(() => {
    fetchComparison(selectedRfqId);
  }, [selectedRfqId]);

  const handleOpenApprovalModal = (quoteId) => {
    setSelectedQuoteId(quoteId);
    if (managers && managers.length > 0) {
      setAssignedApproverId(managers[0]._id);
    } else {
      setAssignedApproverId("");
    }
    setSubmitApprovalModal(true);
  };

  const handleSubmitApproval = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.post("/approvals", {
        rfqId: selectedRfqId,
        quotationId: selectedQuoteId,
        approverId: assignedApproverId,
        remarks: approvalRemarks,
      });

      if (res.success) {
        setSuccessMsg("Proposal routed to manager for approval successfully!");
        setSubmitApprovalModal(false);
        setApprovalRemarks("");
        // Reload comparison
        fetchComparison(selectedRfqId);
      }
    } catch (err) {
      setError(err.message || "Failed to submit approval request");
    }
  };

  const handleGeneratePO = async (quotationId) => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post("/purchase-orders", { quotationId });
      if (res.success) {
        setSuccessMsg(`Purchase Order ${res.po?.poNumber || ""} generated successfully!`);
        fetchComparison(selectedRfqId);
      }
    } catch (err) {
      setError(err.message || "Failed to generate Purchase Order");
    }
  };

  const getFilename = (filepath) => {
    if (!filepath) return "attachment";
    return filepath.split("/").pop().split("\\").pop();
  };

  const isProcurement = ["admin", "procurement"].includes(user?.role);

  return (
    <div className="quotations-page">
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}

      {/* Toggle View Mode */}
      <div className="glass-panel p-4 mb-4">
        <h5 className="fw-bold mb-3 text-primary">Bidding & Quotations Analysis</h5>
        <div className="row align-items-center">
          <div className="col-md-8">
            <label className="form-label small text-muted">Select RFQ to compare vendor quotations:</label>
            <select
              className="form-select"
              value={selectedRfqId}
              onChange={(e) => setSelectedRfqId(e.target.value)}
            >
              <option value="">-- View General Bids Directory --</option>
              {rfqs.map((rfq) => (
                <option key={rfq._id} value={rfq._id}>
                  {rfq.rfqNumber} — {rfq.title} ({rfq.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compare Mode */}
      {selectedRfqId && comparison && (
        <div className="animate-fade-in">
          <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
            <i className="fa-solid fa-code-compare text-primary"></i>
            Compare Matrix for RFQ
          </h5>

          {comparison.quotations?.length > 0 ? (
            <div className="row g-4 mb-5">
              {comparison.quotations.map((q) => (
                <div key={q._id} className="col-lg-4 col-md-6">
                  <div
                    className={`glass-panel compare-column h-100 ${
                      q.isLowestPrice ? "highlight-lowest" : q.isFastestDelivery ? "highlight-fastest" : ""
                    }`}
                  >
                    {/* Badge */}
                    {q.isLowestPrice && (
                      <span className="compare-highlight-label bg-lowest">
                        <i className="fa-solid fa-arrow-down me-1"></i> Lowest Price
                      </span>
                    )}
                    {q.isFastestDelivery && !q.isLowestPrice && (
                      <span className="compare-highlight-label bg-fastest">
                        <i className="fa-solid fa-bolt me-1"></i> Fastest Delivery
                      </span>
                    )}

                    <h5 className="fw-bold text-dark mb-1">{q.vendor?.vendorName}</h5>
                    <span className="badge bg-light text-dark border mb-3">{q.vendor?.category}</span>

                    <div className="border-top border-bottom py-3 my-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Total Bid:</span>
                        <strong className="text-primary fs-5">₹{q.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted small">Timeline:</span>
                        <strong className="small">{q.deliveryTimeline}</strong>
                      </div>
                    </div>

                    <h6 className="fw-bold text-dark mb-2">Quoted Items:</h6>
                    <ul className="list-unstyled mb-4">
                      {q.items?.map((item, idx) => (
                        <li key={idx} className="small mb-2 d-flex justify-content-between">
                          <span className="text-truncate" style={{ maxWidth: "160px" }}>{item.itemName}</span>
                          <span>
                            {item.quantity} x ₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {q.notes && (
                      <div className="mb-4">
                        <span className="text-muted small d-block">Supplier Terms:</span>
                        <p className="small mb-0 text-muted italic">"{q.notes}"</p>
                      </div>
                    )}

                    {q.attachments?.length > 0 && (
                      <div className="mb-4">
                        <span className="text-muted small d-block mb-1">Catalog Attachments:</span>
                        {q.attachments.map((file, idx) => {
                          const filename = getFilename(file);
                          const fileUrl = file.replace(/.*Backend\/uploads\//, `${BASE_URL.replace("/api", "")}/uploads/`);
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="d-block small text-truncate text-decoration-none text-primary mb-1"
                            >
                              <i className="fa-solid fa-paperclip me-1"></i> {filename}
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {isProcurement && q.status === "submitted" && (
                      <button
                        onClick={() => handleOpenApprovalModal(q._id)}
                        className="btn btn-primary-custom btn-sm w-100"
                      >
                        Submit to Manager for Approval
                      </button>
                    )}
                    {isProcurement && q.status === "accepted" && (
                      <button
                        onClick={() => handleGeneratePO(q._id)}
                        className="btn btn-success btn-sm w-100 mb-0 fw-bold"
                      >
                        <i className="fa-solid fa-file-invoice-dollar me-2"></i> Generate Purchase Order
                      </button>
                    )}
                    {q.status !== "submitted" && q.status !== "accepted" && (
                      <div className="alert alert-secondary text-center py-2 mb-0 small fw-bold">
                        Quotation Status: {q.status?.toUpperCase()}
                      </div>
                    )}
                    {!isProcurement && q.status === "accepted" && (
                      <div className="alert alert-success text-center py-2 mb-0 small fw-bold">
                        Quotation Status: {q.status?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info py-4 text-center">
              No quotations submitted yet for this RFQ. Assigned vendors will see this RFQ in their panels.
            </div>
          )}
        </div>
      )}

      {/* Directory List Mode (If no RFQ selected) */}
      {!selectedRfqId && (
        <div className="glass-panel p-4">
          <h5 className="fw-bold mb-4">General Bidding directory</h5>
          {quotations.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-premium align-middle">
                <thead>
                  <tr>
                    <th>Quotation ID</th>
                    <th>RFQ Reference</th>
                    <th>Supplier Name</th>
                    <th>Delivery Lead Time</th>
                    <th>Total Price Bid</th>
                    <th className="text-end">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q._id}>
                      <td className="py-3 small fw-bold">{q._id.substring(18).toUpperCase()}</td>
                      <td className="py-3">
                        <div className="fw-semibold">{q.rfqId?.title}</div>
                        <span className="text-muted small d-block">{q.rfqId?.rfqNumber}</span>
                      </td>
                      <td className="py-3 fw-bold">{q.vendorId?.vendorName}</td>
                      <td className="py-3 fw-semibold">{q.deliveryTimeline}</td>
                      <td className="py-3 text-primary fw-bold">₹{q.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-3 text-end">
                        <span
                          className={`badge py-2 px-3 ${
                            q.status === "accepted"
                              ? "bg-success-subtle text-success"
                              : q.status === "rejected"
                              ? "bg-danger-subtle text-danger"
                              : "bg-warning-subtle text-warning"
                          }`}
                        >
                          {q.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted py-5">
              <i className="fa-regular fa-folder-open fs-2 mb-3 d-block text-muted"></i>
              No quotations bids submitted in the system.
            </div>
          )}
        </div>
      )}

      {/* Modal for Routing to Manager Approval */}
      {submitApprovalModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border-0">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">Submit Proposal for Approval</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSubmitApprovalModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitApproval}>
                <div className="modal-body py-4">
                  <div className="mb-3">
                    <label className="form-label small">Select Designated Approver (Manager)</label>
                    <select
                      className="form-select"
                      value={assignedApproverId}
                      onChange={(e) => setAssignedApproverId(e.target.value)}
                      required
                    >
                      {managers.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small">Routing Remarks & Comments</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Why do you recommend this quotation? (Pricing, lead time, reliability...)"
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0 d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmitApprovalModal(false)}
                    className="btn btn-secondary-custom"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom">
                    Submit Proposal
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

export default Quotations;
