const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Tên người dùng là bắt buộc"],
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
      minlength: [6, "Mật khẩu phải có 6 số"],
      maxlength: [6, "Mật khẩu phải có 6 số"],
      match: [/^\d{6}$/, "Mật khẩu phải gồm 6 số"],
    },
    name: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    voteCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      trim: true,
      maxlength: [30, "Trạng thái không được vượt quá 20 ký tự"],
    },
  },
  {
    timestamps: true,
  }
);

const userModel = mongoose.model("User", userSchema);
module.exports = userModel;
