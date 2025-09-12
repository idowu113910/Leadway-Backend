const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true }, // User's full name (required)
    email: { type: String, required: true, unique: true }, // Email must be unique
    password: { type: String, required: true }, // Hashed password
    verified: { type: Boolean, default: false }, // New Field for email verification
  },
  { timestamps: true }
); // Automatically adds createdAt & updatedAt fields

module.exports = mongoose.model("User", userSchema);
