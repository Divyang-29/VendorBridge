// Load environment configuration at the earliest startup lifecycle
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const rfqRoutes = require("./routes/rfqRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const poRoutes = require("./routes/poRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const activityRoutes = require("./routes/activityRoutes");

const { authLimiter, generalApiLimiter } = require("./middlewares/rateLimiters");

const app = express();

// Trust reverse proxy (e.g. Nginx, Cloudflare, AWS ALB)
// Trusts only the first hop (the reverse proxy) to read accurate client IPs for rate-limiting
app.set("trust proxy", 1);

// Normalize and parse CORS origins (trims trailing slashes for exact origin matching)
const rawCorsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const allowedOrigins = rawCorsOrigin
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, CLI, monitoring probes) without origin header
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.trim().replace(/\/+$/, "");
    if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Security Hardening with Helmet
// CSP configured to allow blob previews ('blob:'), cross-origin asset loading, and fonts/styles
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", ...allowedOrigins],
        frameSrc: ["'self'", "blob:", ...allowedOrigins],
        connectSrc: ["'self'", "blob:", ...allowedOrigins],
        mediaSrc: ["'self'", "blob:", ...allowedOrigins],
        objectSrc: ["'self'", "blob:"], // Allows browser PDF viewer rendering in blob: URLs
        fontSrc: ["'self'", "https:", "data:"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json());

// Apply global rate limiting across /api endpoints
app.use("/api", generalApiLimiter);

// Block public direct unauthenticated access to compliance certificates
app.use("/uploads/compliance", (req, res) => {
  res.status(403).json({
    success: false,
    message: "Direct access to statutory compliance certificates is forbidden. Access via authenticated /api/vendors/:id/certificate/:type.",
  });
});

// Serve non-sensitive public uploads (e.g. user profile photos)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Authenticated Routes with dedicated rate limiting
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/rfqs", rfqRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/purchase-orders", poRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/activities", activityRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("VendorBridge API Running...");
});

const PORT = process.env.PORT || 5055;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
