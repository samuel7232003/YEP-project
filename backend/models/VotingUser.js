const mongoose = require("mongoose");

const votingUserSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên là bắt buộc"],
      trim: true,
      unique: true,
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    voteCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const VotingUser = mongoose.model("VotingUser", votingUserSchema);
module.exports = VotingUser;
