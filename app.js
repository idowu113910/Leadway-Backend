require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoute = require("./routes/auth");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const allowedOrigins = [
  "https://leadway-frontend-yqdj.vercel.app",
  ...(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      } else {
        console.error(`CORS blocked origin: ${origin}`);
        return callback(null, false);
      }
    },
    credentials: true,
  }),
);

// Routes
app.use("/api/auth", authRoute);
app.get("/", (req, res) => res.send("API running"));

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Database connected");

    const server = app.listen(PORT, () => {
      console.log(`Server is running on PORT ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Closing server and DB connection...`);
      await mongoose.disconnect();
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
};

start();
