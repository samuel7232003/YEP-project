const {
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
  resetPassword,
} = require("../services/authService");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    if (!/^\d{6}$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải gồm 6 số",
      });
    }

    const result = await registerUser(username, password);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: result,
    });
  } catch (error) {
    console.log("Register error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Đăng ký thất bại",
    });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(username, password);

    // Validation - username and password are required
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên người dùng",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mật khẩu",
      });
    }

    if (!/^\d{6}$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải gồm 6 số",
      });
    }

    const result = await loginUser(username, password);

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: result,
    });
  } catch (error) {
    console.log("Login error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Đăng nhập thất bại",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await getUserById(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.log("Get profile error:", error);
    res.status(404).json({
      success: false,
      message: error.message || "Không tìm thấy thông tin người dùng",
    });
  }
};

const getUsernames = async (req, res) => {
  try {
    const User = require("../models/User");
    const { hasPassword } = req.query;

    // Build query based on hasPassword filter
    let query = {};
    if (hasPassword === "true") {
      // Users with password (not null and not empty)
      query = { password: { $exists: true, $ne: null, $ne: "" } };
    } else if (hasPassword === "false") {
      // Users without password (null, empty, or doesn't exist)
      query = {
        $or: [
          { password: { $exists: false } },
          { password: null },
          { password: "" },
        ],
      };
    }

    const users = await User.find(query, "username password").sort({
      username: 1,
    });
    const usernames = users.map((user) => user.username);

    res.status(200).json({
      success: true,
      data: usernames,
    });
  } catch (error) {
    console.log("Get usernames error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách tên người dùng",
    });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file ảnh",
      });
    }

    // Convert buffer to stream for Cloudinary
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "avatars",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.log("Cloudinary upload error:", error);
          return res.status(500).json({
            success: false,
            message: "Lỗi khi upload ảnh lên Cloudinary",
          });
        }

        res.status(200).json({
          success: true,
          data: {
            imageUrl: result.secure_url,
          },
        });
      }
    );

    // Pipe buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(stream);
  } catch (error) {
    console.log("Upload avatar error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi upload avatar",
    });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { newPassword } = req.body;

    // Validation
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mật khẩu mới",
      });
    }

    if (!/^\d{6}$/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải gồm 6 số",
      });
    }

    const updatedUser = await resetPassword(userId, newPassword);

    res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Reset password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Đặt lại mật khẩu thất bại",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, image, password, status } = req.body;

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (image !== undefined) {
      updateData.image = image;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (password !== undefined) {
      // Validate password format if provided
      if (password && !/^\d{6}$/.test(password)) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu phải gồm 6 số",
        });
      }
      updateData.password = password;
    }

    const updatedUser = await updateUserProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Update profile error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Cập nhật thông tin thất bại",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  getUsernames,
  uploadAvatar,
  updateProfile,
  resetUserPassword,
};
