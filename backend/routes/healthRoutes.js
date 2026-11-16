

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const crypto = require("crypto");

const HealthRecord = require("../models/HealthRecord");
const WoundImage = require("../models/WoundImage");
const DoctorNote = require("../models/DoctorNote");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Role protection
const patientOnly = (req, res, next) => {
  if (req.user.role !== "patient") {
    return res.status(403).json({
      message: "Only patients can perform this action."
    });
  }

  next();
};

const doctorOnly = (req, res, next) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({
      message: "Only doctors can perform this action."
    });
  }

  next();
};

// Validate patient ID
const validPatientId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ===============================
// PATIENT HEALTH RECORDS
// ===============================

// Save blood pressure
router.post("/blood-pressure", patientOnly, async (req, res) => {
  try {
    const { systolic, diastolic } = req.body;

    const upper = Number(systolic);
    const lower = Number(diastolic);

    if (
      systolic === "" ||
      diastolic === "" ||
      systolic === undefined ||
      diastolic === undefined ||
      !Number.isFinite(upper) ||
      !Number.isFinite(lower) ||
      upper <= 0 ||
      lower <= 0 ||
      upper <= lower
    ) {
      return res.status(400).json({
        message: "Enter valid blood pressure values."
      });
    }

    const record = await HealthRecord.create({
      patientId: req.user.userId,
      bloodPressure: {
        systolic: upper,
        diastolic: lower
      }
    });

    res.status(201).json({
      message: "Blood pressure saved successfully!",
      record
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to save blood pressure."
    });
  }
});

// Save heart rate
router.post("/heart-rate", patientOnly, async (req, res) => {
  try {
    const heartRate = Number(req.body.heartRate);

    if (
      req.body.heartRate === "" ||
      req.body.heartRate === undefined ||
      !Number.isFinite(heartRate) ||
      heartRate <= 0 ||
      heartRate > 300
    ) {
      return res.status(400).json({
        message: "Enter a valid heart rate."
      });
    }

    const record = await HealthRecord.create({
      patientId: req.user.userId,
      heartRate
    });

    res.status(201).json({
      message: "Heart rate saved successfully!",
      record
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to save heart rate."
    });
  }
});

// Save weight
router.post("/weight", patientOnly, async (req, res) => {
  try {
    const weight = Number(req.body.weight);

    if (
      req.body.weight === "" ||
      req.body.weight === undefined ||
      !Number.isFinite(weight) ||
      weight <= 0 ||
      weight > 500
    ) {
      return res.status(400).json({
        message: "Enter a valid weight in kilograms."
      });
    }

    const record = await HealthRecord.create({
      patientId: req.user.userId,
      weight
    });

    res.status(201).json({
      message: "Weight saved successfully!",
      record
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to save weight."
    });
  }
});

// Get patient's health history
router.get("/history", patientOnly, async (req, res) => {
  try {
    const records = await HealthRecord.find({
      patientId: req.user.userId
    }).sort({ recordedAt: -1 });

    res.status(200).json({ records });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to retrieve health history."
    });
  }
});

// ===============================
// WOUND PHOTO UPLOAD
// ===============================

const uploadDirectory = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG and WEBP images are allowed.")
      );
    }

    cb(null, true);
  }
});

// Upload wound photo
router.post(
  "/wound-photo",
  patientOnly,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a photo."
        });
      }

      const woundImage = await WoundImage.create({
        patientId: req.user.userId,
        imagePath: `/uploads/${req.file.filename}`,
        notes: req.body.notes || ""
      });

      res.status(201).json({
        message: "Wound photo uploaded successfully.",
        woundImage
      });
    } catch (error) {
      console.error(error);

      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }

      res.status(500).json({
        message: "Unable to upload wound photo."
      });
    }
  }
);

// Patient gets their wound photos
router.get("/wound-photos", patientOnly, async (req, res) => {
  try {
    const photos = await WoundImage.find({
      patientId: req.user.userId
    }).sort({ uploadedAt: -1 });

    res.status(200).json({ photos });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to retrieve wound photos."
    });
  }
});

// Patient securely views their own photo
router.get(
  "/wound-photo/:id/image",
  patientOnly,
  async (req, res) => {
    try {
      const woundImage = await WoundImage.findOne({
        _id: req.params.id,
        patientId: req.user.userId
      });

      if (!woundImage) {
        return res.status(404).json({
          message: "Wound photo not found."
        });
      }

      const filename = path.basename(woundImage.imagePath);
      const imageFile = path.join(uploadDirectory, filename);

      if (!fs.existsSync(imageFile)) {
        return res.status(404).json({
          message: "Image file not found."
        });
      }

      return res.sendFile(imageFile);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Unable to display wound photo."
      });
    }
  }
);

// ===============================
// DOCTOR DASHBOARD
// ===============================

// Get all registered patients
router.get("/doctor/patients", doctorOnly, async (req, res) => {
  try {
    const patients = await User.find({
      role: "patient"
    }).select("fullName email phone age gender createdAt");

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

// Get one patient's details
router.get(
  "/doctor/patients/:patientId",
  doctorOnly,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      if (!validPatientId(patientId)) {
        return res.status(400).json({
          message: "Invalid patient ID."
        });
      }

      const patient = await User.findOne({
        _id: patientId,
        role: "patient"
      }).select("fullName email phone age gender createdAt");

      if (!patient) {
        return res.status(404).json({
          message: "Patient not found."
        });
      }

      res.status(200).json({ patient });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Unable to retrieve patient details."
      });
    }
  }
);

// Get a patient's health history
router.get(
  "/doctor/patients/:patientId/health-history",
  doctorOnly,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      if (!validPatientId(patientId)) {
        return res.status(400).json({
          message: "Invalid patient ID."
        });
      }

      const patient = await User.findOne({
        _id: patientId,
        role: "patient"
      });

      if (!patient) {
        return res.status(404).json({
          message: "Patient not found."
        });
      }

      const records = await HealthRecord.find({
        patientId
      }).sort({ recordedAt: -1 });

      res.status(200).json({ records });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Unable to retrieve health history."
      });
    }
  }
);

// Get a patient's wound photos
router.get(
  "/doctor/patients/:patientId/wound-photos",
  doctorOnly,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      if (!validPatientId(patientId)) {
        return res.status(400).json({
          message: "Invalid patient ID."
        });
      }

      const patient = await User.findOne({
        _id: patientId,
        role: "patient"
      });

      if (!patient) {
        return res.status(404).json({
          message: "Patient not found."
        });
      }

      const photos = await WoundImage.find({
        patientId
      }).sort({ uploadedAt: -1 });

      res.status(200).json({ photos });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Unable to retrieve wound photos."
      });
    }
  }
);

// Doctor securely views a patient's wound photo
router.get(
  "/doctor/wound-photo/:id/image",
  doctorOnly,
  async (req, res) => {
    try {
      const woundImage = await WoundImage.findById(req.params.id);

      if (!woundImage) {
        return res.status(404).json({
          message: "Wound photo not found."
        });
      }

      const filename = path.basename(woundImage.imagePath);
      const imageFile = path.join(uploadDirectory, filename);

      if (!fs.existsSync(imageFile)) {
        return res.status(404).json({
          message: "Image file not found."
        });
      }

      return res.sendFile(imageFile);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Unable to display wound photo."
      });
    }
  }
);

// ===============================
// DOCTOR NOTES
// ===============================

// Add a note for a patient
router.post(
  "/doctor/patients/:patientId/notes",
  doctorOnly,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { note } = req.body;

      if (!validPatientId(patientId)) {
        return res.status(400).json({
          message: "Invalid patient ID."
        });
      }

      if (!note || typeof note !== "string" || !note.trim()) {
        return res.status(400).json({
          message: "Please enter a doctor note."
        });
      }

      if (note.trim().length > 3000) {
        return res.status(400).json({
          message: "Doctor note cannot exceed 3000 characters."
        });
      }

      const patient = await User.findOne({
        _id: patientId,
        role: "patient"
      });

      if (!patient) {
        return res.status(404).json({
          message: "Patient not found."
        });
      }

      const doctorNote = await DoctorNote.create({
        patientId,
        doctorId: req.user.userId,
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
  }
);

// Get notes for a patient
router.get(
  "/doctor/patients/:patientId/notes",
  doctorOnly,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      if (!validPatientId(patientId)) {
        return res.status(400).json({
          message: "Invalid patient ID."
        });
      }

      const patient = await User.findOne({
        _id: patientId,
        role: "patient"
      });

      if (!patient) {
        return res.status(404).json({
          message: "Patient not found."
        });
      }

      const notes = await DoctorNote.find({
        patientId
      })
        .populate("doctorId", "fullName")
        .sort({ createdAt: -1 });

      res.status(200).json({ notes });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Unable to retrieve doctor notes."
      });
    }
  }
);

module.exports = router;
