const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Uses SSL on port 465 to prevent timeouts on host platforms like Render
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Make sure to use your NEW App Password here!
  },
  tls: {
    rejectUnauthorized: false, // Prevents failure on self-signed cert checks in cloud containers
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP Connection Error:", error);
  } else {
    console.log("Ready for messages");
    console.log(success);
  }
});

module.exports = transporter;