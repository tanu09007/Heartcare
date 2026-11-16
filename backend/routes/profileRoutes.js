
const express = require("express");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Get own profile
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.status(200).json({
      user
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to retrieve profile."
    });
  }
});

// Update own profile
router.put("/me", async (req, res) => {
  try {
    const { fullName, phone, age, gender } = req.body;

    const updates = {};

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty."
        });
      }

      updates.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      updates.phone = phone;
    }

    if (age !== undefined) {
      const numericAge = Number(age);

      if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
        return res.status(400).json({
          message: "Enter a valid age."
        });
      }

      updates.age = numericAge;
    }

    if (gender !== undefined) {
      if (!["Male", "Female", "Other"].includes(gender)) {
        return res.status(400).json({
          message: "Invalid gender."
        });
      }

      updates.gender = gender;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      user
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to update profile."
    });
  }
});

module.exports = router;
