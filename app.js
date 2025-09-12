require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const authRoute = require("./routes/auth");
const allowedOrigins = process.env.CORS_ORIGIN.split(",");

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access to specified origin";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoute);

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log("Database connected");

    app.listen(port, () => {
      console.log(`server is running on PORT ${port}`);
    });
  } catch (err) {
    console.error(err);
    console.log("unable to connect");
  }
};

start();
