const {
  getAllVotingUsers,
  getVotingUserById,
  createVotingUser,
  getUserVotes,
  voteForUser,
  initializeDefaultUsers,
  getVotersForUser,
  getMyLockedSuspect,
  lockSuspect,
} = require("../services/votingService");

const getUsers = async (req, res) => {
  try {
    const users = await getAllVotingUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.log("Get users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách người dùng",
    });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getVotingUserById(id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.log("Get user error:", error);
    res.status(404).json({
      success: false,
      message: error.message || "Không tìm thấy người dùng",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tên là bắt buộc",
      });
    }
    const user = await createVotingUser(name, image);

    // Emit WebSocket event to notify all clients about new user
    const io = req.app.get("io");
    if (io) {
      const updatedUsers = await getAllVotingUsers();
      io.emit("usersUpdated", updatedUsers);
    }

    res.status(201).json({
      success: true,
      message: "Tạo người dùng thành công",
      data: user,
    });
  } catch (error) {
    console.log("Create user error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Tạo người dùng thất bại",
    });
  }
};

const getMyVotes = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const votes = await getUserVotes(userId);
    res.status(200).json({
      success: true,
      data: votes,
    });
  } catch (error) {
    console.log("Get my votes error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách votes",
    });
  }
};

const vote = async (req, res) => {
  try {
    const voterId = req.userId; // From auth middleware
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId là bắt buộc",
      });
    }

    const result = await voteForUser(voterId, userId);

    // Emit WebSocket event to notify all clients about the vote update
    const io = req.app.get("io");
    if (io) {
      // Fetch updated users list and emit to all clients
      const { getAllVotingUsers } = require("../services/votingService");
      const updatedUsers = await getAllVotingUsers();
      io.emit("usersUpdated", updatedUsers);
    }

    res.status(200).json({
      success: true,
      message:
        result.action === "added"
          ? "Bình chọn thành công"
          : "Bỏ bình chọn thành công",
      data: result,
    });
  } catch (error) {
    console.log("Vote error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Bình chọn thất bại",
    });
  }
};

const initDefaultUsers = async (req, res) => {
  try {
    await initializeDefaultUsers();
    res.status(200).json({
      success: true,
      message: "Khởi tạo người dùng mặc định thành công",
    });
  } catch (error) {
    console.log("Init default users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Khởi tạo thất bại",
    });
  }
};

const getVoters = async (req, res) => {
  try {
    const Config = require("../models/Config");
    const config = await Config.getConfig();

    // If showVoters is false, return empty array
    if (!config.showVoters) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const { id } = req.params;
    const voters = await getVotersForUser(id);
    res.status(200).json({
      success: true,
      data: voters,
    });
  } catch (error) {
    console.log("Get voters error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách người vote",
    });
  }
};

const getMyLockedSuspectHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const suspect = await getMyLockedSuspect(userId);
    res.status(200).json({
      success: true,
      data: suspect,
    });
  } catch (error) {
    console.log("Get my locked suspect error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy nghi phạm đã chốt",
    });
  }
};

const lockSuspectHandler = async (req, res) => {
  try {
    const voterId = req.userId;
    const { suspectId } = req.body;
    if (!suspectId) {
      return res.status(400).json({
        success: false,
        message: "suspectId là bắt buộc",
      });
    }
    await lockSuspect(voterId, suspectId);
    res.status(200).json({
      success: true,
      message: "Chốt nghi phạm thành công",
      data: { suspectId },
    });
  } catch (error) {
    console.log("Lock suspect error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Chốt nghi phạm thất bại",
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  getMyVotes,
  vote,
  initDefaultUsers,
  getVoters,
  getMyLockedSuspect: getMyLockedSuspectHandler,
  lockSuspect: lockSuspectHandler,
};
