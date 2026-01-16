const mongoose = require("mongoose");

const voteSchema = mongoose.Schema(
  {
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Người bình chọn là bắt buộc"],
      ref: "User",
    },
    votedFor: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Người được bình chọn là bắt buộc"],
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Đảm bảo mỗi người chỉ vote cho một người một lần
voteSchema.index({ voter: 1, votedFor: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);
module.exports = Vote;
