const rateLimit = require("express-rate-limit");

/**
 * Rate limiters configured for sensitive enterprise procurement operations.
 */

// Strict limiter for authentication endpoints (prevents credential brute-forcing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // max 50 auth attempts per IP per window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests from this IP address. Please try again after 15 minutes.",
  },
});

// Limiter for vendor creation & document uploads (prevents storage DOS and scraping)
const vendorUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 40, // max 40 vendor creation/upload requests per IP
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many vendor onboarding and document upload requests. Please try again later.",
  },
});

// Limiter for statutory compliance verification audits (prevents tampering and rapid state mutation)
const complianceVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // max 100 audit sign-offs per window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Compliance audit submission limit reached. Please try again later.",
  },
});

// General application limiter
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Global API request threshold reached. Please wait before retrying.",
  },
});

module.exports = {
  authLimiter,
  vendorUploadLimiter,
  complianceVerificationLimiter,
  generalApiLimiter,
};
