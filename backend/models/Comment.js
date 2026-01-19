const mongoose = require("mongoose");

const commentSchema = mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Người bình luận là bắt buộc"],
      ref: "User",
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Người được bình luận là bắt buộc"],
      ref: "User",
    },
    content: {
      type: String,
      required: [true, "Nội dung bình luận là bắt buộc"],
      trim: true,
      maxlength: [500, "Bình luận không được vượt quá 500 ký tự"],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
commentSchema.index({ targetUser: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
