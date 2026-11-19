const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    gstNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },

    gstStateCode: {
      type: String,
      trim: true,
    },

    gstStateName: {
      type: String,
      trim: true,
    },

    gstCertificate: {
      type: String,
      trim: true,
    },

    gstVerificationStatus: {
      type: String,
      enum: ["verified", "pending_verification", "rejected"],
      default: "pending_verification",
    },

    gstVerifiedAt: {
      type: Date,
    },

    gstVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    gstVerificationRemarks: {
      type: String,
      trim: true,
    },

    msmeNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },

    msmeCategory: {
      type: String,
      enum: ["Micro", "Small", "Medium", "Not Applicable"],
      default: "Not Applicable",
    },

    msmeCertificate: {
      type: String,
      trim: true,
    },

    msmeVerificationStatus: {
      type: String,
      enum: ["verified", "pending_verification", "rejected"],
      default: "pending_verification",
    },

    msmeVerifiedAt: {
      type: Date,
    },

    msmeVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    msmeVerificationRemarks: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blacklisted"],
      default: "active",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Vendor", vendorSchema);
