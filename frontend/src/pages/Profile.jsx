import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
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
    return `http://localhost:8080/uploads/${filename}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create local object URL for instant preview
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
      // Use FormData to support binary file upload for profile image
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
        setSuccessMsg("Your profile details have been updated successfully!");
        setImageFile(null); // Clear pending file upload
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
      <div className="row g-4">
        
        {/* Left Side: Avatar Card */}
        <div className="col-lg-4">
          <div className="glass-panel text-center p-4 h-100 d-flex flex-column align-items-center justify-content-center">
            <h5 className="fw-bold mb-4 text-muted">User Account Summary</h5>
            
            <div className="profile-image-container mb-3" onClick={triggerFileInput}>
              {imagePreview ? (
                <img src={imagePreview} alt="User Avatar" className="profile-image-preview" />
              ) : (
                <div className="profile-initials-preview">{getInitials()}</div>
              )}
              <div className="avatar-edit-overlay">
                <i className="fa-solid fa-camera"></i>
                <span>Change Photo</span>
              </div>
            </div>

            {/* Hidden Input File */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: "none" }} 
              accept="image/*"
            />

            <h4 className="fw-bold mb-1">{name || "N/A"}</h4>
            <span className="badge bg-primary-subtle text-primary mb-3 px-3 py-2 text-uppercase fs-6">
              {user?.role}
            </span>
            <p className="text-muted small mb-0">{user?.email}</p>
            
            {imageFile && (
              <div className="alert alert-info py-1 px-3 mt-3 mb-0 small">
                New avatar selected! Click "Save Changes" below to upload.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Edit Form */}
        <div className="col-lg-8">
          <div className="glass-panel p-4">
            <h5 className="fw-bold mb-4 text-primary">
              <i className="fa-solid fa-user-pen me-2"></i> Update Profile Details
            </h5>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}

            <form onSubmit={handleFormSubmit}>
              
              {/* Row 1: General Info */}
              <div className="row g-3 mb-4">
                <h6 className="fw-bold text-dark border-bottom pb-2">Account Info</h6>
                <div className="col-md-6">
                  <label className="form-label small text-muted">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small text-muted">Email Address (Read-only)</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={user?.email || ""}
                    disabled
                  />
                </div>
              </div>

              {/* Row 2: Personal details */}
              <div className="row g-3 mb-4">
                <h6 className="fw-bold text-dark border-bottom pb-2">Personal & Contact Details</h6>
                <div className="col-md-4">
                  <label className="form-label small text-muted">First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-muted">Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-muted">Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Address details */}
              <div className="row g-3 mb-4">
                <h6 className="fw-bold text-dark border-bottom pb-2">Business / Personal Location Address</h6>
                <div className="col-12">
                  <label className="form-label small text-muted">Address Lane</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Street name, office suite, sector..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-muted">City</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="City / District"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-muted">State / Region</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small text-muted">Country</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="India"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 4: Bio / Extra Details */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark border-bottom pb-2">Additional Information</h6>
                <label className="form-label small text-muted">Organization / Vendor Biography</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Provide any additional vendor profile details, certifications, registrations, or summary descriptions..."
                  value={additionalInformation}
                  onChange={(e) => setAdditionalInformation(e.target.value)}
                ></textarea>
              </div>

              <div className="d-flex justify-content-end mt-4">
                <button
                  type="submit"
                  className="btn btn-primary-custom px-5 py-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
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
