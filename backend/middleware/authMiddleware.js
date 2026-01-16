const { verifyToken, getUserById } = require("../services/authService");

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Không có token xác thực",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    // Check if user still exists
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Attach userId and username to request
    req.userId = decoded.userId;
    req.user = user;
    req.username = user.username;

    next();
  } catch (error) {
    console.log("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Xác thực thất bại",
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    // First authenticate
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Không có token xác thực",
      });
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    req.userId = decoded.userId;
    req.user = user;

    // Check if user is admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập",
      });
    }

    next();
  } catch (error) {
    console.log("Admin middleware error:", error);
    res.status(403).json({
      success: false,
      message: "Không có quyền truy cập",
    });
  }
};

module.exports = {
  authenticate,
  isAdmin,
};
