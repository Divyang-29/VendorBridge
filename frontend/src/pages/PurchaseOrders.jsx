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
        setSuccessMsg(`Purchase Order ${status === "acknowledged" ? "acknowledged" : "updated to " + status}`);
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
        setSuccessMsg(`Invoice ${res.invoice.invoiceNumber} generated successfully!`);
        // Navigate or reload
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
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}

      <div className="po-layout">
        {/* Left Side: POs Directory */}
        <div className="mb-4">
          <div className="glass-panel p-4">
            <h5 className="fw-bold mb-4">Purchase Orders (PO) directory</h5>
            {loading && purchaseOrders.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : purchaseOrders.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-premium align-middle">
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>{!isVendor ? "Supplier" : "RFQ Ref"}</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po) => (
                      <tr
                        key={po._id}
                        onClick={() => fetchPODetails(po._id)}
                        className={`cursor-pointer ${selectedPO?._id === po._id ? "table-active" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="py-3 fw-bold text-primary">{po.poNumber}</td>
                        <td className="py-3">
                          <div className="fw-semibold">
                            {isVendor ? po.rfqId?.rfqNumber : po.vendorId?.vendorName}
                          </div>
                        </td>
                        <td className="py-3 fw-semibold">₹{po.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3">
                          <span
                            className={`badge ${
                              po.status === "delivered"
                                ? "bg-success-subtle text-success"
                                : po.status === "cancelled"
                                ? "bg-danger-subtle text-danger"
                                : "bg-warning-subtle text-warning"
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
                <i className="fa-regular fa-folder-open fs-2 mb-3 d-block text-muted"></i>
                No Purchase Orders found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: PO details */}
        <div className="mb-4">
          {selectedPO ? (
            <div className="glass-panel po-details-card animate-fade-in">
              <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4">
                <div>
                  <span className="text-muted small">PO Reference:</span>
                  <h4 className="fw-bold text-dark mb-0">{selectedPO.poNumber}</h4>
                </div>
                <span
                  className={`badge fs-6 py-2 px-3 ${
                    selectedPO.status === "delivered"
                      ? "bg-success text-white"
                      : selectedPO.status === "cancelled"
                      ? "bg-danger text-white"
                      : "bg-warning text-dark"
                  }`}
                >
                  {selectedPO.status.toUpperCase()}
                </span>
              </div>

              {/* Company Info row */}
              <div className="row mb-4">
                <div className="col-md-6 mb-2">
                  <span className="text-muted small d-block">Supplier/Vendor:</span>
                  <strong className="text-dark">{selectedPO.vendorId?.vendorName}</strong>
                  <span className="text-muted d-block small">{selectedPO.vendorId?.email}</span>
                  <span className="text-muted d-block small">GSTIN: {selectedPO.vendorId?.gstNumber}</span>
                </div>
                <div className="col-md-6 mb-2 text-md-end">
                  <span className="text-muted small d-block">Created By:</span>
                  <strong className="text-dark">{selectedPO.createdBy?.name}</strong>
                  <span className="text-muted d-block small">Date Issued: {new Date(selectedPO.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Items summary */}
              <div className="po-item-summary">
                <h6 className="fw-bold text-primary mb-3">Order Items Spec</h6>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-end">Price</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items?.map((item, idx) => (
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
              </div>

              {/* Financial summary */}
              <div className="d-flex flex-column align-items-end mb-4 border-bottom pb-3">
                <div className="d-flex justify-content-between w-50 mb-1">
                  <span className="text-muted small">Subtotal:</span>
                  <span className="fw-semibold small">₹{(selectedPO.totalAmount - selectedPO.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="d-flex justify-content-between w-50 mb-2">
                  <span className="text-muted small">GST Tax (18%):</span>
                  <span className="fw-semibold small">₹{selectedPO.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="d-flex justify-content-between w-50 pt-2 border-top">
                  <strong className="text-dark">Total Amount:</strong>
                  <strong className="text-primary fs-5">₹{selectedPO.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Workflow Actions */}
              <div className="d-flex justify-content-end gap-2 flex-wrap">
                {isVendor && selectedPO.status === "issued" && (
                  <button
                    onClick={() => handleStatusUpdate(selectedPO._id, "acknowledged")}
                    className="btn btn-primary-custom"
                  >
                    <i className="fa-solid fa-clipboard-check me-2"></i> Acknowledge Purchase Order
                  </button>
                )}
                {isVendor && selectedPO.status === "acknowledged" && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, "delivered")}
                      className="btn btn-primary-custom"
                    >
                      <i className="fa-solid fa-truck-ramp-box me-2"></i> Mark as Delivered
                    </button>
                  </>
                )}
                {isVendor && selectedPO.status === "delivered" && (
                  <button
                    onClick={() => handleGenerateInvoice(selectedPO._id)}
                    className="btn btn-success rounded-pill px-4"
                  >
                    <i className="fa-solid fa-receipt me-2"></i> Generate Digital Invoice
                  </button>
                )}
                {isProcurement && selectedPO.status !== "cancelled" && selectedPO.status !== "delivered" && (
                  <button
                    onClick={() => handleStatusUpdate(selectedPO._id, "cancelled")}
                    className="btn btn-danger-custom btn-secondary-custom text-danger border-danger border-opacity-25"
                  >
                    <i className="fa-solid fa-trash me-2"></i> Cancel PO
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-5 text-center text-muted h-100 d-flex flex-column align-items-center justify-content-center">
              <i className="fa-solid fa-cart-shopping fs-3 text-primary mb-3"></i>
              <h5>Select a Purchase Order from the directory list to view specifications and perform status updates.</h5>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrders;
