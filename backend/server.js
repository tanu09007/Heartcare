
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const profileRoutes = require("./routes/profileRoutes");

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to HeartCare Healthcare System!");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/profile", profileRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found."
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || "Internal server error."
  });
});

const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`HeartCare server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Unable to start HeartCare:", error.message);
    process.exit(1);
  }
};

startServer();
