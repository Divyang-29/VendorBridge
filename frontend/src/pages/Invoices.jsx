import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "./Invoices.css";

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Email triggers state
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/invoices");
      if (res.success) {
        setInvoices(res.invoices);
      }
    } catch (err) {
      setError(err.message || "Failed to load Invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetails = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.success) {
        setSelectedInvoice(res.invoice);
        setCustomEmail(res.invoice.vendorId?.email || "");
      }
    } catch (err) {
      setError("Failed to fetch detailed billing specifications");
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPDF = async (id, invoiceNumber) => {
    setError("");
    setSuccessMsg("");
    try {
      const blob = await api.download(`/invoices/${id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSuccessMsg("Invoice PDF downloaded successfully!");
    } catch (err) {
      setError(err.message || "Failed to download PDF invoice");
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setEmailLoading(true);

    try {
      const res = await api.post(`/invoices/${selectedInvoice._id}/send-email`, {
        recipientEmail: customEmail,
      });

      if (res.success) {
        setSuccessMsg(`Invoice emailed successfully to ${customEmail}`);
        setShowEmailInput(false);
      }
    } catch (err) {
      setError(err.message || "Failed to dispatch invoice email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePaymentStatusChange = async (id, status) => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.patch(`/invoices/${id}/status`, { status });
      if (res.success) {
        setSuccessMsg(`Invoice payment status updated to: ${status.toUpperCase()}`);
        fetchInvoiceDetails(id);
        fetchInvoices();
      }
    } catch (err) {
      setError(err.message || "Failed to update payment status");
    }
  };

  const isProcurement = ["admin", "procurement", "manager"].includes(user?.role);

  return (
    <div className="invoices-page">
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}

      <div className="invoice-layout">
        {/* Left Side: Directory listings */}
        <div className="mb-4">
          <div className="glass-panel p-4">
            <h5 className="fw-bold mb-4">Invoice Ledger</h5>
            {loading && invoices.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : invoices.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-premium align-middle">
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Ref PO</th>
                      <th>Total Billing</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv._id}
                        onClick={() => fetchInvoiceDetails(inv._id)}
                        className={`cursor-pointer ${selectedInvoice?._id === inv._id ? "table-active" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="py-3 fw-bold text-primary">{inv.invoiceNumber}</td>
                        <td className="py-3 fw-semibold">{inv.poId?.poNumber}</td>
                        <td className="py-3 fw-bold text-success">₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3">
                          <span
                            className={`badge ${
                              inv.status === "paid"
                                ? "bg-success-subtle text-success"
                                : inv.status === "cancelled"
                                ? "bg-danger-subtle text-danger"
                                : "bg-warning-subtle text-warning"
                            }`}
                          >
                            {inv.status?.replace("_", " ")}
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
                No Invoices generated yet. Deliver POs to generate billing invoices.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Invoice Specs */}
        <div className="mb-4">
          {selectedInvoice ? (
            <div className="glass-panel invoice-preview-card animate-fade-in">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4">
                <div>
                  <span className="text-muted small">Invoice Reference:</span>
                  <h4 className="fw-bold text-dark mb-0">{selectedInvoice.invoiceNumber}</h4>
                </div>
                <span
                  className={`badge fs-6 py-2 px-3 ${
                    selectedInvoice.status === "paid"
                      ? "bg-success text-white"
                      : selectedInvoice.status === "cancelled"
                      ? "bg-danger text-white"
                      : "bg-warning text-dark"
                  }`}
                >
                  {selectedInvoice.status?.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* Billing Info */}
              <div className="invoice-billing-box">
                <div className="row small">
                  <div className="col-6 mb-2">
                    <span className="text-muted d-block small">Issuer / Supplier:</span>
                    <strong>{selectedInvoice.vendorId?.vendorName}</strong>
                    <div className="text-muted">{selectedInvoice.vendorId?.email}</div>
                    <div className="text-muted">GST: {selectedInvoice.vendorId?.gstNumber}</div>
                  </div>
                  <div className="col-6 mb-2 text-end">
                    <span className="text-muted d-block small">Billing Dates:</span>
                    <div>Issued: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</div>
                    <div>Ref PO: {selectedInvoice.poId?.poNumber}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <h6 className="fw-bold text-primary mb-3">Billing Invoice Items</h6>
              <div className="table-responsive mb-4">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="small">{item.itemName}</td>
                        <td className="small text-center">{item.quantity}</td>
                        <td className="small text-end">₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="small text-end fw-semibold">₹{item.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="d-flex flex-column align-items-end mb-4 border-bottom pb-3">
                <div className="d-flex justify-content-between w-50 mb-1">
                  <span className="text-muted small">Subtotal:</span>
                  <span className="fw-semibold small">₹{(selectedInvoice.totalAmount - selectedInvoice.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="d-flex justify-content-between w-50 mb-2">
                  <span className="text-muted small">GST Tax (18%):</span>
                  <span className="fw-semibold small">₹{selectedInvoice.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="d-flex justify-content-between w-50 pt-2 border-top">
                  <strong className="text-dark">Grand Total:</strong>
                  <strong className="text-success fs-5">₹{selectedInvoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Action buttons */}
              <div className="d-flex justify-content-end gap-2 flex-wrap mb-3">
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice._id, selectedInvoice.invoiceNumber)}
                  className="btn btn-primary-custom"
                >
                  <i className="fa-solid fa-file-pdf me-2"></i> Download Invoice PDF
                </button>
                {isProcurement && (
                  <button
                    onClick={() => setShowEmailInput(!showEmailInput)}
                    className="btn btn-secondary-custom"
                  >
                    <i className="fa-solid fa-envelope me-2"></i> Email Invoice
                  </button>
                )}
              </div>

              {/* Email dispatch panel */}
              {showEmailInput && (
                <div className="card p-3 border-0 bg-light rounded-4 mb-4 animate-fade-in">
                  <form onSubmit={handleSendEmail} className="d-flex gap-2">
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      placeholder="recipient@supplier.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary-custom flex-shrink-0"
                      disabled={emailLoading}
                    >
                      {emailLoading ? "Dispatching..." : "Send"}
                    </button>
                  </form>
                </div>
              )}

              {/* Payment updates */}
              {isProcurement && selectedInvoice.status === "pending_payment" && (
                <div className="border-top pt-4">
                  <h6 className="fw-bold mb-3">Account Reconciliation Actions</h6>
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => handlePaymentStatusChange(selectedInvoice._id, "paid")}
                      className="btn btn-sm btn-success rounded-pill px-4"
                    >
                      <i className="fa-solid fa-check me-2"></i> Reconcile / Mark as Paid
                    </button>
                    <button
                      onClick={() => handlePaymentStatusChange(selectedInvoice._id, "cancelled")}
                      className="btn btn-sm btn-outline-danger rounded-pill px-4"
                    >
                      <i className="fa-solid fa-xmark me-2"></i> Void / Cancel Invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-5 text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center">
              <i className="fa-solid fa-file-invoice-dollar fs-3 text-purple mb-3"></i>
              <h5>Select an Invoice from the directory list to review specs, download PDF, or dispatch emails.</h5>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
