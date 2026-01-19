import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { FaTrash } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { voteForUser, fetchMyVotes, fetchUsers } from '../../store/slices/votingSlice';
import { votingApi, Comment } from '../../services/votingApi';
import { socketService } from '../../services/socketService';
import styles from './CommentModal.module.css';

const TrashIcon = FaTrash as React.FC<React.SVGProps<SVGSVGElement>>;

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onLoginClick?: () => void;
  onMarkAsRead?: () => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onLoginClick,
  onMarkAsRead,
}) => {
  const dispatch = useAppDispatch();
  const { userProfile, userVotes } = useAppSelector((state) => state.voting);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [maxVotesPerUser, setMaxVotesPerUser] = useState<number>(3);
  const [isVoting, setIsVoting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const pendingCommentIdRef = useRef<string | null>(null);
  const currentUserId = userProfile?._id;

  useEffect(() => {
    if (isOpen && userId) {
      const fetchComments = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await votingApi.getComments(userId);
          if (response.success) {
            setComments(response.data);
          } else {
            setError('Không thể tải danh sách bình luận');
          }
        } catch (err) {
          console.error('Error fetching comments:', err);
          setError('Không thể tải danh sách bình luận');
        } finally {
          setLoading(false);
        }
      };

      const fetchConfig = async () => {
        try {
          const response = await votingApi.getPublicConfig();
          if (response.success && response.data.maxVotesPerUser) {
            setMaxVotesPerUser(response.data.maxVotesPerUser);
          }
        } catch (err) {
          console.error('Error fetching config:', err);
        }
      };

      // Mark comments as read when modal opens
      const markAsRead = async () => {
        if (currentUserId) {
          try {
            await votingApi.markCommentsAsRead(userId);
            // Notify parent component that comments have been marked as read
            if (onMarkAsRead) {
              onMarkAsRead();
            }
          } catch (err) {
            console.error('Error marking comments as read:', err);
          }
        }
      };

      fetchComments();
      fetchConfig();
      markAsRead();
    }
  }, [isOpen, userId, currentUserId, onMarkAsRead]);

  // Listen for real-time comment updates
  useEffect(() => {
    if (!isOpen || !userId) return;

    const socket = socketService.connect();

    const handleCommentAdded = (data: { targetUserId: string; comment: Comment }) => {
      if (data.targetUserId === userId) {
        setComments((prev) => {
          // Check if comment already exists to avoid duplicates
          const exists = prev.some((c) => c._id === data.comment._id);
          if (exists) {
            return prev;
          }
          // If this is the pending comment we just submitted, clear the ref
          if (pendingCommentIdRef.current === data.comment._id) {
            pendingCommentIdRef.current = null;
          }
          return [...prev, data.comment];
        });
      }
    };

    const handleCommentDeleted = (data: { commentId: string }) => {
      setComments((prev) => prev.filter((c) => c._id !== data.commentId));
    };

    socket.on('commentAdded', handleCommentAdded);
    socket.on('commentDeleted', handleCommentDeleted);

    return () => {
      socket.off('commentAdded', handleCommentAdded);
      socket.off('commentDeleted', handleCommentDeleted);
    };
  }, [isOpen, userId]);

  useEffect(() => {
    // Scroll to bottom when comments change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Disable body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore body scroll
        const bodyTop = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        // Restore scroll position
        if (bodyTop) {
          window.scrollTo(0, parseInt(bodyTop || '0') * -1);
        }
      };
    }
  }, [isOpen]);

  // Prevent touch scroll on overlay (but allow on modal content)
  useEffect(() => {
    if (!isOpen) return;

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Allow touch move inside modal content
      if (target.closest(`.${styles.modal}`)) {
        return;
      }
      // Prevent touch move on overlay
      e.preventDefault();
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current && currentUserId) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, currentUserId]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(`.${styles.emojiButton}`)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    setNewComment('');
    setShowEmojiPicker(false);
    resetTextareaHeight();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
      } else {
        onClose();
      }
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!submitting && newComment.trim() && newComment.length <= 500) {
        handleSubmit(e as any);
      }
    }
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.5;
      const paddingTop = parseFloat(computedStyle.paddingTop);
      const paddingBottom = parseFloat(computedStyle.paddingBottom);
      const minHeight = lineHeight + paddingTop + paddingBottom;
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting || !currentUserId) return;

    // Keep focus on textarea to prevent keyboard from closing
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await votingApi.addComment(userId, newComment.trim());
      if (response.success) {
        // Store the comment ID to track it
        pendingCommentIdRef.current = response.data._id;

        // Add comment immediately for better UX
        setComments((prev) => {
          // Check if already exists (from socket event that arrived first)
          const exists = prev.some((c) => c._id === response.data._id);
          if (exists) {
            pendingCommentIdRef.current = null;
            return prev;
          }
          return [...prev, response.data];
        });

        setNewComment('');
        setShowEmojiPicker(false);
        resetTextareaHeight();
        
        // Focus back to textarea after successful submission to keep virtual keyboard open
        // Use multiple techniques to ensure keyboard stays open on mobile devices
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (textareaRef.current) {
              // Focus and click to ensure keyboard stays open on mobile
              textareaRef.current.focus();
              textareaRef.current.click();
              // On some mobile browsers, we need to trigger input event to keep keyboard visible
              const event = new Event('input', { bubbles: true });
              textareaRef.current.dispatchEvent(event);
            }
          }, 100);
        });
      } else {
        setError('Không thể thêm bình luận');
      }
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.response?.data?.message || 'Không thể thêm bình luận');
      pendingCommentIdRef.current = null;
    } finally {
      setSubmitting(false);
      // Ensure focus is maintained after submission completes
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    if (e.target.value.length > 500) {
      setError('Bình luận không được vượt quá 500 ký tự');
    } else {
      setError('');
    }

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.5;
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    const minHeight = lineHeight + paddingTop + paddingBottom;
    const maxHeight = lineHeight * 3 + paddingTop + paddingBottom;
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight <= maxHeight) {
      textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart || 0;
    const textBefore = newComment.substring(0, cursorPosition);
    const textAfter = newComment.substring(textareaRef.current.selectionEnd || 0);
    const newText = textBefore + emojiData.emoji + textAfter;

    if (newText.length <= 500) {
      setNewComment(newText);
      setError('');

      // Update textarea value and cursor position
      const textarea = textareaRef.current;
      textarea.value = newText;
      const newCursorPosition = cursorPosition + emojiData.emoji.length;

      setTimeout(() => {
        if (!textareaRef.current) return;

        const currentTextarea = textareaRef.current;
        currentTextarea.setSelectionRange(newCursorPosition, newCursorPosition);
        currentTextarea.focus();

        // Trigger resize
        currentTextarea.style.height = 'auto';
        const computedStyle = window.getComputedStyle(currentTextarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.5;
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
        const minHeight = lineHeight + paddingTop + paddingBottom;
        const maxHeight = lineHeight * 3 + paddingTop + paddingBottom;
        const scrollHeight = currentTextarea.scrollHeight;

        if (scrollHeight <= maxHeight) {
          currentTextarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
          currentTextarea.style.overflowY = 'hidden';
        } else {
          currentTextarea.style.height = `${maxHeight}px`;
          currentTextarea.style.overflowY = 'auto';
        }
      }, 0);
    } else {
      setError('Bình luận không được vượt quá 500 ký tự');
    }
  };

  const handleToggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const isOwnMessage = (comment: Comment) => {
    return comment.author._id === currentUserId;
  };

  const isTargetUserMessage = (comment: Comment) => {
    return comment.author._id === userId;
  };

  const shouldShowMessageHeader = (currentIndex: number): boolean => {
    if (currentIndex === 0) {
      return true;
    }

    const currentComment = comments[currentIndex];
    const previousComment = comments[currentIndex - 1];

    // Show header if different user
    if (currentComment.author._id !== previousComment.author._id) {
      return true;
    }

    // Check if within 10 minutes
    const currentTime = new Date(currentComment.createdAt).getTime();
    const previousTime = new Date(previousComment.createdAt).getTime();
    const timeDifference = currentTime - previousTime;
    const tenMinutesInMs = 10 * 60 * 1000;

    // Show header if more than 10 minutes apart
    return timeDifference > tenMinutesInMs;
  };

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (messageDate.getTime() === today.getTime()) {
      return `Hôm nay ${timeString}`;
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return `Hôm qua ${timeString}`;
    } else {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year} ${timeString}`;
    }
  };

  const isVoted = currentUserId ? userVotes.includes(userId) : false;
  const canVote = currentUserId ? (isVoted || userVotes.length < maxVotesPerUser) : false;
  const showVoteButton = currentUserId && canVote;

  const handleVote = async () => {
    if (!currentUserId || isVoting) return;

    setIsVoting(true);
    setError('');
    try {
      await dispatch(voteForUser(userId));
      await dispatch(fetchMyVotes());
      await dispatch(fetchUsers());
    } catch (err: any) {
      console.error('Error voting:', err);
      setError(err.response?.data?.message || 'Không thể bình chọn');
    } finally {
      setIsVoting(false);
    }
  };

  const handleVoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleVote();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;

    try {
      const response = await votingApi.deleteComment(commentId);
      if (response.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else {
        setError('Không thể xóa bình luận');
      }
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setError(err.response?.data?.message || 'Không thể xóa bình luận');
    }
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDeleteComment(commentId);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Bình luận về {userName}</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Đóng"
            tabIndex={0}
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClose();
              }
            }}
          >
            ×
          </button>
        </div>

        {showVoteButton && (
          <div className={styles.voteSection}>
            <button
              className={`${styles.voteButton} ${isVoted ? styles.votedButton : ''}`}
              onClick={handleVote}
              onKeyDown={handleVoteKeyDown}
              disabled={isVoting}
              aria-label={isVoted ? `Bỏ bình chọn cho ${userName}` : `Bình chọn cho ${userName}`}
              tabIndex={0}
            >
              {isVoting ? 'Đang tải...' : isVoted ? 'Bỏ nghi ngờ' : 'Nghi ngờ'}
            </button>
          </div>
        )}

        {error && !submitting && (
          <div className={styles.error}>{error}</div>
        )}

        <div className={styles.messagesContainer}>
          {loading && (
            <div className={styles.loading}>Đang tải...</div>
          )}

          {!loading && comments.length === 0 && (
            <div className={styles.empty}>Chưa có bình luận nào</div>
          )}

          {!loading && comments.map((comment, index) => {
            const isOwn = isOwnMessage(comment);
            const isTarget = isTargetUserMessage(comment);
            const showHeader = shouldShowMessageHeader(index);

            return (
              <React.Fragment key={comment._id}>
                {showHeader && (
                  <div className={styles.timeDivider}>
                    <span className={styles.timeText}>{formatMessageTime(comment.createdAt)}</span>
                  </div>
                )}
                <div
                  className={`${styles.messageWrapper} ${isOwn ? styles.messageOwn : styles.messageOther} ${isTarget ? styles.messageHighlighted : ''} ${!showHeader ? styles.messageConsecutive : ''}`}
                >
                  {!isOwn && showHeader && (
                    <div className={styles.messageHeader}>
                      <img
                        src={comment.author.image}
                        alt={comment.author.name}
                        className={styles.avatar}
                      />
                      <span className={styles.authorName}>{comment.author.name}</span>
                    </div>
                  )}
                  <div className={styles.messageContentWrapper}>
                    {isOwn && (
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteComment(comment._id)}
                        onKeyDown={(e) => handleDeleteKeyDown(e, comment._id)}
                        aria-label="Xóa bình luận"
                        tabIndex={0}
                      >
                        <TrashIcon />
                      </button>
                    )}
                    <div className={styles.messageContent}>
                      {comment.content}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {currentUserId && (
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={textareaRef}
                className={styles.input}
                value={newComment}
                onChange={handleCommentChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Nhập bình luận..."
                rows={1}
                maxLength={500}
                disabled={submitting}
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
              />
              <button
                type="button"
                className={styles.emojiButton}
                onClick={handleToggleEmojiPicker}
                disabled={submitting}
                aria-label="Chọn emoji"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleEmojiPicker();
                  }
                }}
              >
                😊
              </button>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className={styles.emojiPickerContainer}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    skinTonesDisabled
                    width="100%"
                    height={400}
                  />
                </div>
              )}
            </div>
            <div className={styles.inputFooter}>
              <span className={styles.charCount}>
                {newComment.length}/500
              </span>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={!newComment.trim() || submitting || newComment.length > 500}
                aria-label="Gửi bình luận"
              >
                {submitting ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
          </form>
        )}

        {!currentUserId && (
          <div className={styles.loginSection}>
            <button
              className={styles.loginButton}
              onClick={() => {
                onClose();
                if (onLoginClick) {
                  onLoginClick();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClose();
                  if (onLoginClick) {
                    onLoginClick();
                  }
                }
              }}
              aria-label="Đăng nhập để bình luận"
              tabIndex={0}
            >
              Đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CommentModal;
