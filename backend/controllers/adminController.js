const User = require("../models/User");
const Config = require("../models/Config");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.log("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách người dùng",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, password, name, image } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username là bắt buộc",
      });
    }

    // Validate password if provided
    if (password && !/^\d{6}$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải gồm 6 số",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username đã tồn tại",
      });
    }

    // Create new user (password is optional)
    const userData = {
      username,
      name: name || null,
      image: image || "https://via.placeholder.com/150",
    };

    // Only add password if provided
    if (password) {
      userData.password = password;
    }

    const user = new User(userData);
    await user.save();

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    res.status(201).json({
      success: true,
      message: "Tạo người dùng thành công",
      data: userObject,
    });
  } catch (error) {
    console.log("Create user error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Tạo người dùng thất bại",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name, image, status } = req.body;

    // Find user by ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Validate password if provided
    if (password && !/^\d{6}$/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải gồm 6 số",
      });
    }

    // Check if username is being changed and if it already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username đã tồn tại",
        });
      }
      user.username = username;
    }

    // Update fields if provided
    if (name !== undefined) {
      user.name = name || null;
    }
    if (image !== undefined) {
      user.image = image || "https://via.placeholder.com/150";
    }
    if (status !== undefined) {
      user.status = status || null;
    }
    if (password) {
      user.password = password;
    }

    await user.save();

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    res.status(200).json({
      success: true,
      message: "Cập nhật người dùng thành công",
      data: userObject,
    });
  } catch (error) {
    console.log("Update user error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Cập nhật người dùng thất bại",
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

const getConfig = async (req, res) => {
  try {
    const config = await Config.getConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.log("Get config error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy cấu hình",
    });
  }
};

const getPublicConfig = async (req, res) => {
  try {
    const config = await Config.getConfig();
    // Chỉ trả về các field public (không cần admin auth)
    res.status(200).json({
      success: true,
      data: {
        maxVotesPerUser: config.maxVotesPerUser || 3,
        showVoters: config.showVoters !== undefined ? config.showVoters : true,
      },
    });
  } catch (error) {
    console.log("Get public config error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy cấu hình",
    });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { showVoters, maxVotesPerUser } = req.body;

    const config = await Config.getConfig();

    // Validate maxVotesPerUser if provided
    if (maxVotesPerUser !== undefined) {
      if (typeof maxVotesPerUser !== "number" || maxVotesPerUser < 1 || maxVotesPerUser > 100) {
        return res.status(400).json({
          success: false,
          message: "Số vote tối đa phải là số từ 1 đến 100",
        });
      }
      config.maxVotesPerUser = maxVotesPerUser;
    }

    // Update showVoters if provided
    if (showVoters !== undefined) {
      config.showVoters = Boolean(showVoters);
    }

    await config.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật cấu hình thành công",
      data: config,
    });
  } catch (error) {
    console.log("Update config error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Cập nhật cấu hình thất bại",
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  uploadAvatar,
  getConfig,
  updateConfig,
  getPublicConfig,
};
