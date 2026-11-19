import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "./PurchaseOrders.css";

const PurchaseOrders = () => {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/purchase-orders");
      if (res.success) {
        setPurchaseOrders(res.purchaseOrders);
      }
    } catch (err) {
      setError(err.message || "Failed to load Purchase Orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchPODetails = async (id) => {
    try {
      const res = await api.get(`/purchase-orders/${id}`);
      if (res.success) {
        setSelectedPO(res.po);
      }
    } catch (err) {
      setError("Failed to load Purchase Order specifications");
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.patch(`/purchase-orders/${id}/status`, { status });
      if (res.success) {
        setSuccessMsg(`Purchase Order ${status === "acknowledged" ? "acknowledged" : "updated to [" + status.toUpperCase() + "]"}`);
        fetchPODetails(id);
        fetchPOs();
      }
    } catch (err) {
      setError(err.message || "Failed to update PO status");
    }
  };

  const handleGenerateInvoice = async (id) => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post("/invoices", { poId: id });
      if (res.success) {
        setSuccessMsg(`Invoice ${res.invoice.invoiceNumber} generated successfully and logged in billing center!`);
        fetchPODetails(id);
      }
    } catch (err) {
      setError(err.message || "Failed to generate invoice");
    }
  };

  const isVendor = user?.role === "vendor";
  const isProcurement = ["admin", "procurement"].includes(user?.role);

  return (
    <div className="purchase-orders-page">
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
          <h4 className="fw-bold mb-0 text-dark">Purchase Orders (PO) Contract Hub</h4>
          <span className="text-mono-xs text-muted">
            LEGALLY BINDING PROCUREMENT CONTRACTS // GST TAX-COMPLIANT
          </span>
        </div>
        <span className="badge-industrial badge-hold">
          {purchaseOrders.length} PURCHASE CONTRACTS
        </span>
      </div>

      <div className="po-layout">
        {/* Left Side: POs Directory */}
        <div className="vendor-grid-wrapper">
          <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0 text-dark">Contracts Master Register</h6>
            <span className="text-mono-xs text-muted">SELECT TO AUDIT</span>
          </div>
          {loading && purchaseOrders.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm text-secondary" role="status">
                <span className="visually-hidden">Loading contracts...</span>
              </div>
            </div>
          ) : purchaseOrders.length > 0 ? (
            <div className="table-responsive">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>PO Identifier</th>
                    <th>{!isVendor ? "Supplier Name" : "RFQ Scope"}</th>
                    <th>Total Value</th>
                    <th className="text-end">Lifecycle</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr
                      key={po._id}
                      onClick={() => fetchPODetails(po._id)}
                      className={`cursor-pointer ${selectedPO?._id === po._id ? "bg-light" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="font-mono text-dark fw-bold">{po.poNumber}</td>
                      <td>
                        <div className="fw-semibold text-dark small text-truncate" style={{ maxWidth: "150px" }}>
                          {isVendor ? po.rfqId?.title : po.vendorId?.vendorName}
                        </div>
                        <span className="text-mono-xs text-muted d-block text-truncate" style={{ maxWidth: "150px" }}>
                          {po.rfqId?.rfqNumber || "RFQ-CONTRACT"}
                        </span>
                      </td>
                      <td className="font-mono-numbers fw-semibold text-dark">
                        ₹{po.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-end">
                        <span
                          className={`badge-industrial ${
                            po.status === "delivered"
                              ? "badge-verified"
                              : po.status === "cancelled"
                              ? "badge-risk"
                              : "badge-pending"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted py-5">
              <i className="fa-solid fa-cart-shopping fs-3 mb-2 d-block text-muted"></i>
              No Purchase Orders recorded in current ledger.
            </div>
          )}
        </div>

        {/* Right Side: PO details */}
        <div>
          {selectedPO ? (
            <div className="po-details-card animate-fade-in">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <span className="text-mono-xs text-muted d-block">PURCHASE ORDER SPEC SHEET</span>
                  <h5 className="fw-bold text-dark font-mono mb-0">{selectedPO.poNumber}</h5>
                </div>
                <span
                  className={`badge-industrial ${
                    selectedPO.status === "delivered"
                      ? "badge-verified"
                      : selectedPO.status === "cancelled"
                      ? "badge-risk"
                      : "badge-pending"
                  }`}
                >
                  {selectedPO.status.toUpperCase()}
                </span>
              </div>

              {/* Vendor & Issuer Meta */}
              <div className="row g-2 mb-3 p-3 bg-light border rounded-1">
                <div className="col-md-6">
                  <span className="text-mono-xs text-muted d-block">COMMISSIONED SUPPLIER</span>
                  <strong className="text-dark small d-block">{selectedPO.vendorId?.vendorName}</strong>
                  <span className="text-mono-xs text-muted d-block">{selectedPO.vendorId?.email}</span>
                  <span className="text-mono-xs text-dark font-mono">GSTIN: {selectedPO.vendorId?.gstNumber}</span>
                </div>
                <div className="col-md-6 text-md-end">
                  <span className="text-mono-xs text-muted d-block">ISSUING AUTHORITY</span>
                  <strong className="text-dark small d-block">{selectedPO.createdBy?.name || "Procurement Officer"}</strong>
                  <span className="text-mono-xs text-muted d-block">
                    DATE: {new Date(selectedPO.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-mono-xs text-dark font-mono">TERMS: NET 30 DAYS</span>
                </div>
              </div>

              {/* Items Summary BOQ */}
              <div className="po-item-summary">
                <span className="text-mono-xs text-muted d-block mb-2">COMMERCIAL LINE SPECIFICATIONS</span>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr className="text-mono-xs text-muted">
                        <th>Line Item</th>
                        <th className="text-center">Units</th>
                        <th className="text-end">Unit Rate</th>
                        <th className="text-end">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items?.map((item, idx) => (
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
              </div>

              {/* Financial Calculation */}
              <div className="d-flex flex-column align-items-end mb-3 border-bottom pb-3">
                <div className="d-flex justify-content-between w-75 mb-1 small">
                  <span className="text-muted">Taxable Subtotal:</span>
                  <span className="font-mono-numbers text-dark">
                    ₹{(selectedPO.totalAmount - selectedPO.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between w-75 mb-2 small">
                  <span className="text-muted">Applicable GST (18% IGST/CGST+SGST):</span>
                  <span className="font-mono-numbers text-dark">
                    ₹{selectedPO.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="d-flex justify-content-between w-75 pt-2 border-top">
                  <strong className="text-dark">Net PO Value:</strong>
                  <strong className="font-mono-numbers text-dark fs-5">
                    ₹{selectedPO.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Workflow Actions */}
              <div className="d-flex justify-content-end gap-2 flex-wrap">
                {isVendor && selectedPO.status === "issued" && (
                  <button
                    onClick={() => handleStatusUpdate(selectedPO._id, "acknowledged")}
                    className="btn-primary-industrial"
                  >
                    <i className="fa-solid fa-clipboard-check me-1"></i> Acknowledge Contract
                  </button>
                )}
                {isVendor && selectedPO.status === "acknowledged" && (
                  <button
                    onClick={() => handleStatusUpdate(selectedPO._id, "delivered")}
                    className="btn-primary-industrial"
                  >
                    <i className="fa-solid fa-truck-ramp-box me-1"></i> Mark as Delivered
                  </button>
                )}
                {isVendor && selectedPO.status === "delivered" && (
                  <button
                    onClick={() => handleGenerateInvoice(selectedPO._id)}
                    className="btn-primary-industrial"
                    style={{ backgroundColor: "var(--status-verified)", borderColor: "var(--status-verified)" }}
                  >
                    <i className="fa-solid fa-receipt me-1"></i> Issue Tax Invoice
                  </button>
                )}
                {isProcurement && selectedPO.status !== "cancelled" && selectedPO.status !== "delivered" && (
                  <button
                    onClick={() => handleStatusUpdate(selectedPO._id, "cancelled")}
                    className="btn-secondary-industrial text-danger"
                  >
                    <i className="fa-solid fa-ban me-1"></i> Cancel PO
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="industrial-card p-5 text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center">
              <i className="fa-solid fa-cart-shopping fs-3 text-muted mb-2"></i>
              <h6 className="fw-semibold text-dark">Select a Purchase Order</h6>
              <span className="text-mono-xs text-muted">AUDIT SPEC SHEET, LINE ITEM COSTS, AND TAX INVOICE STATUS</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;
