const express = require("express");
const {
  register,
  login,
  getProfile,
  getUsernames,
  uploadAvatar,
  updateProfile,
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
} = require("../controllers/votingController");
const { authenticate } = require("../middleware/authMiddleware");
const { adminAuth } = require("../middleware/adminAuthMiddleware");
const {
  getAllUsers,
  createUser: createAdminUser,
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

// Voting routes
routerAPI.get("/voting/users", getUsers);
routerAPI.get("/voting/users/:id", getUser);
routerAPI.post("/voting/users", authenticate, createUser);
routerAPI.get("/voting/my-votes", authenticate, getMyVotes);
routerAPI.post("/voting/vote", authenticate, vote);
routerAPI.post("/voting/init-default-users", initDefaultUsers);
routerAPI.get("/voting/users/:id/voters", getVoters);

// Admin routes
routerAPI.get("/admin/users", adminAuth, getAllUsers);
routerAPI.post("/admin/users", adminAuth, createAdminUser);

module.exports = routerAPI;
