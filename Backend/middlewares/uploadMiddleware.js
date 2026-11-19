const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure base uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurable compliance upload directory helper (auto-creates recursively if missing)
const getComplianceUploadDir = () => {
  const dir = process.env.COMPLIANCE_UPLOAD_DIR
    ? path.resolve(process.env.COMPLIANCE_UPLOAD_DIR)
    : path.join(__dirname, "../uploads/compliance");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Initial directory check on module load
getComplianceUploadDir();

// Multer storage config for general non-sensitive files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Multer storage config for sensitive statutory compliance certificates
const complianceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getComplianceUploadDir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "compliance-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter (documents, PDFs, images)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format. Please upload PDF, PNG, or JPG documents."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const complianceUpload = multer({
  storage: complianceStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

module.exports = upload;
module.exports.complianceUpload = complianceUpload;
module.exports.getComplianceUploadDir = getComplianceUploadDir;
