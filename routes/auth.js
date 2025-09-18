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
      // If validation fails , return error message.
      return res.status(400).json({ errors: errors.array() });
    }

    // This listens for a POST request at /signup.
    const { fullName, email, password } = req.body; // Extracts fullName, email, and password from the request body.

    try {
      // Check if user exists
      const existingUser = await User.findOne({ email }); // Searches MongoDB for an existing user with the same email.
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" }); // If found → return error 400 (Bad Request).
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10); // Generates a salt (a random string) to make the hash unique.
      const hashedPassword = await bcrypt.hash(password, salt); // Hashes the password using bcrypt. // This way even if your DB is hacked, raw passwords aren’t exposed.

      // Create new user
      const newUser = new User({
        // Creates a new user document with the provided details.
        fullName,
        email,
        password: hashedPassword, // Creates a new user document with the provided details. Saves it in MongoDB
        verified: false,
      });

      await newUser.save();

      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
        // Payload → { email } (so the token is linked to this user’s email).
        // Secret → process.env.JWT_SECRET (your secret key from .env).
        expiresIn: "1h", // Expiry → "1h" means the token expires after 1 hour.
        // This token is proof that the email belongs to the user.
      });

      const verificationUrl = `${process.env.FRONTEND_URL}/api/auth/verify?token=${token}`; // Creates a clickable URL that points to your frontend (e.g. http://localhost:5173/verify?token=...).
      // token=${token} attaches the JWT as a query parameter.
      // When the user clicks the link → your frontend will capture this token and send it to your backend /verify route.
      // This is how you tie email verification back to your system

      await transporter.sendMail({
        from: `"Leadway"  <${process.env.EMAIL_USER}>   `,
        to: email,
        subject: "Verify your email",
        html: `<h2>Welcome, ${fullName}! </h2>
               <p>Please click the link below to verify your account:</p> 
               <a href="${verificationUrl}">${verificationUrl}</a> `,
      });

      res.status(201).json({
        message:
          "Signup successful! Please check your email to verify your account",
      });

      // Responds with 201 Created and success message.
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

//================= VERIFY ROUTE FOR EMAIL VERIFICATION AFTER SIGNING UP. When a user clicks the email verification link (that was sent during signup), this route gets hit.
// It checks the token, and if valid, marks the user as verified in your MongoDB. ===========================

router.get("/verify", async (req, res) => {
  // This route listens for GET /verify?token=xxxx
  try {
    const { token } = req.query; // It grabs the token from the query string in the URL (the ?token=xxxx).
    if (!token) {
      return res.status(400).json({ message: "Verification token missing" }); // If no token was provided, respond with 400 Bad Request.  Example: someone visits /verify without ?token=....
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // jwt.verify checks if the token is:
    // 1. Signed with the correct secret (JWT_SECRET in your .env).
    // 2. Still valid (not expired). If it passes, you get back the payload you originally put inside the token (in your signup route, it was {

    const user = await User.findOneAndUpdate(
      // It searches the database for a user with the decoded email.
      { _id: decoded.id },
      { verified: true }, // If found, it updates verified: true.
      { new: true } // { new: true } means it returns the updated user document, not the old one.
    );

    if (!user) {
      return res.status(400).json({ message: "User not found" }); // If no user was found with that email → return 400 User not found.
    }

    const frontendURL = (
      process.env.FRONTEND_URL || "https://leadway-frontend-yqdj.vercel.app"
    ).replace(/\/+$/, "");

    // Option: send an HTML page that auto-navigates using client-side JS
    return res.send(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; }
            .card { text-align:center; max-width:480px; padding:24px; border-radius:8px; box-shadow:0 4px 14px rgba(0,0,0,0.08); }
            a.button { display:inline-block; margin-top:16px; padding:10px 18px; background:#10b981; color:white; text-decoration:none; border-radius:6px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Email Verified</h1>
            <p>Your account (${user.email}) has been verified successfully.</p>
            <p>If you are not redirected automatically, click the button below.</p>
            <a class="button" href="${frontendURL}/verifiedsuccess?email=${encodeURIComponent(
      user.email
    )}">Go to verified page</a>
          </div>

          <script>
            // Auto-redirect after short delay (client-side redirect, not res.redirect)
            setTimeout(function() {
              window.location.href = "${frontendURL}/verifiedsuccess?email=${encodeURIComponent(
      user.email
    )}";
            }, 1500);
          </script>
        </body>
      </html>`);
  } catch (err) {
    console.error("Verify error:", err);
    res.status(400).json({ message: "Invalid or expired token" }); // If anything goes wrong (expired token, invalid signature, DB error, etc.) → return 400 Invalid or expired token.
  }
});

// ============ LOGIN/SIGNIN ===================
router.post(
  // Typically, POST is used because you are sending sensitive data (email & password).
  "/signin",

  [
    body("email").isEmail().withMessage("Please enter a valid email"), // body("email").isEmail() → checks that the email field is a valid email format.
    body("password").notEmpty().withMessage("Password is required"), // body("password").notEmpty() → checks that the password is not empty.
    // withMessage("...") → provides a custom error message if validation fails.
  ],

  async (req, res) => {
    const errors = validationResult(req); // validationResult(req) collects errors from the previous validation step.
    if (!errors.isEmpty()) {
      // errors.isEmpty() → false if there were validation errors.
      return res.status(400).json({ errors: errors.array() }); // Responds with 400 Bad Request and an array of error messages if validation fails.
    }

    const { email, password } = req.body; // Pulls email and password from the request body for easier use.

    try {
      // check if user exists
      const existingUser = await User.findOne({ email }); // Uses Mongoose to search your User collection for a document with the provided email.
      if (!existingUser) {
        return res.status(400).json({ message: "Invalid email or password" }); // If no user is found → respond with 400 and a generic "Invalid email or password" (don’t reveal which part is wrong for security).
      }

      if (!existingUser.verified) {
        return res
          .status(401)
          .json({ message: "Please verify your email before logging in." });
      }

      // compare passwords
      const isMatch = await bcrypt.compare(password, existingUser.password); // bcrypt.compare() checks if the plaintext password matches the hashed password stored in the database.
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" }); // If they don’t match → return 400 with the same generic error message.
      }

      // Generate Tokens
      const { accessToken, refreshToken } = generateTokens(existingUser); // Here, existingUser is the user fetched from the database using the email provided during login.
      // The same generateTokens function  used to sign up is called to create new tokens for this existing user, so the frontend can use them.
      // Return Tokens

      // Sends a successfull message too the client
      res.status(200).json({
        message: "Login Successful", // message: confirmation of login
        accessToken, // accessToken: used for authorization headers on protected routes
        refreshToken, // refreshToken: stored (often in httpOnly cookie or localStorage) for refreshing access tokens
        user: {
          id: existingUser._id,
          fullName: existingUser.fullName,
          verified: existingUser.verified,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error" }); // If any unexpected error occurs (e.g., database failure), it will log the error to the console and respond with 500 Internal Server Error.
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
