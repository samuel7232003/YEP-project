const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const registerUser = async (username, password) => {
  // Check if user already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new Error("Tên người dùng đã được sử dụng");
  }

  // Create new user with plain password
  const user = new User({
    username,
    password: password,
  });

  await user.save();

  // Generate token
  const token = generateToken(user._id);

  // Return user without password
  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    token,
  };
};

const loginUser = async (username, password) => {
  // Find user by username
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error("Mật khẩu không đúng");
  }

  // Password is required for all users
  if (!password) {
    throw new Error("Vui lòng nhập mật khẩu");
  }

  // If user doesn't have a password yet (first-time login)
  if (!user.password) {
    // Save the password to database (plain text)
    user.password = password;
    await user.save();

    // Generate token for user
    const token = generateToken(user._id);

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    return {
      user: userObject,
      token,
    };
  }

  // User has password, validate it by direct comparison
  if (password !== user.password) {
    throw new Error("Mật khẩu không đúng");
  }

  // Generate token
  const token = generateToken(user._id);

  // Return user without password
  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    token,
  };
};

const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }
  return user;
};

const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  // Update allowed fields
  if (updateData.name !== undefined) {
    user.name = updateData.name;
  }
  if (updateData.image !== undefined) {
    user.image = updateData.image;
  }
  if (updateData.status !== undefined) {
    user.status = updateData.status;
  }
  if (updateData.password !== undefined) {
    // Validate password format (6 digits)
    if (!/^\d{6}$/.test(updateData.password)) {
      throw new Error("Mật khẩu phải gồm 6 số");
    }
    user.password = updateData.password;
  }

  await user.save();

  // Return user without password
  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

module.exports = {
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  getUserById,
  updateUserProfile,
};
