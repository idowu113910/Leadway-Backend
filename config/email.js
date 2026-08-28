// email.js
const sendVerificationEmail = async (userEmail, fullName, verificationUrl) => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "Leadway Assurance",
          email: process.env.EMAIL_USER, // Your Brevo account email
        },
        to: [
          {
            email: userEmail,
            name: fullName,
          },
        ],
        subject: "Verify Your Email - Leadway",
        htmlContent: `
          <h2>Welcome, ${fullName}!</h2>
          <p>Verify your email address to complete the signup and login into your account.</p>
          <p>This link <b>expires in 1 hour</b>.</p>
          <p>Press <a href="${verificationUrl}">here</a> to proceed.</p>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Brevo API Error:", data);
    } else {
      console.log("Email sent successfully via Brevo:", data.messageId);
    }
  } catch (error) {
    console.error("Failed to send email via Brevo:", error.message);
  }
};

module.exports = sendVerificationEmail;
