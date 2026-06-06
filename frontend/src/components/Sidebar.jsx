import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const Sidebar = () => {
  const { user, logout, hasRole } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  // Define navigation items based on role permission
  const navItems = [
    {
      label: "Dashboard",
      icon: "fa-solid fa-chart-pie",
      path: "/",
      allowedRoles: ["admin", "procurement", "manager", "vendor"],
    },
    {
      label: "Vendors",
      icon: "fa-solid fa-briefcase",
      path: "/vendors",
      allowedRoles: ["admin", "procurement", "manager"],
    },
    {
      label: "RFQs",
      icon: "fa-solid fa-file-invoice",
      path: "/rfqs",
      allowedRoles: ["admin", "procurement", "manager", "vendor"],
    },
    {
      label: "Quotations",
      icon: "fa-solid fa-tags",
      path: "/quotations",
      allowedRoles: ["admin", "procurement", "manager", "vendor"],
    },
    {
      label: "Approvals",
      icon: "fa-solid fa-stamp",
      path: "/approvals",
      allowedRoles: ["admin", "procurement", "manager"],
    },
    {
      label: "Purchase Orders",
      icon: "fa-solid fa-cart-shopping",
      path: "/purchase-orders",
      allowedRoles: ["admin", "procurement", "manager", "vendor"],
    },
    {
      label: "Invoices",
      icon: "fa-solid fa-file-invoice-dollar",
      path: "/invoices",
      allowedRoles: ["admin", "procurement", "manager", "vendor"],
    },
    {
      label: "Activity Logs",
      icon: "fa-solid fa-clock-rotate-left",
      path: "/activities",
      allowedRoles: ["admin", "procurement", "manager"],
    },
    {
      label: "Reports & Analytics",
      icon: "fa-solid fa-chart-line",
      path: "/reports",
      allowedRoles: ["admin", "procurement", "manager"],
    },
  ];

  const filteredItems = navItems.filter((item) => hasRole(item.allowedRoles));
  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "US";

  return (
    <div className={`sidebar-container ${expanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <div className="sidebar-header">
        {expanded && <h5 className="brand-title">VendorBridge</h5>}
        <button onClick={handleToggle} className="toggle-btn" title={expanded ? "Collapse menu" : "Expand menu"}>
          <i className={`fa-solid ${expanded ? "fa-angle-left" : "fa-bars"}`}></i>
        </button>
      </div>

      <ul className="sidebar-menu">
        {filteredItems.map((item) => (
          <li key={item.path} className="menu-item">
            <Link to={item.path} className={`menu-link ${isActive(item.path)}`} title={!expanded ? item.label : undefined}>
              <i className={item.icon}></i>
              {expanded && <span>{item.label}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        {expanded && user && (
          <Link to="/profile" className="profile-badge-link text-decoration-none mb-3">
            <div className="user-profile-badge">
              <div className="profile-avatar">{initials}</div>
              <div className="profile-info">
                <p className="profile-name">{user.name}</p>
                <p className="profile-role">{user.role}</p>
              </div>
            </div>
          </Link>
        )}
        <button onClick={logout} className="logout-btn" title="Logout session">
          <i className="fa-solid fa-right-from-bracket"></i>
          {expanded && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
