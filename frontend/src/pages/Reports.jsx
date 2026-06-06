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
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[monthNum - 1] || "Month";
  };

  const calculateTotalSpendAccumulated = () => {
    if (!reports?.monthlySpendTrends) return 0;
    return reports.monthlySpendTrends.reduce((acc, t) => acc + t.totalSpend, 0);
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

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="reports-page animate-fade-in">
      {/* Overview spend card */}
      <div className="glass-panel p-4 mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="fw-bold mb-1 text-muted">Accumulated Procurement spend</h5>
          <h2 className="report-spend-total">
            ₹{calculateTotalSpendAccumulated().toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-secondary-custom"
            title="Print report overview"
          >
            <i className="fa-solid fa-print me-2"></i> Print Report
          </button>
        </div>
      </div>

      {/* Row 1: Monthly Spend & Spend By Category */}
      <div className="reports-grid">
        {/* Monthly spend trends */}
        <div className="glass-panel report-table-card">
          <h6 className="fw-bold mb-3 text-primary">
            <i className="fa-solid fa-chart-line me-2"></i> Monthly Procurement Trends
          </h6>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr className="table-light">
                  <th className="small py-2 border-0">Month / Year</th>
                  <th className="small py-2 border-0 text-center">Orders Count</th>
                  <th className="small py-2 border-0 text-end">Total Spend (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reports?.monthlySpendTrends?.length > 0 ? (
                  reports.monthlySpendTrends.map((trend, idx) => (
                    <tr key={idx}>
                      <td className="small py-2 fw-semibold">
                        {getMonthName(trend.month)} {trend.year}
                      </td>
                      <td className="small py-2 text-center">{trend.poCount}</td>
                      <td className="small py-2 text-end fw-bold text-primary">
                        ₹{trend.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted small py-4">
                      No monthly trend logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spend by category */}
        <div className="glass-panel report-table-card">
          <h6 className="fw-bold mb-3 text-primary">
            <i className="fa-solid fa-layer-group me-2"></i> Spend by Business Category
          </h6>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr className="table-light">
                  <th className="small py-2 border-0">Category</th>
                  <th className="small py-2 border-0 text-center">Orders</th>
                  <th className="small py-2 border-0 text-end">Spend (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reports?.spendByCategory?.length > 0 ? (
                  reports.spendByCategory.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="small py-2 fw-semibold">{cat.category}</td>
                      <td className="small py-2 text-center">{cat.poCount}</td>
                      <td className="small py-2 text-end fw-bold text-primary">
                        ₹{cat.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-muted small py-4">
                      No categories spend logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: Supplier Performance Scorecard */}
      <div className="glass-panel p-4">
        <h6 className="fw-bold mb-3 text-primary">
          <i className="fa-solid fa-users-viewfinder me-2"></i> Supplier Performance Scorecard
        </h6>
        <p className="text-muted small mb-4">
          Vendor rating indices computed as a factor of fulfilled PO deliveries out of total issued PO contracts.
        </p>
        <div className="table-responsive">
          <table className="table table-premium align-middle">
            <thead>
              <tr>
                <th className="py-3">Supplier Name</th>
                <th className="py-3">Business Category</th>
                <th className="py-3 text-center">Total Contracts</th>
                <th className="py-3 text-center">Delivered Orders</th>
                <th className="py-3">Delivery Adherence Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              {reports?.vendorPerformance?.length > 0 ? (
                reports.vendorPerformance.map((perf) => (
                  <tr key={perf._id}>
                    <td className="py-3 fw-bold">{perf.vendorName}</td>
                    <td className="py-3">{perf.category}</td>
                    <td className="py-3 text-center fw-semibold">{perf.totalOrders}</td>
                    <td className="py-3 text-center text-success fw-semibold">{perf.deliveredOrders}</td>
                    <td className="py-3" style={{ minWidth: "220px" }}>
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="fw-bold text-primary small">{perf.deliveryRate?.toFixed(1)}%</span>
                      </div>
                      <div className="performance-progress-bar">
                        <div className="progress-fill" style={{ width: `${perf.deliveryRate}%` }}></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No supplier performance metrics logs available in the system
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
