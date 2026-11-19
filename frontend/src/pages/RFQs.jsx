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

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
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
      setError("Compliance rule: Assign at least one audited vendor to this RFQ.");
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
        setSuccessMsg(`RFQ created successfully and dispatched to ${assignedVendors.length} supplier partners.`);
        setShowForm(false);
        setTitle("");
        setDescription("");
        setDeadline("");
        setAssignedVendors([]);
        setItems([{ itemName: "", description: "", quantity: 1 }]);
        setAttachments([]);
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
    if (!window.confirm("Confirm deletion of RFQ proposal? Open biddings will be voided.")) return;

    try {
      const res = await api.delete(`/rfqs/${id}`);
      if (res.success) {
        setSuccessMsg("RFQ record removed from active procurement ledger.");
        fetchRFQs();
      }
    } catch (err) {
      setError(err.message || "Failed to delete RFQ");
    }
  };

  return (
    <div className="rfqs-container">
      {/* Alerts */}
      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center">
          <span><i className="fa-solid fa-circle-exclamation me-2"></i>{error}</span>
          <button onClick={() => setError("")} className="btn-close btn-close-white" style={{ fontSize: "0.65rem" }}></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center">
          <span><i className="fa-solid fa-circle-check me-2"></i>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="btn-close" style={{ fontSize: "0.65rem" }}></button>
        </div>
      )}

      {/* RFQ Header Bar */}
      <div className="rfq-header-bar">
        <div>
          <h4>Request For Quotation (RFQ) Tender Registry</h4>
          <span className="text-mono-xs text-muted">
            PROCUREMENT TENDERS: {rfqs.length} RECORDED // AUDITED BIDDING PROTOCOL
          </span>
        </div>
        {["admin", "procurement"].includes(user?.role) && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              fetchVendors();
            }}
            className="btn-primary-industrial"
          >
            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`}></i>
            {showForm ? "Cancel Creation" : "Initiate Tender RFQ"}
          </button>
        )}
      </div>

      {/* Creation Form */}
      {showForm && (
        <div className="rfq-form-card animate-fade-in mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <h6 className="fw-bold mb-0">Draft New RFQ Specification Dossier</h6>
            <span className="text-mono-xs text-muted">COMPLIANCE PROTOCOL // MULTI-VENDOR DISPATCH</span>
          </div>
          <form onSubmit={handleCreateRFQ}>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label">RFQ Title / Subject</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Procurement of SS 316L Seamless Precision Instrumentation Tubes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Bidding Deadline (IST)</label>
                <input
                  type="datetime-local"
                  className="form-control font-mono"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label">Technical & Scope Requirements Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Specify material grade (ASTM/DIN), inspection certifications (MTC 3.1), packaging criteria, and FOB/CIF delivery terms..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Dynamic Items List */}
            <div className="mt-4 mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-mono-xs text-muted">MANDATORY BILL OF QUANTITIES (BOQ)</span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="btn-secondary-industrial"
                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                >
                  <i className="fa-solid fa-plus me-1"></i> Add Line Item
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="rfq-item-row-industrial">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-mono-xs text-dark fw-bold">LINE ITEM #0{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="remove-item-btn"
                        title="Remove row"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <label className="form-label small">Item Spec / Nomenclature</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. Pipe 3in Schedule 40 Seamless"
                        value={item.itemName}
                        onChange={(e) => handleItemFieldChange(idx, "itemName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">Material Standards / Dimensions</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. ASTM A312 Grade TP316/316L, bevelled ends, 6m length"
                        value={item.description}
                        onChange={(e) => handleItemFieldChange(idx, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label small">Quantity (Units)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm font-mono text-end"
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
            <div className="mt-4 mb-3">
              <span className="text-mono-xs text-muted d-block mb-1">DISPATCH TO AUDITED SUPPLIERS</span>
              <p className="text-muted small mb-2">Check the suppliers invited to submit competitive bids for this procurement request.</p>
              {vendors.length > 0 ? (
                <div className="row g-2">
                  {vendors.map((vendor) => (
                    <div key={vendor._id} className="col-md-4">
                      <div className="p-2 border rounded-1 bg-white d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          id={`vendor-${vendor._id}`}
                          checked={assignedVendors.includes(vendor._id)}
                          onChange={() => handleVendorCheckboxChange(vendor._id)}
                        />
                        <label htmlFor={`vendor-${vendor._id}`} className="mb-0 flex-grow-1 cursor-pointer">
                          <span className="fw-semibold text-dark d-block small">{vendor.vendorName}</span>
                          <span className="text-mono-xs text-muted">{vendor.category} // {vendor.gstNumber}</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-warning py-2 small">
                  No active suppliers available. Onboard suppliers in the "Vendors" tab before assigning.
                </div>
              )}
            </div>

            {/* Document Attachments */}
            <div className="mt-3 mb-3">
              <span className="text-mono-xs text-muted d-block mb-1">SPECIFICATION BLUEPRINTS & CAD DRAWINGS</span>
              <input
                type="file"
                className="form-control form-control-sm"
                multiple
                onChange={(e) => setAttachments(Array.from(e.target.files))}
              />
              <span className="text-mono-xs text-muted mt-1 d-block">ACCEPTED FORMATS: PDF, STEP, DWG, PNG (MAX 25MB PER FILE)</span>
            </div>

            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary-industrial"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary-industrial">
                <i className="fa-solid fa-paper-plane me-1"></i>
                Publish RFQ Tender
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi-Facet Filter Bar */}
      <div className="rfq-filter-bar">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-lg-6 col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search RFQ code, title, material spec..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-lg-4 col-md-4">
            <select
              className="form-select form-select-sm font-mono-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Lifecycle: ALL STATUSES</option>
              <option value="active">Active (Bidding Open)</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed / Selected</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-2 d-flex gap-2">
            <button type="submit" className="btn-primary-industrial flex-grow-1" style={{ padding: "5px 12px" }}>
              Filter
            </button>
            {(search || statusFilter) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-secondary-industrial"
                style={{ padding: "5px 10px" }}
                title="Reset filters"
              >
                <i className="fa-solid fa-rotate-left"></i>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* RFQ Directory Grid */}
      <div className="rfq-grid-wrapper">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-secondary" role="status">
              <span className="visually-hidden">Loading tenders...</span>
            </div>
          </div>
        ) : rfqs.length > 0 ? (
          <div className="table-responsive">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>RFQ Identifier</th>
                  <th>Tender Title & Scope</th>
                  <th>BOQ Items</th>
                  <th>Bidding Deadline</th>
                  <th>Tender Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq._id}>
                    <td>
                      <span className="font-mono text-dark fw-bold">
                        {rfq.rfqNumber}
                      </span>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{rfq.title}</div>
                      <span className="text-muted d-block small text-truncate" style={{ maxWidth: "340px" }}>
                        {rfq.description || "Technical scope documented in attachments."}
                      </span>
                    </td>
                    <td>
                      <span className="badge-industrial badge-hold">
                        {rfq.items?.length || 0} Line Items
                      </span>
                    </td>
                    <td>
                      <div className="font-mono text-dark fw-semibold small">
                        {new Date(rfq.deadline).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <span className="text-mono-xs text-muted">
                        {new Date(rfq.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge-industrial ${
                          rfq.status === "active"
                            ? "badge-accent"
                            : rfq.status === "closed"
                            ? "badge-verified"
                            : "badge-hold"
                        }`}
                      >
                        <i className={`fa-solid ${
                          rfq.status === "active" ? "fa-bolt" : rfq.status === "closed" ? "fa-lock" : "fa-file-lines"
                        } me-1`}></i>
                        {rfq.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end align-items-center gap-2">
                        {["admin", "procurement"].includes(user?.role) && (
                          <button
                            onClick={() => handleDeleteRFQ(rfq._id)}
                            className="btn btn-sm btn-link text-danger p-1"
                            title="Delete RFQ"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                        <Link to={`/rfqs/${rfq._id}`} className="btn-secondary-industrial" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                          Inspect Specs [→]
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
            <i className="fa-solid fa-file-contract fs-3 mb-2 d-block text-muted"></i>
            <p className="mb-1 fw-semibold text-dark">No RFQ records match specified filter criteria.</p>
            <span className="text-mono-xs text-muted">INITIATE A TENDER PROPOSAL TO BEGIN BIDDING</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RFQs;
