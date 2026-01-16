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

module.exports = {
  getAllUsers,
  createUser,
};
