import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("vendor");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await register(name, email, password, role);
      if (res.success) {
        navigate("/");
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Failed to create account. Please check credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-logo">VendorBridge</h2>
          <p className="auth-subtitle">Procurement & Vendor Management ERP</p>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <h4 className="fw-bold mb-4">Create Account</h4>

          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="john@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Select Workspace Role</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="vendor">Vendor Partner (Submit Quotes & Invoices)</option>
              <option value="procurement">Procurement Officer (Create RFQs & POs)</option>
              <option value="manager">Manager / Approver (Review Workflows)</option>
              <option value="admin">System Admin (Full Access)</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary-custom w-100 mt-2"
            disabled={loading}
          >
            {loading ? "Registering account..." : "Sign Up"}
          </button>

          <p className="text-center text-muted small mt-4 mb-0">
            Already have an account?{" "}
            <Link to="/login" className="auth-switch-link">
              Log in instead
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
