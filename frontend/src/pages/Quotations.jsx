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
        setSuccessMsg("Proposal routed to designated manager for approval signature.");
        setSubmitApprovalModal(false);
        setApprovalRemarks("");
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
        setSuccessMsg(`Purchase Order ${res.po?.poNumber || ""} generated and committed to ledger.`);
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

      {/* Selector Card */}
      <div className="quotations-filter-card">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="fw-bold mb-0 text-dark">Supplier Quotation & Bidding Analysis</h5>
          <span className="text-mono-xs text-muted">PARITY PROTOCOL: L1 RATE // SLA TIME</span>
        </div>
        <div className="row align-items-center">
          <div className="col-md-8">
            <label className="form-label small">Select Tender RFQ to analyze commercial bids:</label>
            <select
              className="form-select font-mono-xs"
              value={selectedRfqId}
              onChange={(e) => setSelectedRfqId(e.target.value)}
            >
              <option value="">-- [OVERVIEW] Display All Historical Quotations --</option>
              {rfqs.map((rfq) => (
                <option key={rfq._id} value={rfq._id}>
                  {rfq.rfqNumber} // {rfq.title} [{rfq.status?.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compare Mode */}
      {selectedRfqId && comparison && (
        <div className="animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <i className="fa-solid fa-table-columns text-muted"></i>
              Bid Parity Matrix // RFQ: {comparison.rfq?.rfqNumber || selectedRfqId}
            </h6>
            <span className="text-mono-xs text-muted">TOTAL BIDS: {comparison.quotations?.length || 0}</span>
          </div>

          {comparison.quotations?.length > 0 ? (
            <div className="row g-3 mb-4">
              {comparison.quotations.map((q) => (
                <div key={q._id} className="col-lg-4 col-md-6">
                  <div
                    className={`compare-column-industrial h-100 ${
                      q.isLowestPrice ? "highlight-lowest" : q.isFastestDelivery ? "highlight-fastest" : ""
                    }`}
                  >
                    {/* Parity Badge */}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      {q.isLowestPrice ? (
                        <span className="compare-highlight-label bg-lowest">
                          <i className="fa-solid fa-arrow-down-short-wide me-1"></i> L1 Lowest Bid
                        </span>
                      ) : q.isFastestDelivery ? (
                        <span className="compare-highlight-label bg-fastest">
                          <i className="fa-solid fa-truck-fast me-1"></i> Fastest SLA
                        </span>
                      ) : (
                        <span className="badge-industrial badge-hold mb-2">
                          L2 Bidder
                        </span>
                      )}
                      <span className="text-mono-xs text-muted">
                        BID-{q._id.substring(18).toUpperCase()}
                      </span>
                    </div>

                    <h5 className="fw-bold text-dark mb-1">{q.vendor?.vendorName}</h5>
                    <span className="badge-industrial badge-hold mb-3">{q.vendor?.category}</span>

                    <div className="p-3 my-3 bg-light border rounded-1">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-mono-xs text-muted">GROSS BID VALUE:</span>
                        <span className="font-mono-numbers fw-bold text-dark fs-5">
                          ₹{q.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-mono-xs text-muted">LEAD TIME:</span>
                        <span className="font-mono text-dark fw-semibold small">{q.deliveryTimeline}</span>
                      </div>
                    </div>

                    <span className="text-mono-xs text-muted d-block mb-1">LINE ITEM BREAKDOWN</span>
                    <div className="mb-3">
                      {q.items?.map((item, idx) => (
                        <div key={idx} className="bid-item-row">
                          <span className="text-truncate" style={{ maxWidth: "160px" }}>{item.itemName}</span>
                          <span className="font-mono text-muted">
                            {item.quantity} x ₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {q.notes && (
                      <div className="p-2 mb-3 bg-white border rounded-1">
                        <span className="text-mono-xs text-muted d-block">SUPPLIER COMMERCIAL REMARKS:</span>
                        <span className="small text-secondary fst-italic">"{q.notes}"</span>
                      </div>
                    )}

                    {q.attachments?.length > 0 && (
                      <div className="mb-3">
                        <span className="text-mono-xs text-muted d-block mb-1">SUBMITTED CATALOG:</span>
                        {q.attachments.map((file, idx) => {
                          const filename = getFilename(file);
                          const fileUrl = file.replace(/.*Backend\/uploads\//, `${BASE_URL.replace("/api", "")}/uploads/`);
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="attachment-pill-industrial d-flex mb-1"
                            >
                              <i className="fa-solid fa-file-pdf text-danger"></i>
                              <span className="text-truncate">{filename}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {isProcurement && q.status === "submitted" && (
                      <button
                        onClick={() => handleOpenApprovalModal(q._id)}
                        className="btn-primary-industrial w-100 mt-2"
                      >
                        <i className="fa-solid fa-stamp me-1"></i>
                        Route to Manager for Approval
                      </button>
                    )}
                    {isProcurement && q.status === "accepted" && (
                      <button
                        onClick={() => handleGeneratePO(q._id)}
                        className="btn-primary-industrial w-100 mt-2"
                        style={{ backgroundColor: "var(--status-verified)", borderColor: "var(--status-verified)" }}
                      >
                        <i className="fa-solid fa-file-signature me-1"></i>
                        Commit & Generate PO
                      </button>
                    )}
                    {q.status !== "submitted" && q.status !== "accepted" && (
                      <div className="text-center py-2 border rounded-1 bg-light small fw-semibold text-muted">
                        WORKFLOW STATUS: {q.status?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center border rounded-1 bg-white text-muted">
              No quotation bids have been submitted by assigned vendors for this RFQ yet.
            </div>
          )}
        </div>
      )}

      {/* Directory List Mode (If no RFQ selected) */}
      {!selectedRfqId && (
        <div className="vendor-grid-wrapper">
          <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0 text-dark">Supplier Quotations Master Register</h6>
            <span className="text-mono-xs text-muted">ALL COMMERCIAL BIDS</span>
          </div>
          {quotations.length > 0 ? (
            <div className="table-responsive">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Quote Ref</th>
                    <th>RFQ Tender Subject</th>
                    <th>Supplier Entity</th>
                    <th>Quoted SLA</th>
                    <th>Total Price Bid</th>
                    <th className="text-end">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q._id}>
                      <td className="font-mono text-dark fw-bold">
                        QTE-{q._id.substring(18).toUpperCase()}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{q.rfqId?.title}</div>
                        <span className="text-mono-xs text-muted">{q.rfqId?.rfqNumber}</span>
                      </td>
                      <td className="fw-semibold text-dark">{q.vendorId?.vendorName}</td>
                      <td className="font-mono text-muted small">{q.deliveryTimeline}</td>
                      <td className="font-mono-numbers fw-bold text-dark">
                        ₹{q.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-end">
                        <span
                          className={`badge-industrial ${
                            q.status === "accepted"
                              ? "badge-verified"
                              : q.status === "rejected"
                              ? "badge-risk"
                              : "badge-pending"
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
              <i className="fa-solid fa-inbox fs-3 mb-2 d-block text-muted"></i>
              No quotation records found in active procurement database.
            </div>
          )}
        </div>
      )}

      {/* Modal for Routing to Manager Approval */}
      {submitApprovalModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15,23,42,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content industrial-card border">
              <div className="modal-header py-3 px-4 bg-light border-bottom">
                <div>
                  <span className="text-mono-xs text-muted d-block">PROPOSAL WORKFLOW</span>
                  <h6 className="modal-title fw-bold text-dark mb-0">Route Quotation for Manager Authorization</h6>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSubmitApprovalModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitApproval}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small">Designated Approver (Manager)</label>
                    <select
                      className="form-select form-select-sm font-mono-xs"
                      value={assignedApproverId}
                      onChange={(e) => setAssignedApproverId(e.target.value)}
                      required
                    >
                      {managers.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small">Procurement Justification & Remarks</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="3"
                      placeholder="Outline cost parity, vendor past performance, compliance checks..."
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer py-2 px-4 bg-light border-top d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmitApprovalModal(false)}
                    className="btn-secondary-industrial"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-industrial">
                    Authorize & Dispatch Routing
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
