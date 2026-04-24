const User = require("../models/User");
const Vote = require("../models/Vote");
const Config = require("../models/Config");

const getAllVotingUsers = async () => {
  const users = await User.find({ name: { $exists: true, $ne: null } })
    .select("-password")
    .sort({
      voteCount: -1,
    });
  return users;
};

const getVotingUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }
  return user;
};

const createVotingUser = async (name, image) => {
  const user = new User({
    name,
    image: image || "https://via.placeholder.com/150",
  });
  await user.save();
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

const getUserVotes = async (userId) => {
  const votes = await Vote.find({ voter: userId }).populate("votedFor");
  return votes
    .filter((vote) => vote.votedFor) // Filter out null votes
    .map((vote) => vote.votedFor._id.toString());
};

const getVotersForUser = async (votedForId) => {
  const votes = await Vote.find({ votedFor: votedForId }).populate("voter");
  return votes
    .filter((vote) => vote.voter) // Filter out null votes
    .map((vote) => ({
      _id: vote.voter._id.toString(),
      name: vote.voter.name || vote.voter.username,
      image: vote.voter.image || "https://via.placeholder.com/150",
    }));
};

const voteForUser = async (userId, votedForId) => {
  // Check if user already voted for this person
  const existingVote = await Vote.findOne({
    voter: userId,
    votedFor: votedForId,
  });

  if (existingVote) {
    // Remove vote
    await Vote.findByIdAndDelete(existingVote._id);
    await updateVoteCounts();
    return { action: "removed", votes: await getUserVotes(userId) };
  } else {
    // Get config to check max votes
    const config = await Config.getConfig();
    const maxVotes = config.maxVotesPerUser || 3;

    // Check if user has reached max votes
    const userVoteCount = await Vote.countDocuments({ voter: userId });
    if (userVoteCount >= maxVotes) {
      throw new Error(`Bạn đã đạt tối đa ${maxVotes} votes`);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }

    // Add vote
    const vote = new Vote({
      voter: userId,
      votedFor: votedForId,
    });
    await vote.save();
    await updateVoteCounts();
    return { action: "added", votes: await getUserVotes(userId) };
  }
};

const updateVoteCounts = async () => {
  // Reset all vote counts
  await User.updateMany(
    { name: { $exists: true, $ne: null } },
    { voteCount: 0 }
  );

  // Count votes for each user
  const votes = await Vote.find().populate("votedFor");
  const voteCounts = {};

  votes.forEach((vote) => {
    if (vote.votedFor && vote.votedFor._id) {
      const userId = vote.votedFor._id.toString();
      voteCounts[userId] = (voteCounts[userId] || 0) + 1;
    }
  });

  // Update vote counts
  for (const [userId, count] of Object.entries(voteCounts)) {
    await User.findByIdAndUpdate(userId, { voteCount: count });
  }
};

// Initialize default voting users if they don't exist
const initializeDefaultUsers = async () => {
  const defaultUsers = [
    { name: "Nguyễn Văn A", image: "https://via.placeholder.com/150" },
    { name: "Trần Thị B", image: "https://via.placeholder.com/150" },
    { name: "Lê Văn C", image: "https://via.placeholder.com/150" },
    { name: "Phạm Thị D", image: "https://via.placeholder.com/150" },
    { name: "Hoàng Văn E", image: "https://via.placeholder.com/150" },
  ];

  for (const userData of defaultUsers) {
    const existingUser = await User.findOne({ name: userData.name });
    if (!existingUser) {
      await createVotingUser(userData.name, userData.image);
    }
  }

  // Update vote counts after initialization
  await updateVoteCounts();
};

const getMyLockedSuspect = async (userId) => {
  const user = await User.findById(userId)
    .select("lockedSuspectId")
    .populate("lockedSuspectId", "name image");
  if (!user || !user.lockedSuspectId) return null;
  const suspect = user.lockedSuspectId;
  return {
    _id: suspect._id.toString(),
    name: suspect.name || "",
    image: suspect.image || "https://via.placeholder.com/150",
  };
};

const lockSuspect = async (voterId, suspectId) => {
  const user = await User.findById(voterId);
  if (!user) throw new Error("Không tìm thấy người dùng");
  if (user.lockedSuspectId) {
    throw new Error("Bạn đã chốt nghi phạm và không thể thay đổi");
  }
  if (voterId === suspectId) {
    throw new Error("Không thể chọn chính mình làm nghi phạm");
  }
  const suspect = await User.findById(suspectId);
  if (!suspect) throw new Error("Không tìm thấy người được chọn");
  user.lockedSuspectId = suspectId;
  await user.save();
  return { suspectId };
};

module.exports = {
  getAllVotingUsers,
  getVotingUserById,
  createVotingUser,
  getUserVotes,
  voteForUser,
  updateVoteCounts,
  initializeDefaultUsers,
  getVotersForUser,
  getMyLockedSuspect,
  lockSuspect,
};
