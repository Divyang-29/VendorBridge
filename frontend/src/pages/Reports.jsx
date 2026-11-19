import React, { useState, useEffect } from "react";
import api from "../utils/api";
import "./Reports.css";

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get("/dashboard/reports");
        if (res.success) {
          setReports(res.reports);
        } else {
          setError("Failed to fetch analytical reports data");
        }
      } catch (err) {
        setError(err.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const getMonthName = (monthNum) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return months[monthNum - 1] || "Mth";
  };

  const calculateTotalSpendAccumulated = () => {
    if (!reports?.monthlySpendTrends) return 0;
    return reports.monthlySpendTrends.reduce((acc, t) => acc + t.totalSpend, 0);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border spinner-border-sm text-secondary" role="status">
          <span className="visually-hidden">Compiling analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger py-2 px-3 small border-0 rounded-1" role="alert">
        <i className="fa-solid fa-triangle-exclamation me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="reports-page animate-fade-in">
      {/* Overview spend card */}
      <div className="system-status-banner">
        <div>
          <span className="text-mono-xs text-muted d-block">AGGREGATED FINANCIAL LEDGER</span>
          <h5 className="fw-bold mb-1 text-dark">Total Cumulative Procurement Spend</h5>
          <h2 className="report-spend-total">
            ₹{calculateTotalSpendAccumulated().toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <span className="text-mono-xs text-muted">
            RECONCILED AGAINST VALIDATED PURCHASE CONTRACTS
          </span>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={() => window.print()}
            className="btn-secondary-industrial"
            title="Export or print statement"
          >
            <i className="fa-solid fa-print me-1"></i> Print Statement
          </button>
        </div>
      </div>

      {/* Row 1: Monthly Spend & Spend By Category */}
      <div className="reports-grid">
        {/* Monthly spend trends */}
        <div className="report-table-card">
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="fa-solid fa-chart-line text-muted me-2"></i>
              Monthly Spend Trendlines
            </h6>
            <span className="text-mono-xs text-muted">HISTORICAL FISCAL LOG</span>
          </div>
          <div className="table-responsive">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Billing Month</th>
                  <th className="text-center">Issued POs</th>
                  <th className="text-end">Executed Spend (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reports?.monthlySpendTrends?.length > 0 ? (
                  reports.monthlySpendTrends.map((trend, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold text-dark font-mono">
                        {getMonthName(trend.month).toUpperCase()} {trend.year}
                      </td>
                      <td className="font-mono text-center">{trend.poCount}</td>
                      <td className="font-mono-numbers text-end fw-bold text-dark">
                        ₹{trend.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted small py-4">
                      No monthly trend logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spend by category */}
        <div className="report-table-card">
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <h6 className="fw-bold mb-0 text-dark">
              <i className="fa-solid fa-layer-group text-muted me-2"></i>
              Spend Breakdown by Commodity Category
            </h6>
            <span className="text-mono-xs text-muted">COMMODITY ALLOCATION</span>
          </div>
          <div className="table-responsive">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Commodity / Category</th>
                  <th className="text-center">Orders</th>
                  <th className="text-end">Committed Capital (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reports?.spendByCategory?.length > 0 ? (
                  reports.spendByCategory.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold text-dark">{cat.category}</td>
                      <td className="font-mono text-center">{cat.poCount}</td>
                      <td className="font-mono-numbers text-end fw-bold text-dark">
                        ₹{cat.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted small py-4">
                      No categories spend logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: Supplier Performance Scorecard */}
      <div className="vendor-grid-wrapper">
        <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="fa-solid fa-award text-muted me-2"></i>
              Supplier SLA & Delivery Adherence Index
            </h6>
            <span className="text-mono-xs text-muted">
              METRIC COMPUTED AS DELIVERED PURCHASE ORDERS OUT OF TOTAL COMMITTED CONTRACTS
            </span>
          </div>
          <span className="badge-industrial badge-verified">LIVE TELEMETRY</span>
        </div>
        <div className="table-responsive">
          <table className="table-industrial">
            <thead>
              <tr>
                <th>Supplier Entity</th>
                <th>Supply Category</th>
                <th className="text-center">Total Contracts</th>
                <th className="text-center">Delivered Orders</th>
                <th>SLA Fulfillment Ratio</th>
              </tr>
            </thead>
            <tbody>
              {reports?.vendorPerformance?.length > 0 ? (
                reports.vendorPerformance.map((perf) => (
                  <tr key={perf._id}>
                    <td className="fw-bold text-dark">{perf.vendorName}</td>
                    <td>
                      <span className="badge-industrial badge-hold">{perf.category}</span>
                    </td>
                    <td className="font-mono text-center">{perf.totalOrders}</td>
                    <td className="font-mono text-center text-dark fw-bold">{perf.deliveredOrders}</td>
                    <td style={{ minWidth: "220px" }}>
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="font-mono text-mono-xs fw-bold text-dark">
                          {perf.deliveryRate?.toFixed(1)}% ADHERENCE
                        </span>
                        <span className={`text-mono-xs ${perf.deliveryRate >= 80 ? "text-success" : perf.deliveryRate >= 50 ? "text-warning" : "text-danger"}`}>
                          {perf.deliveryRate >= 80 ? "EXEMPLARY" : perf.deliveryRate >= 50 ? "MONITORED" : "SLA RISK"}
                        </span>
                      </div>
                      <div className="performance-progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${perf.deliveryRate}%`,
                            backgroundColor: perf.deliveryRate >= 80 ? "var(--status-verified)" : perf.deliveryRate >= 50 ? "var(--status-pending)" : "var(--status-risk)",
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No supplier performance metrics logs available in current ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
