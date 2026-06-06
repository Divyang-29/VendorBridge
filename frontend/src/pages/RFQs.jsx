import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import "./RFQs.css";

const RFQs = () => {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search/Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Creation Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignedVendors, setAssignedVendors] = useState([]);
  const [items, setItems] = useState([{ itemName: "", description: "", quantity: 1 }]);
  const [attachments, setAttachments] = useState([]);

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (statusFilter) queryParams.push(`status=${encodeURIComponent(statusFilter)}`);
      const queryStr = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

      const res = await api.get(`/rfqs${queryStr}`);
      if (res.success) {
        setRfqs(res.rfqs);
      } else {
        setError("Failed to load RFQs");
      }
    } catch (err) {
      setError(err.message || "Failed to load RFQ records");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get("/vendors?status=active");
      if (res.success) {
        setVendors(res.vendors);
      }
    } catch (err) {
      console.error("Failed to load active vendors for assignment:", err);
    }
  };

  useEffect(() => {
    fetchRFQs();
    if (["admin", "procurement"].includes(user?.role)) {
      fetchVendors();
    }
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRFQs();
  };

  // Dynamically manage item rows
  const handleAddItemRow = () => {
    setItems([...items, { itemName: "", description: "", quantity: 1 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemFieldChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleVendorCheckboxChange = (vendorId) => {
    if (assignedVendors.includes(vendorId)) {
      setAssignedVendors(assignedVendors.filter((id) => id !== vendorId));
    } else {
      setAssignedVendors([...assignedVendors, vendorId]);
    }
  };

  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (assignedVendors.length === 0) {
      setError("Please assign at least one vendor to this RFQ");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("deadline", deadline);
      formData.append("assignedVendors", JSON.stringify(assignedVendors));
      formData.append("items", JSON.stringify(items));

      for (let i = 0; i < attachments.length; i++) {
        formData.append("attachments", attachments[i]);
      }

      const res = await api.upload("/rfqs", formData);

      if (res.success) {
        setSuccessMsg("RFQ created and dispatched to vendors successfully!");
        setShowForm(false);
        // Clear fields
        setTitle("");
        setDescription("");
        setDeadline("");
        setAssignedVendors([]);
        setItems([{ itemName: "", description: "", quantity: 1 }]);
        setAttachments([]);
        // Refresh
        fetchRFQs();
      } else {
        setError(res.message || "Failed to create RFQ");
      }
    } catch (err) {
      setError(err.message || "RFQ creation failed");
    }
  };

  const handleDeleteRFQ = async (id) => {
    if (!["admin", "procurement"].includes(user?.role)) return;
    if (!window.confirm("Are you sure you want to delete this RFQ?")) return;

    try {
      const res = await api.delete(`/rfqs/${id}`);
      if (res.success) {
        setSuccessMsg("RFQ record deleted");
        fetchRFQs();
      }
    } catch (err) {
      setError(err.message || "Failed to delete RFQ");
    }
  };

  return (
    <div className="rfqs-container">
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}

      <div className="rfq-header-bar">
        <h4 className="fw-bold mb-0">Request For Quotes (RFQs) Registry</h4>
        {["admin", "procurement"].includes(user?.role) && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              fetchVendors();
            }}
            className="btn btn-primary-custom"
          >
            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"} me-2`}></i>
            {showForm ? "Cancel Creation" : "Initiate RFQ Proposal"}
          </button>
        )}
      </div>

      {/* Creation Form */}
      {showForm && (
        <div className="glass-panel p-4 animate-fade-in mb-4">
          <h5 className="fw-bold mb-4">Create Request for Quotation</h5>
          <form onSubmit={handleCreateRFQ}>
            <div className="row">
              <div className="col-md-8 mb-3">
                <label className="form-label">RFQ Subject / Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Procurement of Heavy Duty Metal Brackets"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Deadline Date</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
              <div className="col-12 mb-3">
                <label className="form-label">Procurement Requirements Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Provide detailed material requirements, standards, and specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Dynamic Items List */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0 text-primary">Requested Items / Products</h6>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="btn btn-sm btn-outline-primary"
                >
                  <i className="fa-solid fa-plus me-1"></i> Add Item Row
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="rfq-item-row animate-fade-in">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="remove-item-btn"
                      title="Remove this item"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                  <div className="row">
                    <div className="col-md-4 mb-2">
                      <label className="form-label small">Item Name</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Stainless Steel Pipe 3in"
                        value={item.itemName}
                        onChange={(e) => handleItemFieldChange(idx, "itemName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="form-label small">Detailed Specifications</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Grade 316, seamless, schedule 40"
                        value={item.description}
                        onChange={(e) => handleItemFieldChange(idx, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="form-label small">Quantity Required</label>
                      <input
                        type="number"
                        className="form-control form-control-sm text-end"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemFieldChange(idx, "quantity", parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vendor Assignments */}
            <div className="mb-4">
              <h6 className="fw-bold mb-2 text-primary">Assign Suppliers / Vendors</h6>
              <p className="text-muted small mb-3">Select supplier companies authorized to submit biddings for this RFQ.</p>
              {vendors.length > 0 ? (
                <div className="row">
                  {vendors.map((vendor) => (
                    <div key={vendor._id} className="col-md-4 mb-2">
                      <div className="form-check card p-2 bg-light border-0">
                        <label className="form-check-label d-flex align-items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="form-check-input me-2 ms-0"
                            checked={assignedVendors.includes(vendor._id)}
                            onChange={() => handleVendorCheckboxChange(vendor._id)}
                          />
                          <div>
                            <span className="fw-semibold d-block small">{vendor.vendorName}</span>
                            <span className="text-muted small" style={{ fontSize: "0.7rem" }}>
                              Category: {vendor.category}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-warning small">
                  No active suppliers available. Onboard suppliers in the "Vendors" tab before assigning.
                </div>
              )}
            </div>

            {/* Document Attachments */}
            <div className="mb-4">
              <h6 className="fw-bold mb-2 text-primary">Specifications Attachments (Optional)</h6>
              <input
                type="file"
                className="form-control"
                multiple
                onChange={(e) => setAttachments(Array.from(e.target.files))}
              />
              <p className="text-muted small mt-1">Upload technical brochures, specification drafts, or dimension plans.</p>
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
                Create & Send RFQ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter cards */}
      <div className="glass-panel rfq-filter-card mb-4">
        <form onSubmit={handleSearchSubmit} className="row align-items-center g-3">
          <div className="col-lg-6 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="fa-solid fa-magnifying-glass text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by RFQ number, title or specifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-lg-4 col-md-4">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed / Selected</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-2">
            <button type="submit" className="btn btn-primary-custom w-100">
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* RFQ Directory Grid */}
      <div className="glass-panel p-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : rfqs.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-premium align-middle">
              <thead>
                <tr>
                  <th className="py-3">RFQ Number</th>
                  <th className="py-3">Title & Summary</th>
                  <th className="py-3">Items Count</th>
                  <th className="py-3">Bidding Deadline</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-end">Details</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq._id}>
                    <td className="py-3 fw-bold text-primary">{rfq.rfqNumber}</td>
                    <td className="py-3">
                      <div className="fw-semibold">{rfq.title}</div>
                      <span className="text-muted d-block small text-truncate" style={{ maxWidth: "300px" }}>
                        {rfq.description || "No description provided"}
                      </span>
                    </td>
                    <td className="py-3 fw-semibold">{rfq.items?.length || 0} items</td>
                    <td className="py-3">
                      <div className="small fw-semibold">
                        {new Date(rfq.deadline).toLocaleDateString()}
                      </div>
                      <div className="text-muted small">
                        {new Date(rfq.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`badge py-2 px-3 ${
                          rfq.status === "active"
                            ? "bg-primary-subtle text-primary"
                            : rfq.status === "draft"
                            ? "bg-secondary-subtle text-secondary"
                            : "bg-success-subtle text-success"
                        }`}
                      >
                        {rfq.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-end">
                      <div className="d-flex justify-content-end align-items-center gap-3">
                        {["admin", "procurement"].includes(user?.role) && (
                          <button
                            onClick={() => handleDeleteRFQ(rfq._id)}
                            className="btn btn-sm btn-link text-danger p-0"
                            title="Delete RFQ"
                          >
                            <i className="fa-regular fa-trash-can fs-5"></i>
                          </button>
                        )}
                        <Link to={`/rfqs/${rfq._id}`} className="btn btn-sm btn-outline-primary rounded-pill px-3">
                          View Specs
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="fa-regular fa-folder-open fs-2 mb-3 d-block text-muted"></i>
            No RFQ records found.
          </div>
        )}
      </div>
    </div>
  );
};

export default RFQs;
