import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api, { BASE_URL } from "../utils/api";
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
      setError("Failed to fetch invoice details");
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPDF = async (id, invoiceNumber) => {
    try {
      setError("");
      setSuccessMsg("Generating audited PDF invoice...");
      const token = localStorage.getItem("vendorbridge_token");
      const res = await fetch(`${BASE_URL}/invoices/${id}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("PDF download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `TAX_INVOICE_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSuccessMsg("Audited Tax Invoice PDF downloaded successfully!");
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
        setSuccessMsg(`Tax invoice dispatched to ${customEmail} with official PDF attachment.`);
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
        setSuccessMsg(`Invoice payment status reconciled to: [${status.toUpperCase()}]`);
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
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <h4 className="fw-bold mb-0 text-dark">Invoicing & Settlement Center</h4>
          <span className="text-mono-xs text-muted">
            AUDITED TAX INVOICES // GST RECONCILIATION & E-WAY BILL MATCHING
          </span>
        </div>
        <span className="badge-industrial badge-hold">
          {invoices.length} TAX INVOICES RECORDED
        </span>
      </div>

      <div className="invoice-layout">
        {/* Left Side: Directory listings */}
        <div className="vendor-grid-wrapper">
          <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0 text-dark">Invoice Ledger Directory</h6>
            <span className="text-mono-xs text-muted">SELECT TO RECONCILE</span>
          </div>
          {loading && invoices.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm text-secondary" role="status">
                <span className="visually-hidden">Loading ledger...</span>
              </div>
            </div>
          ) : invoices.length > 0 ? (
            <div className="table-responsive">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Invoice Code</th>
                    <th>Reference PO</th>
                    <th>Gross Billing</th>
                    <th className="text-end">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv._id}
                      onClick={() => fetchInvoiceDetails(inv._id)}
                      className={`cursor-pointer ${selectedInvoice?._id === inv._id ? "bg-light" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="font-mono text-dark fw-bold">{inv.invoiceNumber}</td>
                      <td>
                        <span className="font-mono text-muted small">{inv.poId?.poNumber || "PO-N/A"}</span>
                      </td>
                      <td className="font-mono-numbers fw-bold text-dark">
                        ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-end">
                        <span
                          className={`badge-industrial ${
                            inv.status === "paid"
                              ? "badge-verified"
                              : inv.status === "cancelled"
                              ? "badge-risk"
                              : "badge-pending"
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
              <i className="fa-solid fa-file-invoice fs-3 mb-2 d-block text-muted"></i>
              No Tax Invoices generated in current cycle.
            </div>
          )}
        </div>

        {/* Right Side: Detailed Invoice Specs */}
        <div>
          {selectedInvoice ? (
            <div className="invoice-preview-card animate-fade-in">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <span className="text-mono-xs text-muted d-block">TAX INVOICE RECORD</span>
                  <h5 className="fw-bold text-dark font-mono mb-0">{selectedInvoice.invoiceNumber}</h5>
                </div>
                <span
                  className={`badge-industrial ${
                    selectedInvoice.status === "paid"
                      ? "badge-verified"
                      : selectedInvoice.status === "cancelled"
                      ? "badge-risk"
                      : "badge-pending"
                  }`}
                >
                  {selectedInvoice.status?.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* Billing Meta */}
              <div className="invoice-billing-box">
                <div className="row g-2 small">
                  <div className="col-md-6">
                    <span className="text-mono-xs text-muted d-block">ISSUING SUPPLIER ENTITY</span>
                    <strong className="text-dark small d-block">{selectedInvoice.vendorId?.vendorName}</strong>
                    <span className="text-mono-xs text-muted d-block">{selectedInvoice.vendorId?.email}</span>
                    <span className="text-mono-xs text-dark font-mono">GSTIN: {selectedInvoice.vendorId?.gstNumber}</span>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <span className="text-mono-xs text-muted d-block">BILLING REFERENCES</span>
                    <div className="text-mono-xs text-dark font-mono">
                      ISSUED: {new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-mono-xs text-muted font-mono">CONTRACT: {selectedInvoice.poId?.poNumber}</div>
                    <div className="text-mono-xs text-dark font-mono">TERMS: NET 30 DAYS</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <span className="text-mono-xs text-muted d-block mb-1">INVOICED LINE ITEMS</span>
              <div className="table-responsive mb-3 border rounded-1 bg-white">
                <table className="table table-sm align-middle mb-0">
                  <thead className="bg-light">
                    <tr className="text-mono-xs text-muted">
                      <th>Description</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Rate</th>
                      <th className="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx} className="small">
                        <td className="text-dark fw-semibold">{item.itemName}</td>
                        <td className="font-mono text-center">{item.quantity}</td>
                        <td className="font-mono-numbers text-end">₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="font-mono-numbers text-end fw-bold">₹{item.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Summary */}
              <div className="d-flex flex-column align-items-end mb-4 border-bottom pb-3">
                <div className="d-flex justify-content-between w-75 mb-1 small">
                  <span className="text-muted">Taxable Base Amount:</span>
                  <span className="font-mono-numbers text-dark">
                    ₹{(selectedInvoice.totalAmount - selectedInvoice.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between w-75 mb-2 small">
                  <span className="text-muted">GST Tax (18% Statutory Levy):</span>
                  <span className="font-mono-numbers text-dark">
                    ₹{selectedInvoice.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between w-75 pt-2 border-top">
                  <strong className="text-dark">Gross Payable Invoice:</strong>
                  <strong className="font-mono-numbers text-dark fs-5">
                    ₹{selectedInvoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Actions & Dispatch */}
              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => handleDownloadPDF(selectedInvoice._id, selectedInvoice.invoiceNumber)}
                      className="btn-secondary-industrial"
                    >
                      <i className="fa-solid fa-file-pdf text-danger me-1"></i>
                      Download Tax PDF
                    </button>
                    <button
                      onClick={() => setShowEmailInput(!showEmailInput)}
                      className="btn-secondary-industrial"
                    >
                      <i className="fa-solid fa-envelope me-1"></i>
                      Dispatch via SMTP
                    </button>
                  </div>

                  {/* Payment Reconciliation for Procurement/Manager */}
                  {isProcurement && selectedInvoice.status === "unpaid" && (
                    <button
                      onClick={() => handlePaymentStatusChange(selectedInvoice._id, "paid")}
                      className="btn-primary-industrial"
                      style={{ backgroundColor: "var(--status-verified)", borderColor: "var(--status-verified)" }}
                    >
                      <i className="fa-solid fa-check-double me-1"></i>
                      Reconcile & Mark Paid
                    </button>
                  )}
                </div>

                {/* Email dispatch drawer */}
                {showEmailInput && (
                  <form onSubmit={handleSendEmail} className="p-3 bg-light border rounded-1 animate-fade-in">
                    <span className="text-mono-xs text-muted d-block mb-1">DISPATCH TAX INVOICE VIA NODEMAILER</span>
                    <div className="input-group input-group-sm mb-2">
                      <span className="input-group-text bg-white text-muted">@</span>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="finance@supplier.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        className="btn-primary-industrial"
                        disabled={emailLoading}
                      >
                        {emailLoading ? "Dispatching..." : "Send Attachment"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="industrial-card p-5 text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center">
              <i className="fa-solid fa-file-invoice-dollar fs-3 text-muted mb-2"></i>
              <h6 className="fw-semibold text-dark">Select a Tax Invoice</h6>
              <span className="text-mono-xs text-muted">AUDIT BILLABLE LINE ITEMS, GENERATE OFFICIAL PDF, OR RECONCILE PAYMENT</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoices;
