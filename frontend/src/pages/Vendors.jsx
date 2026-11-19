import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api, { BASE_URL } from "../utils/api";
import "./Vendors.css";

// Indian State Codes mapping for GSTIN identification
const GST_STATE_MAP = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

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
  const [complianceFilter, setComplianceFilter] = useState("");

  // Creation Form states
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [category, setCategory] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [msmeNumber, setMsmeNumber] = useState("");
  const [msmeCategory, setMsmeCategory] = useState("Not Applicable");
  const [gstCertificateFile, setGstCertificateFile] = useState(null);
  const [msmeCertificateFile, setMsmeCertificateFile] = useState(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Slide-over Inspection Drawer state
  const [activeVendor, setActiveVendor] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null); // "gst" | "msme" | null
  const blobUrlsRef = useRef([]); // Tracked array of { url, createdAt }

  // Clean up remaining blob URLs on component unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((item) => {
        try {
          URL.revokeObjectURL(item.url);
        } catch (e) {
          // ignore
        }
      });
      blobUrlsRef.current = [];
    };
  }, []);

  // Audit form state inside drawer
  const [auditTarget, setAuditTarget] = useState("gst"); // "gst", "msme", "all"
  const [auditStatus, setAuditStatus] = useState("verified"); // "verified", "rejected", "pending_verification"
  const [auditRemarks, setAuditRemarks] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveVendor(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setComplianceFilter("");
    fetchVendors();
  };

  // Real-time GST State & PAN preview calculations
  const cleanGstInput = gstNumber.trim().toUpperCase();
  const gstStateCode = cleanGstInput.length >= 2 ? cleanGstInput.substring(0, 2) : "";
  const gstStateName = GST_STATE_MAP[gstStateCode] || "";
  const gstPanNumber = cleanGstInput.length >= 12 ? cleanGstInput.substring(2, 12) : "";
  const isGstFormatValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z0-9A-Z]{1}[0-9A-Z]{1}$/.test(cleanGstInput);

  // Real-time MSME format validation
  const cleanMsmeInput = msmeNumber.trim().toUpperCase();
  const isMsmeFormatValid = !cleanMsmeInput || /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(cleanMsmeInput);

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!isGstFormatValid) {
      setError("GSTIN must follow the statutory 15-character format (e.g., 27AAAAA1111A1Z1).");
      return;
    }

    if (cleanMsmeInput && !isMsmeFormatValid) {
      setError("MSME Number must match statutory Udyam format: UDYAM-XX-00-0000000 (e.g. UDYAM-MH-12-0048192).");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("vendorName", vendorName);
      formData.append("category", category);
      formData.append("gstNumber", cleanGstInput);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("address", address);
      if (cleanMsmeInput) {
        formData.append("msmeNumber", cleanMsmeInput);
        formData.append("msmeCategory", msmeCategory);
      }
      if (gstCertificateFile) {
        formData.append("gstCertificate", gstCertificateFile);
      }
      if (msmeCertificateFile) {
        formData.append("msmeCertificate", msmeCertificateFile);
      }

      const res = await api.upload("/vendors", formData);

      if (res.success) {
        setSuccessMsg(`Supplier '${vendorName}' successfully onboarded with GSTIN ${cleanGstInput}.`);
        setShowForm(false);
        setVendorName("");
        setCategory("");
        setGstNumber("");
        setMsmeNumber("");
        setMsmeCategory("Not Applicable");
        setGstCertificateFile(null);
        setMsmeCertificateFile(null);
        setEmail("");
        setPhone("");
        setAddress("");
        fetchVendors();
      } else {
        setError(res.message || "Failed to onboard supplier");
      }
    } catch (err) {
      setError(err.message || "Onboarding failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    if (user?.role !== "admin") return;

    let nextStatus = "active";
    if (currentStatus === "active") nextStatus = "inactive";
    else if (currentStatus === "inactive") nextStatus = "blacklisted";

    try {
      const res = await api.patch(`/vendors/${id}/status`, { status: nextStatus });
      if (res.success) {
        setSuccessMsg(`Supplier operational status updated to [${nextStatus.toUpperCase()}].`);
        fetchVendors();
        if (activeVendor?._id === id) {
          setActiveVendor({ ...activeVendor, status: nextStatus });
        }
      }
    } catch (err) {
      setError(err.message || "Failed to update vendor status");
    }
  };

  const handleDeleteVendor = async (id, e) => {
    if (e) e.stopPropagation();
    if (user?.role !== "admin") return;
    if (!window.confirm("Confirm deletion of supplier record? All historical bid references will be archived.")) return;

    try {
      const res = await api.delete(`/vendors/${id}`);
      if (res.success) {
        setSuccessMsg("Supplier record removed from active directory.");
        if (activeVendor?._id === id) setActiveVendor(null);
        fetchVendors();
      }
    } catch (err) {
      setError(err.message || "Failed to delete vendor");
    }
  };

  // Perform statutory compliance audit verification
  const handleVerifyCompliance = async (e) => {
    e.preventDefault();
    if (!activeVendor) return;
    setIsAuditing(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.patch(`/vendors/${activeVendor._id}/verify-compliance`, {
        complianceType: auditTarget,
        status: auditStatus,
        remarks: auditRemarks,
      });

      if (res.success) {
        setSuccessMsg(`Statutory compliance audit updated for '${activeVendor.vendorName}'.`);
        setActiveVendor(res.vendor);
        setAuditRemarks("");
        // Update in list
        setVendors((prev) =>
          prev.map((v) => (v._id === res.vendor._id ? res.vendor : v))
        );
      } else {
        setError(res.message || "Compliance verification update failed");
      }
    } catch (err) {
      setError(err.message || "Compliance verification failed");
    } finally {
      setIsAuditing(false);
    }
  };

  // Authenticated secure certificate viewer using blob preview with safe URL lifecycle
  const handleViewCertificate = async (vendorId, type) => {
    setViewingDoc(type);
    setError("");
    try {
      // Revoke previously opened blob URLs after a 10-minute grace window
      const TEN_MINUTES_MS = 10 * 60 * 1000;
      const now = Date.now();
      blobUrlsRef.current = blobUrlsRef.current.filter((item) => {
        if (now - item.createdAt > TEN_MINUTES_MS) {
          try {
            URL.revokeObjectURL(item.url);
          } catch (e) {
            // ignore
          }
          return false;
        }
        return true;
      });

      // Fetch certificate binary stream with Bearer authorization
      const blob = await api.download(`/vendors/${vendorId}/certificate/${type}`);
      const blobUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.push({ url: blobUrl, createdAt: now });
      window.open(blobUrl, "_blank");
    } catch (err) {
      setError(err.message || `Failed to securely load ${type.toUpperCase()} certificate.`);
    } finally {
      setViewingDoc(null);
    }
  };

  // Client-side compliance filter application
  const filteredVendors = vendors.filter((v) => {
    if (!complianceFilter) return true;
    if (complianceFilter === "gst_verified") return v.gstVerificationStatus === "verified";
    if (complianceFilter === "gst_pending") return v.gstVerificationStatus === "pending_verification";
    if (complianceFilter === "msme_registered") return Boolean(v.msmeNumber);
    if (complianceFilter === "msme_verified") return v.msmeVerificationStatus === "verified";
    return true;
  });

  return (
    <div className="vendors-container">
      {/* Notifications */}
      {error && (
        <div className="alert alert-danger py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center">
          <span>
            <i className="fa-solid fa-circle-exclamation me-2"></i>
            {error}
          </span>
          <button
            onClick={() => setError("")}
            className="btn-close"
            style={{ fontSize: "0.65rem" }}
          ></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center">
          <span>
            <i className="fa-solid fa-circle-check me-2"></i>
            {successMsg}
          </span>
          <button
            onClick={() => setSuccessMsg("")}
            className="btn-close"
            style={{ fontSize: "0.65rem" }}
          ></button>
        </div>
      )}

      {/* Directory Header Bar */}
      <div className="vendor-header-bar">
        <div>
          <h4>Supplier & Vendor Master Directory</h4>
          <span className="text-mono-xs text-muted">
            AUDITED SUPPLIERS: {vendors.length} REGISTERED // STATUTORY AUDIT: GSTN-IN & MSME UDYAM
          </span>
        </div>
        {["admin", "procurement"].includes(user?.role) && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary-industrial"
          >
            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`}></i>
            {showForm ? "Cancel Onboarding" : "Onboard Supplier"}
          </button>
        )}
      </div>

      {/* Onboarding Drawer Form */}
      {showForm && (
        <div className="vendor-form-container animate-fade-in mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <div>
              <h6 className="fw-bold mb-0">Onboard New Supplier // Statutory Compliance Profile</h6>
              <span className="text-mono-xs text-muted">VERIFIED AGAINST INDIAN GST & MSME UDYAM REGISTRIES</span>
            </div>
            <span className="badge-industrial badge-verified">STATUTORY VERIFICATION MANDATORY</span>
          </div>

          <form onSubmit={handleCreateVendor}>
            <div className="row g-3">
              {/* Entity Info */}
              <div className="col-md-6">
                <label className="form-label">Legal Registered Entity Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bharat Heavy Precision Castings Pvt Ltd"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Procurement Category <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Precision Castings, Valves & Flanges"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>

              {/* GSTIN and State/PAN Preview */}
              <div className="col-md-6">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label mb-1">
                    GSTIN Identification Number (15 Characters) <span className="text-danger">*</span>
                  </label>
                  {cleanGstInput.length > 0 && (
                    <span className={`text-mono-xs ${isGstFormatValid ? "text-success fw-bold" : "text-muted"}`}>
                      {cleanGstInput.length}/15 {isGstFormatValid ? "✓ VALID FORMAT" : ""}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={15}
                  className={`form-control font-mono ${cleanGstInput.length === 15 && !isGstFormatValid ? "is-invalid" : ""}`}
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  required
                />
                <div className="d-flex gap-2 mt-1">
                  {gstStateName && (
                    <span className="badge-industrial badge-hold text-mono-xs">
                      <i className="fa-solid fa-location-dot me-1"></i>State: [{gstStateCode}] {gstStateName}
                    </span>
                  )}
                  {gstPanNumber && (
                    <span className="badge-industrial badge-verified text-mono-xs font-mono">
                      PAN: {gstPanNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* GST Certificate Upload */}
              <div className="col-md-6">
                <label className="form-label mb-1">
                  Upload GST Registration Certificate (PDF/Image)
                </label>
                <div className="file-upload-zone">
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setGstCertificateFile(e.target.files[0] || null)}
                  />
                  <div className="text-mono-xs text-muted mt-1">
                    {gstCertificateFile ? `Attached: ${gstCertificateFile.name}` : "Accepted: PDF, PNG, JPG (Max 10MB)"}
                  </div>
                </div>
              </div>

              {/* MSME Udyam Registration */}
              <div className="col-md-4">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label mb-1">MSME Udyam Number (Optional)</label>
                  {cleanMsmeInput && (
                    <span className={`text-mono-xs ${isMsmeFormatValid ? "text-success fw-bold" : "text-danger"}`}>
                      {isMsmeFormatValid ? "✓ FORMAT OK" : "INVALID"}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="form-control font-mono"
                  placeholder="UDYAM-MH-12-0048192"
                  value={msmeNumber}
                  onChange={(e) => setMsmeNumber(e.target.value.toUpperCase())}
                />
                <div className="text-mono-xs text-muted mt-1">Pattern: UDYAM-XX-00-0000000</div>
              </div>

              {/* MSME Category */}
              <div className="col-md-4">
                <label className="form-label mb-1">MSME Enterprise Tier</label>
                <select
                  className="form-select font-mono-xs"
                  value={msmeCategory}
                  onChange={(e) => setMsmeCategory(e.target.value)}
                >
                  <option value="Not Applicable">Not Applicable / Non-MSME</option>
                  <option value="Micro">Micro (Inv &lt; ₹1 Cr &amp; TO &lt; ₹5 Cr)</option>
                  <option value="Small">Small (Inv &lt; ₹10 Cr &amp; TO &lt; ₹50 Cr)</option>
                  <option value="Medium">Medium (Inv &lt; ₹50 Cr &amp; TO &lt; ₹250 Cr)</option>
                </select>
              </div>

              {/* MSME Certificate Upload */}
              <div className="col-md-4">
                <label className="form-label mb-1">
                  Upload MSME Certificate
                </label>
                <div className="file-upload-zone">
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setMsmeCertificateFile(e.target.files[0] || null)}
                  />
                  <div className="text-mono-xs text-muted mt-1">
                    {msmeCertificateFile ? `Attached: ${msmeCertificateFile.name}` : "Accepted: PDF, PNG, JPG (Max 10MB)"}
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="col-md-6">
                <label className="form-label">Procurement Billing Email <span className="text-danger">*</span></label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="accounts@supplier.co.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Authorized Contact Phone <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control font-mono"
                  placeholder="+91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Plant / Manufacturing Yard Address <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Plot 42, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary-industrial"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary-industrial"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Uploading &amp; Verifying...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check me-1"></i>
                    Verify &amp; Onboard Supplier
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi-Facet Filter Bar */}
      <div className="vendor-filter-bar">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-lg-4 col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search vendor, GSTIN, PAN, Udyam, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-lg-2 col-md-3">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Category: Castings, Pipes..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
          <div className="col-lg-2 col-md-2">
            <select
              className="form-select form-select-sm font-mono-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Status: ALL</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-3">
            <select
              className="form-select form-select-sm font-mono-xs"
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
            >
              <option value="">Compliance: ALL</option>
              <option value="gst_verified">GST Verified</option>
              <option value="gst_pending">GST Audit Pending</option>
              <option value="msme_registered">MSME Registered</option>
              <option value="msme_verified">MSME Verified</option>
            </select>
          </div>
          <div className="col-lg-2 col-md-12 d-flex gap-2">
            <button type="submit" className="btn-primary-industrial flex-grow-1" style={{ padding: "5px 12px" }}>
              Filter
            </button>
            {(search || categoryFilter || statusFilter || complianceFilter) && (
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

      {/* Vendor Master Table */}
      <div className="vendor-grid-wrapper">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-secondary" role="status">
              <span className="visually-hidden">Loading registry...</span>
            </div>
          </div>
        ) : filteredVendors.length > 0 ? (
          <div className="table-responsive">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Vendor ID &amp; Supplier Name</th>
                  <th>Category</th>
                  <th>GSTIN &amp; State</th>
                  <th>MSME Udyam Tier</th>
                  <th>Primary Liaison</th>
                  <th>Lifecycle Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor, idx) => (
                  <tr
                    key={vendor._id}
                    className="vendor-table-row"
                    onClick={() => setActiveVendor(vendor)}
                    title="Click to inspect supplier statutory dossier"
                  >
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="vendor-avatar-tag">
                          {vendor.vendorName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold text-dark">{vendor.vendorName}</div>
                          <span className="text-mono-xs text-muted">
                            VND-{(idx + 1).toString().padStart(4, "0")} // Added by {vendor.createdBy?.name || "Procurement Desk"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="badge-industrial badge-hold">
                        {vendor.category}
                      </span>
                    </td>

                    <td>
                      <div>
                        <span className="font-mono text-dark fw-semibold">
                          {vendor.gstNumber}
                        </span>
                        <div className="d-flex align-items-center gap-1 mt-1">
                          {vendor.gstStateName && (
                            <span className="text-mono-xs text-muted">
                              {vendor.gstStateCode ? `[${vendor.gstStateCode}] ` : ""}{vendor.gstStateName}
                            </span>
                          )}
                          <span
                            className={`badge-industrial ${
                              vendor.gstVerificationStatus === "verified"
                                ? "badge-verified"
                                : vendor.gstVerificationStatus === "rejected"
                                ? "badge-risk"
                                : "badge-hold"
                            } py-0 px-1`}
                            style={{ fontSize: "0.65rem" }}
                          >
                            {vendor.gstVerificationStatus === "verified"
                              ? "GST VERIFIED"
                              : vendor.gstVerificationStatus === "rejected"
                              ? "GST REJECTED"
                              : "GST AUDIT DUE"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {vendor.msmeNumber ? (
                        <div>
                          <span className="badge-industrial badge-verified font-mono-xs">
                            {vendor.msmeCategory || "MSME"}
                          </span>
                          <div className="text-mono-xs font-mono text-muted mt-1">
                            {vendor.msmeNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-mono-xs text-muted">Non-MSME</span>
                      )}
                    </td>

                    <td>
                      <div className="small text-dark">{vendor.email}</div>
                      <div className="text-mono-xs text-muted font-mono">{vendor.phone}</div>
                    </td>

                    <td>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(vendor._id, vendor.status);
                        }}
                        className={`badge-industrial ${
                          vendor.status === "active"
                            ? "badge-verified"
                            : vendor.status === "inactive"
                            ? "badge-hold"
                            : "badge-risk"
                        }`}
                        title={user?.role === "admin" ? "Admin: Click to cycle status" : undefined}
                        style={{ cursor: user?.role === "admin" ? "pointer" : "default" }}
                      >
                        <i
                          className={`fa-solid ${
                            vendor.status === "active"
                              ? "fa-circle-check"
                              : vendor.status === "inactive"
                              ? "fa-pause"
                              : "fa-ban"
                          } me-1`}
                        ></i>
                        {vendor.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex align-items-center justify-content-end gap-2">
                        <button
                          onClick={() => setActiveVendor(vendor)}
                          className="btn btn-sm btn-link text-decoration-none p-1 text-muted"
                          title="Open Statutory Inspection Dossier"
                        >
                          <i className="fa-solid fa-arrow-right-to-bracket"></i>
                        </button>
                        {user?.role === "admin" && (
                          <button
                            onClick={(e) => handleDeleteVendor(vendor._id, e)}
                            className="btn btn-sm btn-link text-danger p-1"
                            title="Delete supplier record"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="fa-solid fa-box-archive fs-3 mb-2 d-block text-muted"></i>
            <p className="mb-1 fw-semibold text-dark">No supplier records match active search parameters.</p>
            <span className="text-mono-xs text-muted">TRY BROADENING THE CATEGORY, GSTIN, OR COMPLIANCE FILTER</span>
          </div>
        )}
      </div>

      {/* Slide-over Inspection Drawer */}
      {activeVendor && (
        <div className="slideover-overlay" onClick={() => setActiveVendor(null)}>
          <div className="slideover-panel" onClick={(e) => e.stopPropagation()}>
            <div className="slideover-header">
              <div>
                <span className="text-mono-xs text-muted">SUPPLIER DOSSIER // STATUTORY COMPLIANCE AUDIT</span>
                <h5 className="mb-0 fw-bold text-dark">{activeVendor.vendorName}</h5>
              </div>
              <button
                onClick={() => setActiveVendor(null)}
                className="btn btn-sm btn-link text-muted p-0 fs-5"
                title="Close Drawer [Esc]"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="slideover-body">
              {/* Status Header Cards */}
              <div className="row g-2 mb-3">
                <div className="col-4">
                  <div className="p-2 border rounded-1 bg-light text-center">
                    <span className="text-mono-xs text-muted d-block">OPERATIONS</span>
                    <span
                      className={`badge-industrial ${
                        activeVendor.status === "active"
                          ? "badge-verified"
                          : activeVendor.status === "inactive"
                          ? "badge-hold"
                          : "badge-risk"
                      }`}
                    >
                      {activeVendor.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-1 bg-light text-center">
                    <span className="text-mono-xs text-muted d-block">GST COMPLIANCE</span>
                    <span
                      className={`badge-industrial ${
                        activeVendor.gstVerificationStatus === "verified"
                          ? "badge-verified"
                          : activeVendor.gstVerificationStatus === "rejected"
                          ? "badge-risk"
                          : "badge-hold"
                      }`}
                    >
                      {activeVendor.gstVerificationStatus === "verified"
                        ? "VERIFIED"
                        : activeVendor.gstVerificationStatus === "rejected"
                        ? "REJECTED"
                        : "AUDIT DUE"}
                    </span>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded-1 bg-light text-center">
                    <span className="text-mono-xs text-muted d-block">MSME UDYAM</span>
                    <span
                      className={`badge-industrial ${
                        activeVendor.msmeVerificationStatus === "verified"
                          ? "badge-verified"
                          : activeVendor.msmeVerificationStatus === "rejected"
                          ? "badge-risk"
                          : activeVendor.msmeNumber
                          ? "badge-hold"
                          : "bg-secondary text-white"
                      }`}
                    >
                      {activeVendor.msmeNumber
                        ? activeVendor.msmeVerificationStatus === "verified"
                          ? "VERIFIED"
                          : activeVendor.msmeVerificationStatus === "rejected"
                          ? "REJECTED"
                          : "AUDIT DUE"
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specification Grid */}
              <h6 className="text-mono-xs text-muted mb-2">OPERATIONAL SPECIFICATIONS</h6>
              <div className="drawer-spec-grid">
                <span className="drawer-spec-label">GSTIN Tax ID</span>
                <span className="drawer-spec-val font-mono">{activeVendor.gstNumber}</span>

                <span className="drawer-spec-label">GST Jurisdiction</span>
                <span className="drawer-spec-val">
                  {activeVendor.gstStateName ? `[${activeVendor.gstStateCode || ""}] ${activeVendor.gstStateName}` : "Statutory Union / Center"}
                </span>

                <span className="drawer-spec-label">Corporate PAN</span>
                <span className="drawer-spec-val font-mono fw-bold">
                  {activeVendor.panNumber || (activeVendor.gstNumber?.length >= 12 ? activeVendor.gstNumber.substring(2, 12) : "N/A")}
                </span>

                <span className="drawer-spec-label">MSME Udyam ID</span>
                <span className="drawer-spec-val font-mono">
                  {activeVendor.msmeNumber || "Not Registered"}
                </span>

                <span className="drawer-spec-label">MSME Category</span>
                <span className="drawer-spec-val">
                  {activeVendor.msmeCategory || "Not Applicable"}
                </span>

                <span className="drawer-spec-label">Billing Email</span>
                <span className="drawer-spec-val">{activeVendor.email}</span>

                <span className="drawer-spec-label">Direct Phone</span>
                <span className="drawer-spec-val font-mono">{activeVendor.phone}</span>

                <span className="drawer-spec-label">Factory Address</span>
                <span className="drawer-spec-val">{activeVendor.address}</span>

                <span className="drawer-spec-label">Payment Terms</span>
                <span className="drawer-spec-val font-mono text-dark fw-bold">Net 30 Days (Direct NEFT/RTGS)</span>

                <span className="drawer-spec-label">Onboarded On</span>
                <span className="drawer-spec-val font-mono text-muted">
                  {new Date(activeVendor.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Statutory Documents Dossier */}
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="text-mono-xs text-muted mb-0">STATUTORY CERTIFICATE AUDIT DOSSIER</h6>
                  <span className="text-mono-xs text-muted">OFFICIAL PROOFS</span>
                </div>

                <div className="d-flex flex-column gap-3">
                  {/* GST Certificate Card */}
                  <div className="compliance-doc-card">
                    <div className="compliance-doc-header">
                      <div>
                        <div className="fw-bold text-dark small d-flex align-items-center gap-2">
                          <i className="fa-solid fa-file-invoice text-primary"></i>
                          GST Registration Certificate (Form REG-06)
                        </div>
                        <div className="text-mono-xs text-muted mt-1">
                          GSTIN: {activeVendor.gstNumber} // State: {activeVendor.gstStateName || "Registered"}
                        </div>
                      </div>
                      <span
                        className={`badge-industrial ${
                          activeVendor.gstVerificationStatus === "verified"
                            ? "badge-verified"
                            : activeVendor.gstVerificationStatus === "rejected"
                            ? "badge-risk"
                            : "badge-hold"
                        }`}
                      >
                        {activeVendor.gstVerificationStatus?.toUpperCase() || "PENDING"}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div className="text-mono-xs text-muted">
                        {activeVendor.gstVerifiedAt ? (
                          <>
                            <i className="fa-solid fa-user-check me-1"></i>
                            Audited by {activeVendor.gstVerifiedBy?.name || "Auditor"} on{" "}
                            {new Date(activeVendor.gstVerifiedAt).toLocaleDateString("en-IN")}
                            {activeVendor.gstVerificationRemarks && ` — "${activeVendor.gstVerificationRemarks}"`}
                          </>
                        ) : (
                          "Awaiting statutory compliance officer sign-off"
                        )}
                      </div>

                      {activeVendor.gstCertificate ? (
                        <button
                          type="button"
                          onClick={() => handleViewCertificate(activeVendor._id, "gst")}
                          className="btn-secondary-industrial"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          disabled={viewingDoc === "gst"}
                        >
                          {viewingDoc === "gst" ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                              Authenticating...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-shield-halved me-1 text-primary"></i>
                              View Certificate (Secure)
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-mono-xs text-muted italic">No file attached</span>
                      )}
                    </div>
                  </div>

                  {/* MSME Udyam Certificate Card */}
                  <div className="compliance-doc-card">
                    <div className="compliance-doc-header">
                      <div>
                        <div className="fw-bold text-dark small d-flex align-items-center gap-2">
                          <i className="fa-solid fa-building-shield text-success"></i>
                          MSME Udyam Registration Certificate
                        </div>
                        <div className="text-mono-xs text-muted mt-1">
                          {activeVendor.msmeNumber
                            ? `UDYAM ID: ${activeVendor.msmeNumber} // Tier: ${activeVendor.msmeCategory || "Micro"}`
                            : "Supplier has declared as Non-MSME / Large Enterprise"}
                        </div>
                      </div>
                      <span
                        className={`badge-industrial ${
                          activeVendor.msmeVerificationStatus === "verified"
                            ? "badge-verified"
                            : activeVendor.msmeVerificationStatus === "rejected"
                            ? "badge-risk"
                            : activeVendor.msmeNumber
                            ? "badge-hold"
                            : "bg-secondary text-white"
                        }`}
                      >
                        {activeVendor.msmeNumber
                          ? activeVendor.msmeVerificationStatus?.toUpperCase() || "PENDING"
                          : "NOT APPLICABLE"}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div className="text-mono-xs text-muted">
                        {activeVendor.msmeVerifiedAt ? (
                          <>
                            <i className="fa-solid fa-user-check me-1"></i>
                            Audited by {activeVendor.msmeVerifiedBy?.name || "Auditor"} on{" "}
                            {new Date(activeVendor.msmeVerifiedAt).toLocaleDateString("en-IN")}
                            {activeVendor.msmeVerificationRemarks && ` — "${activeVendor.msmeVerificationRemarks}"`}
                          </>
                        ) : activeVendor.msmeNumber ? (
                          "Awaiting MSME registry audit"
                        ) : (
                          "No statutory MSME certificate required"
                        )}
                      </div>

                      {activeVendor.msmeCertificate ? (
                        <button
                          type="button"
                          onClick={() => handleViewCertificate(activeVendor._id, "msme")}
                          className="btn-secondary-industrial"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          disabled={viewingDoc === "msme"}
                        >
                          {viewingDoc === "msme" ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                              Authenticating...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-shield-halved me-1 text-success"></i>
                              View Certificate (Secure)
                            </>
                          )}
                        </button>
                      ) : activeVendor.msmeNumber ? (
                        <span className="text-mono-xs text-muted italic">No file attached</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Audit Actions (Admin & Procurement Only) */}
              {["admin", "procurement"].includes(user?.role) && (
                <div className="compliance-audit-box">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0 text-dark small">
                      <i className="fa-solid fa-stamp text-secondary me-2"></i>
                      Statutory Compliance Audit Sign-off
                    </h6>
                    <span className="text-mono-xs text-muted">OFFICIAL RECORD</span>
                  </div>

                  <form onSubmit={handleVerifyCompliance}>
                    <div className="row g-2 mb-2">
                      <div className="col-md-6">
                        <label className="text-mono-xs text-muted d-block mb-1">AUDIT SCOPE</label>
                        <select
                          className="form-select form-select-sm font-mono-xs"
                          value={auditTarget}
                          onChange={(e) => setAuditTarget(e.target.value)}
                        >
                          <option value="gst">GSTIN Registration Form</option>
                          <option value="msme" disabled={!activeVendor.msmeNumber}>
                            MSME Udyam Registration {activeVendor.msmeNumber ? "" : "(Not Available)"}
                          </option>
                          <option value="all">Comprehensive (Both GST &amp; MSME)</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="text-mono-xs text-muted d-block mb-1">AUDIT DECISION</label>
                        <select
                          className="form-select form-select-sm font-mono-xs"
                          value={auditStatus}
                          onChange={(e) => setAuditStatus(e.target.value)}
                        >
                          <option value="verified">Approve / Verified</option>
                          <option value="rejected">Reject Statutory Document</option>
                          <option value="pending_verification">Set to Audit Due / Pending</option>
                        </select>
                      </div>

                      <div className="col-12 mt-2">
                        <label className="text-mono-xs text-muted d-block mb-1">AUDIT LOG REMARKS</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Validated with GSTN portal and matched CIN/PAN"
                          value={auditRemarks}
                          onChange={(e) => setAuditRemarks(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-end mt-3">
                      <button
                        type="submit"
                        className="btn-primary-industrial"
                        style={{ padding: "5px 14px", fontSize: "0.78rem" }}
                        disabled={isAuditing}
                      >
                        {isAuditing ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                            Signing off...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-file-signature me-1"></i>
                            Execute Compliance Audit
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div className="slideover-footer">
              {user?.role === "admin" && (
                <button
                  onClick={() => handleStatusChange(activeVendor._id, activeVendor.status)}
                  className="btn-secondary-industrial"
                >
                  <i className="fa-solid fa-arrows-rotate me-1"></i>
                  Cycle Operational Status
                </button>
              )}
              <button
                onClick={() => setActiveVendor(null)}
                className="btn-primary-industrial"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
