import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const Login = () => {
  const { login, forgotPassword, verifyOtp, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Mode: "login", "forgot", "otp", "reset"
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate("/");
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setMessage("OTP has been emailed to you!");
        setMode("otp");
      } else {
        setError(res.message || "Failed to trigger OTP.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await verifyOtp(email, otp);
      if (res.success) {
        setMessage("OTP verified successfully. Create your new password.");
        setMode("reset");
      } else {
        setError(res.message || "Invalid or expired OTP.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await resetPassword(email, otp, newPassword);
      if (res.success) {
        setMessage("Password updated successfully. Please login with your new credentials.");
        setMode("login");
        setPassword("");
        setNewPassword("");
        setOtp("");
      } else {
        setError(res.message || "Password reset failed.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
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
        {message && <div className="alert alert-success py-2 small">{message}</div>}

        {/* --- Mode: Login --- */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <h4 className="fw-bold mb-4">Login</h4>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0">Password</label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="btn btn-link p-0 forgot-link"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary-custom w-100 mt-2"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
            <p className="text-center text-muted small mt-4 mb-0">
              New to the platform?{" "}
              <Link to="/signup" className="auth-switch-link">
                Create an account
              </Link>
            </p>
          </form>
        )}

        {/* --- Mode: Forgot Password --- */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="auth-form">
            <h4 className="fw-bold mb-3">Forgot Password</h4>
            <p className="text-muted small mb-4">
              Enter your email address and we'll send you a 6-digit verification code.
            </p>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary-custom w-100 mt-2"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Verification OTP"}
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="btn btn-secondary-custom w-100 mt-2"
            >
              Back to Login
            </button>
          </form>
        )}

        {/* --- Mode: Verify OTP --- */}
        {mode === "otp" && (
          <form onSubmit={handleOtpSubmit} className="auth-form">
            <h4 className="fw-bold mb-3">Verify OTP</h4>
            <p className="text-muted small mb-4">
              A 6-digit OTP code was sent to <strong>{email}</strong>.
            </p>
            <div className="mb-3">
              <label className="form-label">Enter 6-Digit OTP</label>
              <input
                type="text"
                className="form-control text-center fs-4 letter-spacing-lg"
                maxLength="6"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary-custom w-100 mt-2"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP Code"}
            </button>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="btn btn-link w-100 text-center text-muted small mt-3"
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* --- Mode: Reset Password --- */}
        {mode === "reset" && (
          <form onSubmit={handleResetSubmit} className="auth-form">
            <h4 className="fw-bold mb-3">Reset Password</h4>
            <p className="text-muted small mb-4">
              Enter a new secure password for your account.
            </p>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary-custom w-100 mt-2"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save New Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
