// app.js
require("dotenv").config(); // <- load .env first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoute = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow JSON + urlencoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow frontend origin from .env, fallback to localhost:5173
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN || "https://leadway-frontend-yqdj.vercel.app/",
    // credentials: true, // uncomment if you use cookies/auth that require credentials
  })
);

// Routes
app.use("/api/auth", authRoute);

// Basic health route
app.get("/", (req, res) => res.send("API running"));

// Start function
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Database connected");

    const server = app.listen(PORT, () => {
      console.log(`Server is running on PORT ${PORT}`);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("SIGINT received. Closing server and DB connection...");
      await mongoose.disconnect();
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
};

start();
