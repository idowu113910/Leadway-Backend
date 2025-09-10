import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true }, // User's full name (required)
    email: { type: String, required: true, unique: true }, // Email must be unique
    password: { type: String, required: true }, // Hashed password
  },
  { timestamps: true }
); // Automatically adds createdAt & updatedAt fields

export default mongoose.model("User", userSchema);
