require("dotenv").config(); // Load environment variables first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoute = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow JSON + urlencoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow multiple origins (local + deployed frontend)
const allowedOrigins = [
  // local frontend (Vite)
  process.env.CORS_ORIGIN || "https://leadway-frontend-yqdj.vercel.app", // deployed frontend, NO trailing slash
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman) or if origin is in allowedOrigins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true, // enable if you plan to use cookies/auth headers
  })
);

// Routes
app.use("/api/auth", authRoute);

// Basic health route
app.get("/", (req, res) => res.send("API running"));

// Start server function
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

    process.on("SIGTERM", async () => {
      console.log("SIGTERM received. Closing server and DB connection...");
      await mongoose.disconnect();
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
};

start();
