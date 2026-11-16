
const express = require("express");

const User = require("../models/user");
const HealthRecord = require("../models/HealthRecord");
const WoundImage = require("../models/WoundImage");
const DoctorNote = require("../models/DoctorNote");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Doctor-only protection
router.use((req, res, next) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      message: "Doctor access only."
    });
  }

  next();
});

// Check that a patient is assigned to this doctor
const checkAssignedPatient = async (doctorId, patientId) => {
  return User.findOne({
    _id: patientId,
    role: "patient",
    assignedDoctor: doctorId
  });
};

// Get assigned patients
router.get("/patients", async (req, res) => {
  try {
    const patients = await User.find({
      role: "patient",
      assignedDoctor: req.user.userId
    }).select("-password");

    res.status(200).json({
      patients
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to retrieve patients."
    });
  }
});

// Get one patient's health records
router.get("/patients/:patientId/records", async (req, res) => {
  try {
    const patient = await checkAssignedPatient(
      req.user.userId,
      req.params.patientId
    );

    if (!patient) {
      return res.status(404).json({
        message: "Assigned patient not found."
      });
    }

    const records = await HealthRecord.find({
      patientId: patient._id
    }).sort({ recordedAt: -1 });

    res.status(200).json({
      patient: {
        id: patient._id,
        fullName: patient.fullName,
        email: patient.email
      },
      records
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to retrieve health records."
    });
  }
});

// Get one patient's wound photos
router.get("/patients/:patientId/wound-photos", async (req, res) => {
  try {
    const patient = await checkAssignedPatient(
      req.user.userId,
      req.params.patientId
    );

    if (!patient) {
      return res.status(404).json({
        message: "Assigned patient not found."
      });
    }

    const photos = await WoundImage.find({
      patientId: patient._id
    }).sort({ uploadedAt: -1 });

    res.status(200).json({
      photos
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to retrieve wound photos."
    });
  }
});

// Add doctor note
router.post("/patients/:patientId/notes", async (req, res) => {
  try {
    const patient = await checkAssignedPatient(
      req.user.userId,
      req.params.patientId
    );

    if (!patient) {
      return res.status(404).json({
        message: "Assigned patient not found."
      });
    }

    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        message: "Please enter a note."
      });
    }

    const doctorNote = await DoctorNote.create({
      doctorId: req.user.userId,
      patientId: patient._id,
      note: note.trim()
    });

    res.status(201).json({
      message: "Doctor note saved successfully.",
      doctorNote
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to save doctor note."
    });
  }
});

// Get notes for an assigned patient
router.get("/patients/:patientId/notes", async (req, res) => {
  try {
    const patient = await checkAssignedPatient(
      req.user.userId,
      req.params.patientId
    );

    if (!patient) {
      return res.status(404).json({
        message: "Assigned patient not found."
      });
    }

    const notes = await DoctorNote.find({
      doctorId: req.user.userId,
      patientId: patient._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      notes
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to retrieve doctor notes."
    });
  }
});

module.exports = router;
