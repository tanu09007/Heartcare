
const mongoose = require("mongoose");

const woundImageSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    imagePath: {
      type: String,
      required: true
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("WoundImage", woundImageSchema);
