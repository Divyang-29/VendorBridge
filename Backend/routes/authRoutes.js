const express = require("express");

const {
  register,
  login,
  getProfile,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updateProfile,
  getManagers
} = require("../controllers/authController");

const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);


const upload = require("../middlewares/uploadMiddleware");

router.get("/profile", authMiddleware, getProfile);

router.put("/profile", authMiddleware, upload.single("profileImage"), updateProfile);

router.get("/managers", authMiddleware, getManagers);

router.post("/forgot-password", forgotPassword);

router.post("/verify-otp", verifyOtp);

router.post("/reset-password", resetPassword);

module.exports = router;
