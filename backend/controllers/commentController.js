const {
  getCommentsForUser,
  createComment,
  getUnreadCommentCount,
  markCommentsAsRead,
  deleteComment,
} = require("../services/commentService");

const getComments = async (req, res) => {
  try {
    const { userId } = req.params;
    const comments = await getCommentsForUser(userId);
    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.log("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách bình luận",
    });
  }
};

const addComment = async (req, res) => {
  try {
    const authorId = req.userId; // From auth middleware
    const { userId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nội dung bình luận không được để trống",
      });
    }

    const comment = await createComment(authorId, userId, content);

    // Emit WebSocket event to notify all clients about new comment
    const io = req.app.get("io");
    if (io) {
      io.emit("commentAdded", { targetUserId: userId, comment });
    }

    res.status(201).json({
      success: true,
      message: "Thêm bình luận thành công",
      data: comment,
    });
  } catch (error) {
    console.log("Add comment error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Thêm bình luận thất bại",
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const readerId = req.userId; // From auth middleware
    const { userId } = req.params;

    if (!readerId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    const unreadCount = await getUnreadCommentCount(readerId, userId);
    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.log("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy số lượng bình luận chưa đọc",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const readerId = req.userId; // From auth middleware
    const { userId } = req.params;

    if (!readerId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    await markCommentsAsRead(readerId, userId);
    res.status(200).json({
      success: true,
      message: "Đã đánh dấu đã đọc",
    });
  } catch (error) {
    console.log("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi đánh dấu đã đọc",
    });
  }
};

const removeComment = async (req, res) => {
  try {
    const authorId = req.userId; // From auth middleware
    const { commentId } = req.params;

    if (!authorId) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    await deleteComment(commentId, authorId);

    // Emit WebSocket event to notify all clients about deleted comment
    const io = req.app.get("io");
    if (io) {
      io.emit("commentDeleted", { commentId });
    }

    res.status(200).json({
      success: true,
      message: "Xóa bình luận thành công",
    });
  } catch (error) {
    console.log("Delete comment error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Xóa bình luận thất bại",
    });
  }
};

module.exports = {
  getComments,
  addComment,
  getUnreadCount,
  markAsRead,
  removeComment,
};
