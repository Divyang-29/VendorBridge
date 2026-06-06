import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "./Dashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get("/dashboard/metrics");
        if (res.success) {
          setMetrics(res.metrics);
        } else {
          setError("Failed to fetch dashboard metrics");
        }
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const isVendor = user?.role === "vendor";

  return (
    <div className="dashboard-container">
      {/* Welcome banner */}
      <div className="glass-panel p-4 mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold mb-1">Welcome back, {user?.name}!</h3>
          <p className="text-muted mb-0">
            Monitor and coordinate your organization's procurement cycle from one centralized console.
          </p>
        </div>
        <div className="d-none d-md-block">
          <span className="badge bg-primary px-3 py-2 fs-6">Role: {user?.role?.toUpperCase()}</span>
        </div>
      </div>

      {/* Stats Cards grid */}
      <div className="dashboard-grid">
        {/* Card 1: Active RFQs */}
        <div className="glass-panel stat-card stat-blue">
          <div className="stat-content">
            <p className="stat-label">Active RFQs</p>
            <h3 className="stat-value">{metrics?.activeRFQsCount || 0}</h3>
          </div>
          <div className="stat-icon-wrapper">
            <i className="fa-solid fa-file-signature"></i>
          </div>
        </div>

        {/* Card 2: Pending Items */}
        {!isVendor ? (
          <div className="glass-panel stat-card stat-purple">
            <div className="stat-content">
              <p className="stat-label">Pending Approvals</p>
              <h3 className="stat-value">{metrics?.pendingApprovalsCount || 0}</h3>
            </div>
            <div className="stat-icon-wrapper">
              <i className="fa-solid fa-stamp"></i>
            </div>
          </div>
        ) : (
          <div className="glass-panel stat-card stat-purple">
            <div className="stat-content">
              <p className="stat-label">Pending Bids</p>
              <h3 className="stat-value">{metrics?.pendingQuotationsCount || 0}</h3>
            </div>
            <div className="stat-icon-wrapper">
              <i className="fa-solid fa-tags"></i>
            </div>
          </div>
        )}

        {/* Card 3: Spend / Revenue */}
        <div className="glass-panel stat-card stat-green">
          <div className="stat-content">
            <p className="stat-label">{isVendor ? "Total Revenue" : "Total Spend"}</p>
            <h3 className="stat-value">
              ₹{(isVendor ? metrics?.totalRevenue : metrics?.totalSpend)?.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0.00"}
            </h3>
          </div>
          <div className="stat-icon-wrapper">
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
        </div>

        {/* Card 4: Reference Metric */}
        {!isVendor && (
          <div className="glass-panel stat-card stat-orange">
            <div className="stat-content">
              <p className="stat-label">Registered Vendors</p>
              <h3 className="stat-value">{metrics?.totalVendors || 0}</h3>
            </div>
            <div className="stat-icon-wrapper">
              <i className="fa-solid fa-users-gear"></i>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <h5 className="fw-bold mb-3">Quick Actions</h5>
      <div className="quick-actions-row">
        {user?.role === "procurement" && (
          <>
            <Link to="/rfqs" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-plus-circle"></i></div>
              <h6 className="fw-bold mb-1">Create RFQ</h6>
              <p className="text-muted small mb-0">Request quotes from vendor partners</p>
            </Link>
            <Link to="/vendors" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-user-plus"></i></div>
              <h6 className="fw-bold mb-1">Register Vendor</h6>
              <p className="text-muted small mb-0">Onboard new supplier details</p>
            </Link>
            <Link to="/quotations" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-code-compare"></i></div>
              <h6 className="fw-bold mb-1">Compare Quotes</h6>
              <p className="text-muted small mb-0">Evaluate biddings side-by-side</p>
            </Link>
          </>
        )}
        {user?.role === "vendor" && (
          <>
            <Link to="/rfqs" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-envelope-open-text"></i></div>
              <h6 className="fw-bold mb-1">View Assigned RFQs</h6>
              <p className="text-muted small mb-0">Bid on open procurement requests</p>
            </Link>
            <Link to="/purchase-orders" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-file-signature"></i></div>
              <h6 className="fw-bold mb-1">Acknowledge POs</h6>
              <p className="text-muted small mb-0">Review purchase contracts</p>
            </Link>
            <Link to="/invoices" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-receipt"></i></div>
              <h6 className="fw-bold mb-1">Create Invoice</h6>
              <p className="text-muted small mb-0">Request payment for delivered orders</p>
            </Link>
          </>
        )}
        {user?.role === "manager" && (
          <>
            <Link to="/approvals" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-stamp"></i></div>
              <h6 className="fw-bold mb-1">Review Proposals</h6>
              <p className="text-muted small mb-0">Approve or reject bidding requests</p>
            </Link>
            <Link to="/reports" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-chart-line"></i></div>
              <h6 className="fw-bold mb-1">Procurement Reports</h6>
              <p className="text-muted small mb-0">View monthly trends & budgets</p>
            </Link>
          </>
        )}
        {user?.role === "admin" && (
          <>
            <Link to="/vendors" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-users-gear"></i></div>
              <h6 className="fw-bold mb-1">Manage Supplier Records</h6>
              <p className="text-muted small mb-0">Review supplier credentials & status</p>
            </Link>
            <Link to="/activities" className="glass-panel quick-action-card hover-lift">
              <div className="quick-action-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
              <h6 className="fw-bold mb-1">Audit Logs</h6>
              <p className="text-muted small mb-0">Track all procurement actions</p>
            </Link>
          </>
        )}
      </div>

      {/* Tables Row: Recent Purchase Orders & Recent Invoices */}
      <div className="dashboard-sections">
        {/* Recent POs */}
        <div className="glass-panel section-card">
          <div className="section-header">
            <h6 className="section-title">
              <i className="fa-solid fa-cart-flatbed text-primary"></i> Recent Purchase Orders
            </h6>
            <Link to="/purchase-orders" className="btn btn-sm btn-link p-0 text-decoration-none">
              View All
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr className="table-light">
                  <th className="small py-2 border-0">PO Number</th>
                  <th className="small py-2 border-0">Vendor / RFQ</th>
                  <th className="small py-2 border-0">Amount</th>
                  <th className="small py-2 border-0 text-end">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.recentPOs?.length > 0 ? (
                  metrics.recentPOs.map((po) => (
                    <tr key={po._id}>
                      <td className="small py-2 fw-semibold">{po.poNumber}</td>
                      <td className="small py-2">
                        <div className="fw-semibold text-truncate" style={{ maxWidth: "150px" }}>
                          {isVendor ? po.rfqId?.title : po.vendorId?.vendorName}
                        </div>
                        <span className="text-muted text-truncate d-block small" style={{ maxWidth: "150px" }}>
                          {po.rfqId?.rfqNumber}
                        </span>
                      </td>
                      <td className="small py-2 fw-semibold">₹{po.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="small py-2 text-end">
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted small py-4">
                      No recent Purchase Orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="glass-panel section-card">
          <div className="section-header">
            <h6 className="section-title">
              <i className="fa-solid fa-file-invoice-dollar text-purple"></i> Recent Invoices
            </h6>
            <Link to="/invoices" className="btn btn-sm btn-link p-0 text-decoration-none">
              View All
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr className="table-light">
                  <th className="small py-2 border-0">Invoice No</th>
                  <th className="small py-2 border-0">Supplier / PO</th>
                  <th className="small py-2 border-0">Amount</th>
                  <th className="small py-2 border-0 text-end">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.recentInvoices?.length > 0 ? (
                  metrics.recentInvoices.map((inv) => (
                    <tr key={inv._id}>
                      <td className="small py-2 fw-semibold">{inv.invoiceNumber}</td>
                      <td className="small py-2">
                        <div className="fw-semibold text-truncate" style={{ maxWidth: "150px" }}>
                          {isVendor ? "VendorBridge" : inv.vendorId?.vendorName}
                        </div>
                        <span className="text-muted text-truncate d-block small" style={{ maxWidth: "150px" }}>
                          Ref: {inv.poId?.poNumber}
                        </span>
                      </td>
                      <td className="small py-2 fw-semibold">₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="small py-2 text-end">
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted small py-4">
                      No recent Invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
