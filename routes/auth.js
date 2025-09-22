const express = require("express"); // your web framework for handling routes and requests.
const bcrypt = require("bcryptjs"); // library used to hash passwords so they aren’t stored in plain text.
const User = require("../models/user"); // the User model (from models/user.js) that represents users in your MongoDB database.
const router = express.Router(); // creates an Express Router object so you can define routes separately and export them.
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const authenticate = require("../middleware/authMiddleware");
const transporter = require("../config/email");

//Access Token → used in the frontend to access protected routes (like /profile, /dashboard).
// Expiry ensures security (if stolen, it’s only valid for a short time).
// Refresh Token → used to silently get a new access token when the old one expires.
// Also has an expiry (longer), so the user doesn’t have to log in every hour.

// Access token = 🔑 door key that expires quickly
// Refresh token = 🏠 master key to get a new door key when the old one expires

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// ========== SIGN UP ==============
router.post(
  "/signup",

  [
    body("fullName").notEmpty().withMessage("Full Name is required"),
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password Must be at least 8 characters")
      .matches(/\d/)
      .withMessage("Password Must contain a number")
      .matches(/[A-Z]/)
      .withMessage("Password Must contain an uppercase letter"),
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, password } = req.body;

    try {
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const newUser = new User({
        fullName,
        email,
        password: hashedPassword,
        verified: false,
      });

      await newUser.save();

      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      const verificationUrl = `${
        process.env.BACKEND_URL || "https://leadway-backend-1.onrender.com"
      }/api/auth/verify-email/${token}`;

      await transporter.sendMail({
        from: `"Leadway" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Verify Your Email",
        html: `
          <h2>Welcome, ${fullName}!</h2>
          <p>Verify your email address to complete the signup and login into your account.</p>
          <p>This link <b>expires in 1 hour</b>.</p>
          <p>Press <a href="${verificationUrl}">here</a> to proceed.</p>
        `,
      });

      res.status(201).json({
        message:
          "Signup successful! Please check your email to verify your account",
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);
//================= VERIFY ROUTE FOR EMAIL VERIFICATION AFTER SIGNING UP. When a user clicks the email verification link (that was sent during signup), this route gets hit.
// It checks the token, and if valid, marks the user as verified in your MongoDB. ===========================

router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      // Return HTML error page instead of JSON
      return res.status(400).send(`
        <html>
          <head>
            <title>Email Verification</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
              <h2 style="color: #d32f2f; margin-bottom: 20px;">❌ Verification Failed</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Verification token is missing.</p>
              <a href="${
                process.env.FRONTEND_URL ||
                "https://leadway-frontend-yqdj.vercel.app/login"
              }" 
                 style="background: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; 
                        font-weight: bold;">
                Back to Login
              </a>
            </div>
          </body>
        </html>
      `);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOneAndUpdate(
      { _id: decoded.id },
      { verified: true },
      { new: true }
    );

    if (!user) {
      // Return HTML error page instead of JSON
      return res.status(400).send(`
        <html>
          <head>
            <title>Email Verification</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
              <h2 style="color: #d32f2f; margin-bottom: 20px;">❌ User Not Found</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 30px;">The user associated with this token could not be found.</p>
              <a href="${
                process.env.FRONTEND_URL ||
                "https://leadway-frontend-yqdj.vercel.app/login"
              }" 
                 style="background: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; 
                        font-weight: bold;">
                Back to Login
              </a>
            </div>
          </body>
        </html>
      `);
    }

    const frontendURL =
      process.env.FRONTEND_URL || "https://leadway-frontend-yqdj.vercel.app";

    // Replace redirect with HTML success page
    return res.send(`
      <html>
        <head>
          <title>Email Verification Success</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
            <h2 style="color: #28a745; margin-bottom: 20px;">✅ Email Verified Successfully!</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Welcome, <strong>${user.fullName}</strong>!</p>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Your account has been verified successfully. You can now login to your account.</p>
            <a href="${frontendURL}/login?verified=true&email=${user.fullName}" 
               style="background: #28a745; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; 
                      font-weight: bold; transition: background-color 0.3s;"
               onmouseover="this.style.backgroundColor='#218838'" 
               onmouseout="this.style.backgroundColor='#28a745'">
              Back to Login
            </a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Verify error:", err);

    const frontendURL =
      process.env.FRONTEND_URL || "https://leadway-frontend-yqdj.vercel.app";

    // Return HTML error page instead of JSON
    res.status(400).send(`
      <html>
        <head>
          <title>Email Verification</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
            <h2 style="color: #d32f2f; margin-bottom: 20px;">❌ Verification Failed</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Invalid or expired verification token. Please request a new verification email.</p>
            <a href="${frontendURL}/login?error=invalid_token" 
               style="background: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; 
                      font-weight: bold;">
              Back to Login
            </a>
          </div>
        </body>
      </html>
    `);
  }
});
// ============ LOGIN/SIGNIN ===================
router.post(
  "/signin",

  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Check if user is verified
      if (!existingUser.verified) {
        return res.status(401).json({
          message: "Please verify your email before logging in.",
          needsVerification: true, // Optional: helps frontend handle this case
        });
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Generate Tokens with error handling
      try {
        const { accessToken, refreshToken } = generateTokens(existingUser);

        // Send successful response
        res.status(200).json({
          message: "Login Successful",
          accessToken,
          refreshToken,
          user: {
            id: existingUser._id,
            fullName: existingUser.fullName,
            email: existingUser.email, // Added email for frontend use
          },
        });
      } catch (tokenError) {
        console.error("Token generation error:", tokenError);
        return res
          .status(500)
          .json({ message: "Failed to generate authentication tokens" });
      }
    } catch (err) {
      console.error("Signin error:", err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// ================= REFRESH NEW TOKEN ==================
router.post("/refresh", (req, res) => {
  // This route will be hit when a client (frontend) sends a refresh request.
  const { refreshToken } = req.body; // Destructures refreshToken from the request body.

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token provided" }); // If no token is sent → respond with 401 Unauthorized.
  }

  jwt.verify(
    // checks if: The token is valid (not expired, not tampered with). It was signed with your REFRESH_TOKEN_SECRET. If verification succeeds, it gives you the payload (userData).
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    (err, userData) => {
      if (err) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      // Generate new access Token
      const accessToken = jwt.sign(
        // Creates a brand new access token with:
        { id: userData.id, email: userData.email }, // id + email from the refresh token.
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({ accessToken }); // Sends the new token back to the client. Client replaces the old expired access token with this new one.
    }
  );
}); // So, the refresh route is like a bridge to keep users logged in without forcing them to type their email/password every time the short access token dies.

// ==================== //  PROTECTED ROUTE : ONLY ACCESSIBLE WITH A VALID ACCESS TOKEN ===============
router.get("/profile", authenticate, async (req, res) => {
  try {
    // req.user is attached by the authenticate middleware after verifying token
    const userData = await User.findById(req.user.id).select("-password"); // exclude password
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Protected route accessed",
      user: userData, // sends user info to frontend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});
module.exports = router;

//Here’s the breakdown:
//The profile route itself isn’t “compulsory” for the backend to function, but it serves as an example of a protected route.
//The real purpose is: only users who have valid credentials (i.e., have signed up and have an account in your database) and a valid access token can access this route.

//So in practice:

// User signs up → account is saved in the database.
// User signs in → backend verifies email/password and issues access + refresh tokens.
// User tries to access /profile (or any protected route) → authenticate middleware checks the token:
// If valid → request continues, user data is returned.
// If invalid/expired → access denied (401/403).
// This ensures: Nobody can access protected data without logging in , The backend can safely serve user-specific info.

// Think of /profile as a template for any route you want to protect, like /dashboard, /settings, /orders, etc.
