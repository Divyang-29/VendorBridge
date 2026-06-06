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

  // Helper to color-code action tag types
  const getActionBadgeClass = (action) => {
    if (action.startsWith("CREATE_")) return "bg-primary-subtle text-primary";
    if (action.startsWith("SUBMIT_")) return "bg-info-subtle text-info";
    if (action.startsWith("APPROVE_")) return "bg-success-subtle text-success";
    if (action.startsWith("REJECT_")) return "bg-danger-subtle text-danger";
    if (action.startsWith("GENERATE_")) return "bg-purple-subtle text-purple";
    return "bg-secondary-subtle text-secondary";
  };

  return (
    <div className="activities-page">
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* Filter panel */}
      <div className="glass-panel p-4 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <h5 className="fw-bold mb-0 text-dark">Audit Logs & History</h5>
        <div className="d-flex align-items-center gap-2">
          <label className="form-label small mb-0 text-muted text-nowrap">Filter by module:</label>
          <select
            className="form-select form-select-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="">All Modules</option>
            <option value="RFQ">RFQ</option>
            <option value="Quotation">Quotation</option>
            <option value="Approval">Approval</option>
            <option value="PurchaseOrder">PurchaseOrder</option>
            <option value="Invoice">Invoice</option>
            <option value="Vendor">Vendor</option>
            <option value="User">User</option>
          </select>
        </div>
      </div>

      {/* Audit table */}
      <div className="glass-panel p-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-premium align-middle">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Reference</th>
                    <th>Activity Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="py-3 log-timestamp">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <div className="fw-bold small">{log.userId?.name}</div>
                        <span className="badge bg-light text-dark border small" style={{ fontSize: "0.65rem" }}>
                          {log.userId?.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`badge log-action-badge py-2 px-3 ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 fw-semibold small text-muted">
                        {log.entityType}: {log.entityId?.substring(18).toUpperCase()}
                      </td>
                      <td className="py-3 log-description">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-4 border-top pt-3">
                <span className="text-muted small">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({logs.length} on page)
                </span>
                <div className="d-flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-sm btn-secondary-custom py-1"
                  >
                    <i className="fa-solid fa-angle-left me-1"></i> Prev
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-sm btn-secondary-custom py-1"
                  >
                    Next <i className="fa-solid fa-angle-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="fa-regular fa-folder-open fs-2 mb-3 d-block text-muted"></i>
            No audit logs captured.
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
