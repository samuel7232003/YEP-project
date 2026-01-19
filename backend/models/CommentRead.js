const mongoose = require("mongoose");

const commentReadSchema = mongoose.Schema(
  {
    reader: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Người đọc là bắt buộc"],
      ref: "User",
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Người được bình luận là bắt buộc"],
      ref: "User",
    },
    lastReadAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries - one record per reader-targetUser pair
commentReadSchema.index({ reader: 1, targetUser: 1 }, { unique: true });
commentReadSchema.index({ targetUser: 1, createdAt: -1 });

const CommentRead = mongoose.model("CommentRead", commentReadSchema);
module.exports = CommentRead;
