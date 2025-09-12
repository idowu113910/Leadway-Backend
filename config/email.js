const nodemailer = require("nodemailer"); // This loads the Nodemailer package into your file. Nodemailer is the library that lets Node.js send emails through SMTP (in this case, Gmail).

const transporter = nodemailer.createTransport({
  // sets up the connection to Gmail’s SMTP servers.
  service: "gmail", // tells Nodemailer you’re using Gmail. (You could also use "hotmail", "yahoo", or a custom SMTP server).
  auth: {
    // login credentials:
    user: process.env.EMAIL_USER, // your Gmail address (loaded from .env).
    pass: process.env.EMAIL_PASS, // your App Password (16-character one you generated), also from .env.
  },
});

module.exports = transporter; // This makes transporter available in other files.
