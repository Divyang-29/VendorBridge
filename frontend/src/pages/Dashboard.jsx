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
        <div className="spinner-border spinner-border-sm text-secondary" role="status">
          <span className="visually-hidden">Loading telemetry...</span>
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

  const isVendor = user?.role === "vendor";

  return (
    <div className="dashboard-container">
      {/* Operational Telemetry Banner */}
      <div className="system-status-banner">
        <div>
          <div className="system-status-meta mb-1">
            <span className="system-status-indicator">
              <span className="system-pulse"></span>
              SYS OPERATIONAL
            </span>
            <span className="text-mono-xs text-muted">
              INSTANCE: VB-PROD-AP1 // ROLE: [{user?.role?.toUpperCase()}]
            </span>
          </div>
          <h3 className="system-status-title">
            Welcome, {user?.name || "Procurement Officer"}
          </h3>
          <p className="system-status-desc">
            Centralized procurement control tower for RFQ bidding, supplier compliance, and ledger reconciliation.
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-md-block">
            <span className="text-mono-xs text-muted d-block">ACTIVE FISCAL PERIOD</span>
            <span className="font-mono-numbers fw-semibold text-dark">FY 2026-Q3</span>
          </div>
          <span className="badge-industrial badge-accent">
            CYCLE RUNNING
          </span>
        </div>
      </div>

      {/* Operational KPI Grid */}
      <div className="dashboard-grid">
        {/* KPI 1: Active RFQs */}
        <div className="stat-card-industrial">
          <div className="stat-card-header">
            <span className="stat-label-industrial">Active RFQs</span>
            <i className="fa-solid fa-file-contract stat-icon-industrial"></i>
          </div>
          <h3 className="stat-value-industrial">{metrics?.activeRFQsCount || 0}</h3>
          <div className="stat-trend">
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Current bidding round</span>
          </div>
        </div>

        {/* KPI 2: Pending Approvals / Bids */}
        {!isVendor ? (
          <div className="stat-card-industrial">
            <div className="stat-card-header">
              <span className="stat-label-industrial">Pending Approvals</span>
              <i className="fa-solid fa-stamp stat-icon-industrial"></i>
            </div>
            <h3 className="stat-value-industrial">{metrics?.pendingApprovalsCount || 0}</h3>
            <div className="stat-trend">
              <i className="fa-solid fa-user-check"></i>
              <span>Awaiting manager sign-off</span>
            </div>
          </div>
        ) : (
          <div className="stat-card-industrial">
            <div className="stat-card-header">
              <span className="stat-label-industrial">Pending Bids</span>
              <i className="fa-solid fa-tags stat-icon-industrial"></i>
            </div>
            <h3 className="stat-value-industrial">{metrics?.pendingQuotationsCount || 0}</h3>
            <div className="stat-trend">
              <i className="fa-solid fa-hourglass-half"></i>
              <span>Awaiting evaluation</span>
            </div>
          </div>
        )}

        {/* KPI 3: Spend / Revenue */}
        <div className="stat-card-industrial">
          <div className="stat-card-header">
            <span className="stat-label-industrial">{isVendor ? "Total Invoiced Revenue" : "Total Procurement Spend"}</span>
            <i className="fa-solid fa-indian-rupee-sign stat-icon-industrial"></i>
          </div>
          <h3 className="stat-value-industrial">
            ₹{(isVendor ? metrics?.totalRevenue : metrics?.totalSpend)?.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}
          </h3>
          <div className="stat-trend">
            <i className="fa-solid fa-receipt"></i>
            <span>Reconciled orders</span>
          </div>
        </div>

        {/* KPI 4: Registered Vendors / POs */}
        {!isVendor ? (
          <div className="stat-card-industrial">
            <div className="stat-card-header">
              <span className="stat-label-industrial">Supplier Registry</span>
              <i className="fa-solid fa-truck-ramp-box stat-icon-industrial"></i>
            </div>
            <h3 className="stat-value-industrial">{metrics?.totalVendors || 0}</h3>
            <div className="stat-trend">
              <i className="fa-solid fa-shield-halved"></i>
              <span>Audited B2B suppliers</span>
            </div>
          </div>
        ) : (
          <div className="stat-card-industrial">
            <div className="stat-card-header">
              <span className="stat-label-industrial">Purchase Contracts</span>
              <i className="fa-solid fa-cart-flatbed stat-icon-industrial"></i>
            </div>
            <h3 className="stat-value-industrial">{metrics?.recentPOs?.length || 0}</h3>
            <div className="stat-trend">
              <i className="fa-solid fa-handshake"></i>
              <span>Active delivery terms</span>
            </div>
          </div>
        )}
      </div>

      {/* Operational Action Triggers */}
      <div className="quick-actions-bar">
        <h6 className="quick-actions-title">Procurement Execution Triggers</h6>
        <div className="quick-actions-row">
          {user?.role === "procurement" && (
            <>
              <Link to="/rfqs" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-plus"></i></div>
                <div>
                  <h6 className="quick-action-title">Create New RFQ</h6>
                  <p className="quick-action-subtitle">Dispatch item line specs to suppliers</p>
                </div>
              </Link>
              <Link to="/vendors" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-building-circle-check"></i></div>
                <div>
                  <h6 className="quick-action-title">Onboard Supplier</h6>
                  <p className="quick-action-subtitle">Record GSTIN, MSME, & tax profile</p>
                </div>
              </Link>
              <Link to="/quotations" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-table-columns"></i></div>
                <div>
                  <h6 className="quick-action-title">Compare Quotations</h6>
                  <p className="quick-action-subtitle">L1/L2 vendor rate parity analysis</p>
                </div>
              </Link>
            </>
          )}
          {user?.role === "vendor" && (
            <>
              <Link to="/rfqs" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-inbox"></i></div>
                <div>
                  <h6 className="quick-action-title">Assigned RFQs</h6>
                  <p className="quick-action-subtitle">Submit competitive line item bids</p>
                </div>
              </Link>
              <Link to="/purchase-orders" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-signature"></i></div>
                <div>
                  <h6 className="quick-action-title">Acknowledge POs</h6>
                  <p className="quick-action-subtitle">Verify delivery timelines & dispatch</p>
                </div>
              </Link>
              <Link to="/invoices" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-file-invoice"></i></div>
                <div>
                  <h6 className="quick-action-title">Issue Tax Invoice</h6>
                  <p className="quick-action-subtitle">Attach GST bill against delivered PO</p>
                </div>
              </Link>
            </>
          )}
          {user?.role === "manager" && (
            <>
              <Link to="/approvals" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-stamp"></i></div>
                <div>
                  <h6 className="quick-action-title">Approval Queue</h6>
                  <p className="quick-action-subtitle">Authorize or reject procurement bids</p>
                </div>
              </Link>
              <Link to="/reports" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-chart-simple"></i></div>
                <div>
                  <h6 className="quick-action-title">Spend Analytics</h6>
                  <p className="quick-action-subtitle">Monthly vendor expenditure trends</p>
                </div>
              </Link>
            </>
          )}
          {user?.role === "admin" && (
            <>
              <Link to="/vendors" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-warehouse"></i></div>
                <div>
                  <h6 className="quick-action-title">Supplier Master Index</h6>
                  <p className="quick-action-subtitle">Audit compliance, KYC & blacklist status</p>
                </div>
              </Link>
              <Link to="/activities" className="quick-action-card-industrial">
                <div className="quick-action-icon-box"><i className="fa-solid fa-list-check"></i></div>
                <div>
                  <h6 className="quick-action-title">Audit Trail</h6>
                  <p className="quick-action-subtitle">System-wide immutable action telemetry</p>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Operational Grids: Recent Purchase Orders & Recent Invoices */}
      <div className="dashboard-sections">
        {/* Recent POs Table */}
        <div className="section-card-industrial">
          <div className="section-header-industrial">
            <h6 className="section-title-industrial">
              <i className="fa-solid fa-cart-shopping text-muted"></i>
              Recent Purchase Orders
            </h6>
            <Link to="/purchase-orders" className="section-view-link">
              View All [→]
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>PO Code</th>
                  <th>Vendor / Reference</th>
                  <th>Total Amount</th>
                  <th className="text-end">Lifecycle Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.recentPOs?.length > 0 ? (
                  metrics.recentPOs.map((po) => (
                    <tr key={po._id}>
                      <td className="font-mono text-dark fw-semibold">{po.poNumber}</td>
                      <td>
                        <div className="fw-semibold text-truncate" style={{ maxWidth: "160px" }}>
                          {isVendor ? po.rfqId?.title : po.vendorId?.vendorName}
                        </div>
                        <span className="text-mono-xs text-muted d-block text-truncate" style={{ maxWidth: "160px" }}>
                          {po.rfqId?.rfqNumber || "RFQ-STANDARD"}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted small py-4">
                      No recent purchase orders logged in current billing cycle.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="section-card-industrial">
          <div className="section-header-industrial">
            <h6 className="section-title-industrial">
              <i className="fa-solid fa-file-invoice-dollar text-muted"></i>
              Recent Invoices & Billables
            </h6>
            <Link to="/invoices" className="section-view-link">
              View All [→]
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Invoice Ref</th>
                  <th>Supplier / PO Ref</th>
                  <th>Gross Value</th>
                  <th className="text-end">Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.recentInvoices?.length > 0 ? (
                  metrics.recentInvoices.map((inv) => (
                    <tr key={inv._id}>
                      <td className="font-mono text-dark fw-semibold">{inv.invoiceNumber}</td>
                      <td>
                        <div className="fw-semibold text-truncate" style={{ maxWidth: "160px" }}>
                          {isVendor ? "VendorBridge ERP" : inv.vendorId?.vendorName}
                        </div>
                        <span className="text-mono-xs text-muted d-block text-truncate" style={{ maxWidth: "160px" }}>
                          PO: {inv.poId?.poNumber || "N/A"}
                        </span>
                      </td>
                      <td className="font-mono-numbers fw-semibold text-dark">
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted small py-4">
                      No pending or processed tax invoices recorded.
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
