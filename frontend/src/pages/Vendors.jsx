import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "./Vendors.css";

const Vendors = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search/Filter states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Creation Form states
  const [showForm, setShowForm] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [category, setCategory] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const fetchVendors = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (categoryFilter) queryParams.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (statusFilter) queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      const queryStr = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

      const res = await api.get(`/vendors${queryStr}`);
      if (res.success) {
        setVendors(res.vendors);
      } else {
        setError("Failed to load vendors list");
      }
    } catch (err) {
      setError(err.message || "Failed to load supplier records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVendors();
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.post("/vendors", {
        vendorName,
        category,
        gstNumber,
        email,
        phone,
        address,
      });

      if (res.success) {
        setSuccessMsg("Vendor onboarded successfully!");
        setShowForm(false);
        // Clear fields
        setVendorName("");
        setCategory("");
        setGstNumber("");
        setEmail("");
        setPhone("");
        setAddress("");
        // Refresh list
        fetchVendors();
      } else {
        setError(res.message || "Failed to create vendor");
      }
    } catch (err) {
      setError(err.message || "Onboarding failed");
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    if (user?.role !== "admin") return;
    
    // Cycle status: active -> inactive -> blacklisted -> active
    let nextStatus = "active";
    if (currentStatus === "active") nextStatus = "inactive";
    else if (currentStatus === "inactive") nextStatus = "blacklisted";

    try {
      const res = await api.patch(`/vendors/${id}/status`, { status: nextStatus });
      if (res.success) {
        setSuccessMsg(`Vendor status updated to ${nextStatus}`);
        fetchVendors();
      }
    } catch (err) {
      setError(err.message || "Failed to update vendor status");
    }
  };

  const handleDeleteVendor = async (id) => {
    if (user?.role !== "admin") return;
    if (!window.confirm("Are you sure you want to delete this vendor record?")) return;

    try {
      const res = await api.delete(`/vendors/${id}`);
      if (res.success) {
        setSuccessMsg("Vendor record deleted");
        fetchVendors();
      }
    } catch (err) {
      setError(err.message || "Failed to delete vendor");
    }
  };

  return (
    <div className="vendors-container">
      {error && <div className="alert alert-danger alert-dismissible fade show py-2 small">{error}</div>}
      {successMsg && <div className="alert alert-success alert-dismissible fade show py-2 small">{successMsg}</div>}

      <div className="vendor-header-bar">
        <h4 className="fw-bold mb-0">Suppliers & Vendor Registry</h4>
        {["admin", "procurement"].includes(user?.role) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary-custom"
          >
            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"} me-2`}></i>
            {showForm ? "Cancel Onboarding" : "Onboard New Supplier"}
          </button>
        )}
      </div>

      {/* Onboarding Form */}
      {showForm && (
        <div className="glass-panel vendor-form-container animate-fade-in mb-4">
          <h5 className="fw-bold mb-4">New Supplier Registration</h5>
          <form onSubmit={handleCreateVendor}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Vendor Company Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Apex Industrial Supplies"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Business Category</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Electrical, Metal Fabrications"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">GSTIN / Tax Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Official Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="accounts@supplier.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Business Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Street details, City, State"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary-custom"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary-custom">
                Onboard Vendor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter cards */}
      <div className="glass-panel vendor-search-card mb-4">
        <form onSubmit={handleSearchSubmit} className="row align-items-center g-3">
          <div className="col-lg-4 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="fa-solid fa-magnifying-glass text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by vendor name or GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-lg-3 col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Filter by Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
          <div className="col-lg-3 col-md-3">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-12">
            <button type="submit" className="btn btn-primary-custom w-100">
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* Vendors Table */}
      <div className="glass-panel p-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : vendors.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-premium align-middle">
              <thead>
                <tr>
                  <th className="py-3">Supplier Name</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">GST Number</th>
                  <th className="py-3">Email & Phone</th>
                  <th className="py-3">Status</th>
                  {user?.role === "admin" && <th className="py-3 text-end">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor._id}>
                    <td className="py-3 fw-bold">
                      <div className="d-flex align-items-center">
                        <div className="profile-avatar me-3" style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}>
                          {vendor.vendorName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span>{vendor.vendorName}</span>
                          <span className="text-muted d-block small" style={{ fontSize: "0.75rem", fontWeight: "normal" }}>
                            Added by: {vendor.createdBy?.name || "System"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">{vendor.category}</td>
                    <td className="py-3 fw-semibold text-uppercase">{vendor.gstNumber}</td>
                    <td className="py-3">
                      <div className="small">{vendor.email}</div>
                      <div className="text-muted small">{vendor.phone}</div>
                    </td>
                    <td className="py-3">
                      <span
                        onClick={() => handleStatusChange(vendor._id, vendor.status)}
                        className={`badge status-badge-interactive py-2 px-3 ${
                          vendor.status === "active"
                            ? "bg-success-subtle text-success"
                            : vendor.status === "inactive"
                            ? "bg-secondary-subtle text-secondary"
                            : "bg-danger-subtle text-danger"
                        }`}
                        title={user?.role === "admin" ? "Click to cycle status" : undefined}
                      >
                        {vendor.status.toUpperCase()}
                      </span>
                    </td>
                    {user?.role === "admin" && (
                      <td className="py-3 text-end">
                        <button
                          onClick={() => handleDeleteVendor(vendor._id)}
                          className="btn btn-sm btn-link text-danger p-0"
                          title="Delete supplier record"
                        >
                          <i className="fa-regular fa-trash-can fs-5"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="fa-regular fa-folder-open fs-2 mb-3 d-block text-muted"></i>
            No vendor records found matching the search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default Vendors;
