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
          // Pre-populate quotation items with matching item names and default prices
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
        setSuccessMsg("Quotation bid submitted successfully!");
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
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && !rfq) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
        <Link to="/rfqs" className="btn btn-secondary-custom">
          Back to RFQs
        </Link>
      </div>
    );
  }

  const isVendor = user?.role === "vendor";
  const deadlinePassed = new Date(rfq?.deadline) < new Date();

  return (
    <div className="rfq-details-page">
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}

      <div className="mb-4">
        <Link to="/rfqs" className="btn btn-sm btn-link text-decoration-none p-0 mb-3 text-muted">
          <i className="fa-solid fa-arrow-left me-2"></i> Back to RFQ List
        </Link>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h4 className="fw-bold mb-1">
              Specs: {rfq.rfqNumber} — {rfq.title}
            </h4>
            <div className="detail-badge-group mt-2">
              <span className="badge bg-primary px-3 py-2">Status: {rfq.status.toUpperCase()}</span>
              <span className={`badge px-3 py-2 ${deadlinePassed ? "bg-danger" : "bg-warning text-dark"}`}>
                {deadlinePassed ? "Bidding Closed" : `Deadline: ${new Date(rfq.deadline).toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rfq-detail-container">
        {/* Main Details Panel */}
        <div className="d-flex flex-column gap-4">
          <div className="glass-panel p-4">
            <h5 className="fw-bold mb-3 text-primary">Requirement Description</h5>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {rfq.description || "No specific detailed descriptions provided."}
            </p>

            {rfq.attachments?.length > 0 && (
              <div className="mt-4">
                <h6 className="fw-bold mb-2">Attached Technical Specs:</h6>
                <div className="d-flex flex-wrap gap-2">
                  {rfq.attachments.map((file, idx) => {
                    const filename = getFilename(file);
                    // Replace backend relative path to match static download route
                    const fileUrl = file.replace(/.*Backend\/uploads\//, `${BASE_URL.replace("/api", "")}/uploads/`);
                    return (
                      <a
                        key={idx}
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="attachment-pill"
                        title="Open file"
                      >
                        <i className="fa-solid fa-paperclip me-2"></i>
                        {filename}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Requested Items Table */}
          <div className="glass-panel p-4">
            <h5 className="fw-bold mb-4 text-primary">Requested Items Specifications</h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr className="table-light">
                    <th>#</th>
                    <th>Item Name</th>
                    <th>Specifications</th>
                    <th className="text-end">Quantity Required</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.items?.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td>{idx + 1}</td>
                      <td className="fw-bold">{item.itemName}</td>
                      <td className="text-muted">{item.description || "N/A"}</td>
                      <td className="fw-semibold text-end">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Panel: Submission or Summary */}
        <div className="d-flex flex-column gap-4">
          {/* RFQ Meta Info */}
          <div className="glass-panel p-4">
            <h5 className="fw-bold mb-3">Workflow Summary</h5>
            <div className="mb-2">
              <span className="text-muted small d-block">Created By:</span>
              <strong className="small">{rfq.createdBy?.name} ({rfq.createdBy?.role})</strong>
            </div>
            <div className="mb-2">
              <span className="text-muted small d-block">Initiation Date:</span>
              <strong className="small">{new Date(rfq.createdAt).toLocaleDateString()}</strong>
            </div>
            <div className="mb-0">
              <span className="text-muted small d-block">Assigned Suppliers:</span>
              <ul className="list-unstyled mb-0 mt-1">
                {rfq.assignedVendors?.map((v) => (
                  <li key={v._id} className="small mb-1">
                    <i className="fa-solid fa-circle-check text-success me-2"></i>
                    {v.vendorName}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Vendor Submission Panel */}
          {isVendor && rfq.status === "active" && !deadlinePassed && (
            <div className="glass-panel p-4 bg-white border border-primary border-opacity-25 animate-fade-in">
              <h5 className="fw-bold mb-3 text-primary">Submit Bidding Quotation</h5>
              <form onSubmit={handleQuotationSubmit}>
                {quoteItems.map((item, idx) => (
                  <div key={idx} className="mb-3 p-2 bg-light rounded border-start border-primary border-3">
                    <label className="fw-bold small mb-1">{item.itemName}</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        className="form-control text-end"
                        placeholder="Unit Price"
                        min="0"
                        step="0.01"
                        onChange={(e) => handlePriceChange(idx, e.target.value)}
                        required
                      />
                      <span className="input-group-text">x {item.quantity}</span>
                    </div>
                    <span className="text-muted small d-block mt-1 text-end">
                      Subtotal: ₹{item.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}

                <div className="border-top pt-3 mb-3 d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-dark">Quotation Bid Total:</span>
                  <span className="fw-bold text-primary fs-5">₹{calculateGrandTotal().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="mb-3">
                  <label className="form-label small">Delivery Timeline / Lead Time</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. 5 business days"
                    value={deliveryTimeline}
                    onChange={(e) => setDeliveryTimeline(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small">Terms & Remarks</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    placeholder="Warranty, packing, shipment details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label className="form-label small">Bidding Catalog File</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    multiple
                    onChange={(e) => setQuoteAttachments(Array.from(e.target.files))}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary-custom btn-sm w-100"
                  disabled={submitLoading}
                >
                  {submitLoading ? "Submitting Bid..." : "Submit Quotation Bid"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RFQDetails;
