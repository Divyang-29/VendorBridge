const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "procurement", "manager", "vendor"],
      default: "vendor",
    },

    profile: {
      firstName: {
        type: String,
        trim: true,
        default: "",
      },

      lastName: {
        type: String,
        trim: true,
        default: "",
      },

      phone: {
        type: String,
        default: "",
      },

      country: {
        type: String,
        default: "",
      },

      state: {
        type: String,
        default: "",
      },

      city: {
        type: String,
        default: "",
      },

      address: {
        type: String,
        default: "",
      },

      additionalInformation: {
        type: String,
        default: "",
      },

      profileImage: {
        type: String,
        default: "",
      },
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpiry: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
