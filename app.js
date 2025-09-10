const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

require("dotenv").config();

app.use(cors());
app.use(express.json());

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
