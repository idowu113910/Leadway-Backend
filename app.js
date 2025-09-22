require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoute = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Multiple origins for both local and production
const allowedOrigins = [
  "http://localhost:5173", // Vite default port
  "https://leadway-frontend-yqdj.vercel.app", // Your deployed frontend
  process.env.FRONTEND_URL, // Additional environment variable
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoute);

app.get("/", (req, res) => res.send("API running"));

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
