const User = require("../models/User");

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

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
};
