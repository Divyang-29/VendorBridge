import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { BASE_URL } from "../utils/api";
import "./Profile.css";

const Profile = () => {
  const { user, updateProfile } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [additionalInformation, setAdditionalInformation] = useState("");
  
  // File upload states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sync state with user context when loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setFirstName(user.profile?.firstName || "");
      setLastName(user.profile?.lastName || "");
      setPhone(user.profile?.phone || "");
      setCountry(user.profile?.country || "");
      setState(user.profile?.state || "");
      setCity(user.profile?.city || "");
      setAddress(user.profile?.address || "");
      setAdditionalInformation(user.profile?.additionalInformation || "");
      
      if (user.profile?.profileImage) {
        setImagePreview(getProfileImageUrl(user.profile.profileImage));
      }
    }
  }, [user]);

  const getProfileImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    const filename = imagePath.split("/").pop().split("\\").pop();
    const serverOrigin = BASE_URL.replace("/api", "");
    return `${serverOrigin}/uploads/${filename}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("phone", phone);
      formData.append("country", country);
      formData.append("state", state);
      formData.append("city", city);
      formData.append("address", address);
      formData.append("additionalInformation", additionalInformation);
      
      if (imageFile) {
        formData.append("profileImage", imageFile);
      }

      const res = await updateProfile(formData);
      if (res.success) {
        setSuccessMsg("Account credentials & location metadata updated successfully.");
        setImageFile(null);
      } else {
        setError(res.message || "Failed to update profile details.");
      }
    } catch (err) {
      setError(err.message || "An error occurred while updating profile.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (!name) return "US";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="row g-3">
        
        {/* Left Side: Avatar Card */}
        <div className="col-lg-4">
          <div className="profile-avatar-card d-flex flex-column align-items-center justify-content-center">
            <span className="text-mono-xs text-muted mb-3">SYSTEM CREDENTIALS</span>
            
            <div className="profile-image-container" onClick={triggerFileInput} title="Click to upload badge photo">
              {imagePreview ? (
                <img src={imagePreview} alt="User Avatar" className="profile-image-preview" />
              ) : (
                <div className="profile-initials-preview">{getInitials()}</div>
              )}
              <div className="avatar-edit-overlay">
                <i className="fa-solid fa-camera"></i>
                <span>Update Photo</span>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: "none" }} 
              accept="image/*"
            />

            <h5 className="fw-bold mb-1 text-dark">{name || "Authorized User"}</h5>
            <span className="badge-industrial badge-accent mb-2">
              [{user?.role?.toUpperCase()}]
            </span>
            <span className="text-mono-xs text-muted font-mono">{user?.email}</span>
            
            {imageFile && (
              <div className="p-2 mt-3 bg-light border rounded-1 small text-dark">
                <i className="fa-solid fa-file-image me-1 text-muted"></i>
                Staged file ready. Click "Save Dossier" below.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Edit Form */}
        <div className="col-lg-8">
          <div className="profile-edit-card">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <span className="text-mono-xs text-muted d-block">ORGANIZATIONAL REGISTRY</span>
                <h6 className="fw-bold mb-0 text-dark">User Identity & Statutory Address</h6>
              </div>
              <span className="text-mono-xs text-muted">ID: {user?._id?.substring(18).toUpperCase()}</span>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center mb-3">
                <span><i className="fa-solid fa-circle-exclamation me-2"></i>{error}</span>
                <button onClick={() => setError("")} className="btn-close btn-close-white" style={{ fontSize: "0.65rem" }}></button>
              </div>
            )}
            {successMsg && (
              <div className="alert alert-success py-2 px-3 small border-0 rounded-1 d-flex justify-content-between align-items-center mb-3">
                <span><i className="fa-solid fa-circle-check me-2"></i>{successMsg}</span>
                <button onClick={() => setSuccessMsg("")} className="btn-close" style={{ fontSize: "0.65rem" }}></button>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              
              {/* Account Info */}
              <div className="row g-2 mb-3">
                <span className="text-mono-xs text-muted d-block">PRIMARY USER ATTRIBUTES</span>
                <div className="col-md-6">
                  <label className="form-label small">Display Full Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Corporate Email (Immutable)</label>
                  <input
                    type="email"
                    className="form-control form-control-sm bg-light text-muted font-mono"
                    value={user?.email || ""}
                    disabled
                  />
                </div>
              </div>

              {/* Personal details */}
              <div className="row g-2 mb-3 pt-2 border-top">
                <span className="text-mono-xs text-muted d-block">CONTACT LIAISON</span>
                <div className="col-md-4">
                  <label className="form-label small">First Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">Last Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">Direct Phone</label>
                  <input
                    type="text"
                    className="form-control form-control-sm font-mono"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Address details */}
              <div className="row g-2 mb-3 pt-2 border-top">
                <span className="text-mono-xs text-muted d-block">OFFICIAL BUSINESS ADDRESS</span>
                <div className="col-12">
                  <label className="form-label small">Street Address / Facility Lane</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Plot / Sector / Tower details"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">City</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">State / Province</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">Country</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="India"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              {/* Bio / Extra Details */}
              <div className="mb-3 pt-2 border-top">
                <span className="text-mono-xs text-muted d-block mb-1">COMPLIANCE & PROFILE BIOGRAPHY</span>
                <textarea
                  className="form-control form-control-sm"
                  rows="3"
                  placeholder="Operational scope, factory accreditations, or authorized procurement roles..."
                  value={additionalInformation}
                  onChange={(e) => setAdditionalInformation(e.target.value)}
                ></textarea>
              </div>

              <div className="d-flex justify-content-end pt-2 border-top">
                <button
                  type="submit"
                  className="btn-primary-industrial px-4"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Dossier Details"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
