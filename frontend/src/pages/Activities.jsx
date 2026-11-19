import React, { useState, useEffect } from "react";
import api from "../utils/api";
import "./Activities.css";

const Activities = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityType, setEntityType] = useState("");

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      let queryParams = [`page=${page}`, `limit=15`];
      if (entityType) {
        queryParams.push(`entityType=${encodeURIComponent(entityType)}`);
      }
      const queryStr = `?${queryParams.join("&")}`;

      const res = await api.get(`/activities${queryStr}`);
      if (res.success) {
        setLogs(res.logs);
        setCurrentPage(res.currentPage);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [entityType]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchLogs(newPage);
  };

  const getActionBadgeClass = (action) => {
    if (action.startsWith("CREATE_")) return "badge-accent";
    if (action.startsWith("SUBMIT_")) return "badge-hold";
    if (action.startsWith("APPROVE_")) return "badge-verified";
    if (action.startsWith("REJECT_")) return "badge-risk";
    if (action.startsWith("GENERATE_")) return "badge-verified";
    return "badge-hold";
  };

  return (
    <div className="activities-page">
      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center">
          <span><i className="fa-solid fa-circle-exclamation me-2"></i>{error}</span>
          <button onClick={() => setError("")} className="btn-close btn-close-white" style={{ fontSize: "0.65rem" }}></button>
        </div>
      )}

      {/* Filter panel */}
      <div className="quotations-filter-card d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h5 className="fw-bold mb-0 text-dark">Immutable Procurement Audit Ledger</h5>
          <span className="text-mono-xs text-muted">COMPLIANCE TELEMETRY // SYSTEM ACTIONS LOGGED</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="text-mono-xs text-muted text-nowrap mb-0">MODULE SCOPE:</label>
          <select
            className="form-select form-select-sm font-mono-xs"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">MODULE: ALL</option>
            <option value="RFQ">RFQ Tenders</option>
            <option value="Quotation">Vendor Quotations</option>
            <option value="Approval">Manager Approvals</option>
            <option value="PurchaseOrder">Purchase Contracts</option>
            <option value="Invoice">Tax Invoices</option>
            <option value="Vendor">Supplier Directory</option>
            <option value="User">User Accounts</option>
          </select>
        </div>
      </div>

      {/* Audit table */}
      <div className="vendor-grid-wrapper">
        <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0 text-dark">Chronological Event Trail</h6>
          <span className="text-mono-xs text-muted">PAGE {currentPage} OF {totalPages}</span>
        </div>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-secondary" role="status">
              <span className="visually-hidden">Loading telemetry...</span>
            </div>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Timestamp (IST)</th>
                    <th>User Identity</th>
                    <th>Action Code</th>
                    <th>Target Entity</th>
                    <th>Audit Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="log-timestamp">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <div className="fw-bold text-dark small">{log.userId?.name || "System Automated"}</div>
                        <span className="text-mono-xs text-muted">
                          [{log.userId?.role?.toUpperCase() || "CORE"}]
                        </span>
                      </td>
                      <td>
                        <span className={`badge-industrial ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-muted small">
                          {log.entityType} // {log.entityId?.substring(18).toUpperCase()}
                        </span>
                      </td>
                      <td className="log-description">
                        {log.details || "System execution completed."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center">
              <span className="text-mono-xs text-muted">
                SHOWING 15 RECORDS PER BLOCK // TOTAL PAGES: {totalPages}
              </span>
              <div className="d-flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn-secondary-industrial"
                  style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                >
                  [←] Prev
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn-secondary-industrial"
                  style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                >
                  Next [→]
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="fa-solid fa-list-check fs-3 mb-2 d-block text-muted"></i>
            No audit records found matching specified filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
