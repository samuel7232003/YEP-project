const express = require("express");
const {
  register,
  login,
  getProfile,
  getUsernames,
  uploadAvatar,
  updateProfile,
  resetUserPassword,
} = require("../controllers/authController");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh"));
    }
  },
});
const {
  getUsers,
  getUser,
  createUser,
  getMyVotes,
  vote,
  initDefaultUsers,
  getVoters,
  getMyLockedSuspect,
  lockSuspect,
} = require("../controllers/votingController");
const {
  getComments,
  addComment,
  getUnreadCount,
  markAsRead,
  removeComment,
} = require("../controllers/commentController");
const { authenticate } = require("../middleware/authMiddleware");
const { adminAuth } = require("../middleware/adminAuthMiddleware");
const {
  getAllUsers,
  createUser: createAdminUser,
  updateUser: updateAdminUser,
  uploadAvatar: uploadAdminAvatar,
  getConfig,
  updateConfig,
  getPublicConfig,
} = require("../controllers/adminController");
const routerAPI = express.Router();

routerAPI.get("/", (req, res) => {
  return res.status(200).json("Voting API");
});

// Auth routes
routerAPI.post("/auth/register", register);
routerAPI.post("/auth/login", login);
routerAPI.get("/auth/profile", authenticate, getProfile);
routerAPI.get("/auth/usernames", getUsernames);
routerAPI.post(
  "/auth/upload-avatar",
  authenticate,
  upload.single("avatar"),
  uploadAvatar
);
routerAPI.put("/auth/profile", authenticate, updateProfile);
routerAPI.post("/auth/reset-password", authenticate, resetUserPassword);

// Voting routes
routerAPI.get("/voting/users", getUsers);
routerAPI.get("/voting/users/:id", getUser);
routerAPI.post("/voting/users", authenticate, createUser);
routerAPI.get("/voting/my-votes", authenticate, getMyVotes);
routerAPI.post("/voting/vote", authenticate, vote);
routerAPI.get("/voting/my-locked-suspect", authenticate, getMyLockedSuspect);
routerAPI.post("/voting/lock-suspect", authenticate, lockSuspect);
routerAPI.post("/voting/init-default-users", initDefaultUsers);
routerAPI.get("/voting/users/:id/voters", getVoters);
routerAPI.get("/voting/config", require("../controllers/adminController").getPublicConfig);

// Comment routes
routerAPI.get("/voting/users/:userId/comments", getComments);
routerAPI.post("/voting/users/:userId/comments", authenticate, addComment);
routerAPI.delete("/voting/comments/:commentId", authenticate, removeComment);
routerAPI.get("/voting/users/:userId/comments/unread-count", authenticate, getUnreadCount);
routerAPI.post("/voting/users/:userId/comments/mark-read", authenticate, markAsRead);

// Admin routes
routerAPI.get("/admin/users", adminAuth, getAllUsers);
routerAPI.post("/admin/users", adminAuth, createAdminUser);
routerAPI.put("/admin/users/:id", adminAuth, updateAdminUser);
routerAPI.post(
  "/admin/upload-avatar",
  adminAuth,
  upload.single("avatar"),
  uploadAdminAvatar
);
routerAPI.get("/admin/config", adminAuth, getConfig);
routerAPI.put("/admin/config", adminAuth, updateConfig);

module.exports = routerAPI;
