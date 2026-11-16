
const mongoose = require("mongoose");

const healthRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },

    heartRate: {
      type: Number
    },

    weight: {
      type: Number
    },

    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("HealthRecord", healthRecordSchema);

