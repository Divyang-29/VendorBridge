import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import api from "../utils/api";
import "./Layout.css";

const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(1); // default active unread badge
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      if (user?.role !== "vendor") {
        const res = await api.get("/activities?limit=5");
        if (res.success && res.logs) {
          setNotifications(
            res.logs.map((log) => ({
              id: log._id,
              text: log.details || "System Activity recorded",
              timestamp: log.createdAt,
            }))
          );
        }
      } else {
        // Vendor tailored alerts
        setNotifications([
          {
            id: "v1",
            text: "Your quotation has been successfully reviewed by manager.",
            timestamp: new Date(),
          },
          {
            id: "v2",
            text: "RFQ 'Bulk Shoes' assigned to your vendor account.",
            timestamp: new Date(Date.now() - 3600000),
          },
          {
            id: "v3",
            text: "Welcome to the VendorBridge Partner Network!",
            timestamp: new Date(Date.now() - 86400000),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setUnreadCount(0); // clear count
  };

  // Helper to determine the header title based on location pathname
  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Procurement Dashboard";
    if (path.startsWith("/vendors")) return "Vendor Management Directory";
    if (path.startsWith("/rfqs")) return "Request For Quote (RFQ) Directory";
    if (path.startsWith("/quotations")) return "Vendor Quotations Hub";
    if (path.startsWith("/approvals")) return "Procurement Approvals & Workflows";
    if (path.startsWith("/purchase-orders")) return "Purchase Orders (PO) Hub";
    if (path.startsWith("/invoices")) return "Invoicing & Billings Center";
    if (path.startsWith("/activities")) return "Activity Audit Trail";
    if (path.startsWith("/reports")) return "Reports & Spend Analytics";
    return "VendorBridge ERP";
  };

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="layout-main">
        <header className="layout-navbar">
          <h1 className="navbar-page-title">{getHeaderTitle()}</h1>
          <div className="navbar-actions">
            <div className="notification-container" ref={dropdownRef}>
              <button 
                onClick={handleToggleNotifications} 
                className="notify-badge-btn" 
                title="View alerts"
              >
                <i className="fa-regular fa-bell"></i>
                {unreadCount > 0 && <span className="notify-dot"></span>}
              </button>
              
              {showNotifications && (
                <div className="notifications-dropdown glass-panel animate-fade-in">
                  <div className="notifications-header border-bottom">
                    <span className="fw-bold">Recent Alerts & Notifications</span>
                    <button 
                      onClick={() => setNotifications([])} 
                      className="btn btn-link btn-xs text-decoration-none text-muted small p-0 ms-2"
                      style={{ fontSize: "0.75rem" }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="notifications-list">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className="notification-item py-2 px-3 border-bottom">
                          <p className="notification-text mb-1 small text-dark">{n.text}</p>
                          <span className="notification-time text-muted block" style={{ fontSize: "0.7rem" }}>
                            {new Date(n.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted py-4 small">
                        <i className="fa-solid fa-bell-slash d-block fs-4 mb-2"></i>
                        No new notifications.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="navbar-user-display">
              <i className="fa-regular fa-user-circle fs-4 text-muted"></i>
              <span>{user?.name || "User Account"}</span>
              <span className="badge bg-light text-dark border ms-1">{user?.role}</span>
            </div>
          </div>
        </header>
        <main className="layout-body animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
