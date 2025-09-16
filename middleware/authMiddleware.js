const jwt = require("jsonwebtoken"); // You bring in jsonwebtoken, which lets you create and verify JWT tokens.

const authenticate = (req, res, next) => {
  // A middleware is a function that runs before your actual route handler (e.g. /profile). It checks conditions (like whether the user is logged in) and decides if the request should continue (next()) or be stopped with an error.

  // The frontend sends a token like this in the request: Authorization: Bearer <token>
  const authHeader = req.headers.authorization; // req.headers.authorization grabs that value.

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access token missing" });
  }

  const token = authHeader.split(" ")[1]; // Extract token from the bearer token . The header looks like "Bearer abc123token". .split(" ")[1] takes the second part, which is just the token itself (abc123token).

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); //jwt.verify() checks:
    //Was the token created using your secret key?
    //Has it expired?
    //Was it tampered with?
    // If it’s valid → you get back the payload you originally put in the token (e.g. { id, email }).
    // If invalid → it throws an error.

    req.user = { id: decoded.id, email: decoded.email }; // After decoding, the middleware attaches the user info (id + email) to the request object. This means any route after this middleware can easily access the logged-in user by doing req.user.
    next(); // If the token is good, this line tells Express: // “Okay, move on to the next middleware or route handler.”
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" }); // If jwt.verify() failed, the user gets a 403 Forbidden response.
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token has expired" });
  }
};

module.exports = authenticate;
