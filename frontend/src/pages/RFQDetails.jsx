import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { BASE_URL } from "../utils/api";
import "./RFQs.css";

const RFQDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Quotation Submission states
  const [deliveryTimeline, setDeliveryTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [quoteItems, setQuoteItems] = useState([]);
  const [quoteAttachments, setQuoteAttachments] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const fetchRFQDetails = async () => {
      try {
        const res = await api.get(`/rfqs/${id}`);
        if (res.success) {
          setRfq(res.rfq);
          if (res.rfq.items) {
            setQuoteItems(
              res.rfq.items.map((item) => ({
                itemName: item.itemName,
                quantity: item.quantity,
                price: 0,
                subtotal: 0,
              }))
            );
          }
        } else {
          setError("Failed to load RFQ specifications");
        }
      } catch (err) {
        setError(err.message || "Failed to load RFQ details");
      } finally {
        setLoading(false);
      }
    };

    fetchRFQDetails();
  }, [id]);

  const handlePriceChange = (index, value) => {
    const newItems = [...quoteItems];
    const price = parseFloat(value) || 0;
    newItems[index].price = price;
    newItems[index].subtotal = newItems[index].quantity * price;
    setQuoteItems(newItems);
  };

  const calculateGrandTotal = () => {
    return quoteItems.reduce((acc, item) => acc + item.subtotal, 0);
  };

  const handleQuotationSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append("rfqId", id);
      formData.append("deliveryTimeline", deliveryTimeline);
      formData.append("notes", notes);
      formData.append("items", JSON.stringify(quoteItems));

      for (let i = 0; i < quoteAttachments.length; i++) {
        formData.append("attachments", quoteAttachments[i]);
      }

      const res = await api.upload("/quotations", formData);

      if (res.success) {
        setSuccessMsg("Quotation bid submitted successfully and entered into evaluation queue.");
        setTimeout(() => {
          navigate("/quotations");
        }, 1500);
      } else {
        setError(res.message || "Failed to submit quotation");
      }
    } catch (err) {
      setError(err.message || "Quotation submission failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  const getFilename = (filepath) => {
    if (!filepath) return "attachment";
    return filepath.split("/").pop().split("\\").pop();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border spinner-border-sm text-secondary" role="status">
          <span className="visually-hidden">Loading specification dossier...</span>
        </div>
      </div>
    );
  }

  if (error && !rfq) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger py-2 small border-0">{error}</div>
        <Link to="/rfqs" className="btn-secondary-industrial">
          [←] Return to RFQ Master Index
        </Link>
      </div>
    );
  }

  const isVendor = user?.role === "vendor";
  const deadlinePassed = new Date(rfq?.deadline) < new Date();

  return (
    <div className="rfqs-container">
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

      {/* Header Bar */}
      <div className="mb-3">
        <Link to="/rfqs" className="btn btn-sm btn-link text-decoration-none p-0 mb-2 text-muted small">
          <i className="fa-solid fa-arrow-left me-1"></i> Back to RFQ Tender Registry
        </Link>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <span className="text-mono-xs text-muted d-block">PROCUREMENT SPEC SHEET // TENDER RECORD</span>
            <h4 className="fw-bold mb-1 text-dark">
              {rfq.rfqNumber}: {rfq.title}
            </h4>
            <div className="d-flex align-items-center gap-2 mt-2">
              <span className={`badge-industrial ${
                rfq.status === "active" ? "badge-accent" : rfq.status === "closed" ? "badge-verified" : "badge-hold"
              }`}>
                STATUS: {rfq.status.toUpperCase()}
              </span>
              <span className={`badge-industrial ${deadlinePassed ? "badge-risk" : "badge-pending"}`}>
                <i className={`fa-solid ${deadlinePassed ? "fa-clock" : "fa-hourglass-start"} me-1`}></i>
                {deadlinePassed ? "BIDDING CLOSED" : `DEADLINE: ${new Date(rfq.deadline).toLocaleDateString("en-IN")} ${new Date(rfq.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rfq-detail-container">
        {/* Main Details Sheet */}
        <div className="d-flex flex-column gap-3">
          {/* Scope and Description */}
          <div className="rfq-spec-sheet">
            <h6 className="text-mono-xs text-muted mb-2">TECHNICAL SCOPE OF WORK & PROCUREMENT REQUIREMENTS</h6>
            <p className="text-secondary mb-0" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
              {rfq.description || "Refer to accompanying technical specifications and CAD drawings below."}
            </p>

            {rfq.attachments?.length > 0 && (
              <div className="mt-4 pt-3 border-top">
                <span className="text-mono-xs text-muted d-block mb-2">AUDITED BLUEPRINTS & ATTACHMENTS</span>
                <div className="d-flex flex-wrap gap-2">
                  {rfq.attachments.map((file, idx) => {
                    const filename = getFilename(file);
                    const fileUrl = file.replace(/.*Backend\/uploads\//, `${BASE_URL.replace("/api", "")}/uploads/`);
                    return (
                      <a
                        key={idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="attachment-pill-industrial"
                        title="Download specification attachment"
                      >
                        <i className="fa-solid fa-file-lines text-muted"></i>
                        <span>{filename}</span>
                        <i className="fa-solid fa-arrow-down fs-xs text-muted ms-1"></i>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Requested Items BOQ Table */}
          <div className="rfq-spec-sheet p-0 overflow-hidden">
            <div className="p-3 bg-light border-bottom">
              <h6 className="text-mono-xs text-muted mb-0">BILL OF QUANTITIES (BOQ) // MANDATORY SPECIFICATIONS</h6>
            </div>
            <div className="table-responsive">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Item #</th>
                    <th>Nomenclature & Description</th>
                    <th>Engineering Specifications</th>
                    <th className="text-end">Required Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.items?.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td className="font-mono text-muted">#{idx + 1}</td>
                      <td className="fw-semibold text-dark">{item.itemName}</td>
                      <td className="text-muted small">{item.description || "As per standard commercial specs"}</td>
                      <td className="font-mono-numbers fw-bold text-dark text-end">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Summary & Bid Submission */}
        <div className="d-flex flex-column gap-3">
          {/* Metadata Card */}
          <div className="rfq-sidebar-card">
            <div>
              <span className="text-mono-xs text-muted d-block">PROCURING OFFICER</span>
              <span className="fw-semibold text-dark small">{rfq.createdBy?.name || "Procurement Officer"}</span>
              <span className="text-mono-xs text-muted d-block">ROLE: [{rfq.createdBy?.role?.toUpperCase() || "INTERNAL"}]</span>
            </div>

            <div className="pt-2 border-top">
              <span className="text-mono-xs text-muted d-block">TENDER DISPATCH DATE</span>
              <span className="font-mono text-dark small">
                {new Date(rfq.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="pt-2 border-top">
              <span className="text-mono-xs text-muted d-block mb-1">DESIGNATED BIDDING PARTNERS</span>
              <div className="d-flex flex-column gap-1">
                {rfq.assignedVendors?.map((v) => (
                  <div key={v._id} className="d-flex align-items-center gap-2 small">
                    <i className="fa-solid fa-circle-check text-success fs-xs"></i>
                    <span className="fw-semibold text-dark">{v.vendorName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vendor Bidding Panel */}
          {isVendor && rfq.status === "active" && !deadlinePassed && (
            <div className="rfq-sidebar-card border-primary">
              <div className="pb-2 border-bottom">
                <span className="text-mono-xs text-primary d-block">BIDDING WORKBENCH</span>
                <h6 className="fw-bold text-dark mb-0">Submit Supplier Quotation</h6>
              </div>
              <form onSubmit={handleQuotationSubmit}>
                <div className="d-flex flex-column gap-3">
                  {quoteItems.map((item, idx) => (
                    <div key={idx} className="p-2 border rounded-1 bg-light">
                      <span className="fw-semibold text-dark small d-block mb-1">{item.itemName}</span>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text font-mono bg-white">₹</span>
                        <input
                          type="number"
                          className="form-control form-control-sm font-mono text-end"
                          placeholder="Rate"
                          min="0"
                          step="0.01"
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          required
                        />
                        <span className="input-group-text font-mono-xs bg-white">x {item.quantity}</span>
                      </div>
                      <div className="text-end text-mono-xs text-muted mt-1">
                        Subtotal: ₹{item.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}

                  <div className="p-2 bg-white border rounded-1 d-flex justify-content-between align-items-center">
                    <span className="text-mono-xs text-muted">BID VALUE</span>
                    <span className="font-mono-numbers fw-bold text-dark fs-6">
                      ₹{calculateGrandTotal().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <label className="form-label small">Lead Time / Delivery Schedule</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. 10 Working Days (Ex-Works Pune)"
                      value={deliveryTimeline}
                      onChange={(e) => setDeliveryTimeline(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label small">Commercial Terms & Remarks</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="2"
                      placeholder="Warranty, standard packaging, GST HSN breakdown..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <div>
                    <label className="form-label small">Quotation Catalog / Technical Bid</label>
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      multiple
                      onChange={(e) => setQuoteAttachments(Array.from(e.target.files))}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary-industrial w-100"
                    disabled={submitLoading}
                  >
                    {submitLoading ? "Submitting Bid..." : "Execute Quotation Bid"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RFQDetails;
