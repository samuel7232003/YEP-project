const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Admin password required",
    });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Invalid admin password",
    });
  }

  next();
};

module.exports = { adminAuth };
