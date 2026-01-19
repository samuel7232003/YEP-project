const Comment = require("../models/Comment");
const CommentRead = require("../models/CommentRead");
const User = require("../models/User");

const getCommentsForUser = async (targetUserId) => {
  const comments = await Comment.find({ targetUser: targetUserId })
    .populate("author", "name image username")
    .sort({ createdAt: 1 });

  return comments.map((comment) => ({
    _id: comment._id.toString(),
    author: {
      _id: comment.author._id.toString(),
      name: comment.author.name || comment.author.username,
      image: comment.author.image || "https://via.placeholder.com/150",
    },
    targetUser: comment.targetUser.toString(),
    content: comment.content,
    createdAt: comment.createdAt,
  }));
};

const createComment = async (authorId, targetUserId, content) => {
  if (!content || !content.trim()) {
    throw new Error("Nội dung bình luận không được để trống");
  }

  if (content.length > 500) {
    throw new Error("Bình luận không được vượt quá 500 ký tự");
  }

  const comment = new Comment({
    author: authorId,
    targetUser: targetUserId,
    content: content.trim(),
  });

  await comment.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate("author", "name image username");

  return {
    _id: populatedComment._id.toString(),
    author: {
      _id: populatedComment.author._id.toString(),
      name: populatedComment.author.name || populatedComment.author.username,
      image: populatedComment.author.image || "https://via.placeholder.com/150",
    },
    targetUser: populatedComment.targetUser.toString(),
    content: populatedComment.content,
    createdAt: populatedComment.createdAt,
  };
};

const getUnreadCommentCount = async (readerId, targetUserId) => {
  // Get last read timestamp for this reader-targetUser pair
  const commentRead = await CommentRead.findOne({
    reader: readerId,
    targetUser: targetUserId,
  });

  // If never read, count all comments
  if (!commentRead) {
    const totalComments = await Comment.countDocuments({
      targetUser: targetUserId,
    });
    return totalComments;
  }

  // Count comments created after lastReadAt
  const unreadCount = await Comment.countDocuments({
    targetUser: targetUserId,
    createdAt: { $gt: commentRead.lastReadAt },
  });

  return unreadCount;
};

const markCommentsAsRead = async (readerId, targetUserId) => {
  // Update or create CommentRead record
  await CommentRead.findOneAndUpdate(
    {
      reader: readerId,
      targetUser: targetUserId,
    },
    {
      reader: readerId,
      targetUser: targetUserId,
      lastReadAt: new Date(),
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const deleteComment = async (commentId, authorId) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error("Bình luận không tồn tại");
  }

  // Verify that the user is the author
  if (comment.author.toString() !== authorId.toString()) {
    throw new Error("Bạn không có quyền xóa bình luận này");
  }

  await Comment.findByIdAndDelete(commentId);

  return { success: true };
};

module.exports = {
  getCommentsForUser,
  createComment,
  getUnreadCommentCount,
  markCommentsAsRead,
  deleteComment,
};
