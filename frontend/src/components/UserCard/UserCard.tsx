import React, { useState, useEffect, useCallback } from 'react';
import { FaComment, FaExclamationTriangle } from 'react-icons/fa';
import { votingApi, Voter, Comment } from '../../services/votingApi';
import { socketService } from '../../services/socketService';
import { useAppSelector } from '../../store/hooks';
import VotersModal from '../VotersModal/VotersModal';
import CommentModal from '../CommentModal/CommentModal';
import styles from './UserCard.module.css';

const CommentIcon = FaComment as React.FC<React.SVGProps<SVGSVGElement>>;
const ExclamationTriangleIcon = FaExclamationTriangle as React.FC<React.SVGProps<SVGSVGElement>>;

interface UserCardProps {
  id: string;
  name: string;
  image: string;
  voteCount: number;
  isVoted: boolean;
  onVote: () => void;
  onClick: () => void;
  canVote: boolean;
  isLoggedIn: boolean;
  isVoting: boolean;
  dangerLevel?: 'dangerous' | 'moderate' | 'normal';
  onScrollToUser?: (userId: string) => void;
  status?: string;
  children: React.ReactNode;
  onLoginClick?: () => void;
}

const UserCard: React.FC<UserCardProps> = ({
  id,
  name,
  image,
  voteCount,
  isVoted,
  onVote,
  onClick,
  canVote,
  isLoggedIn,
  isVoting,
  dangerLevel = 'normal',
  onScrollToUser,
  status,
  children,
  onLoginClick,
}) => {
  const { userProfile } = useAppSelector((state) => state.voting);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const currentUserId = userProfile?._id;

  // Only disable button if logged in but cannot vote, or if currently voting
  const isButtonDisabled = (isLoggedIn && !canVote) || isVoting;

  useEffect(() => {
    if (voteCount > 0) {
      const fetchVoters = async () => {
        try {
          const response = await votingApi.getVoters(id);
          if (response.success) {
            setVoters(response.data);
          }
        } catch (error) {
          console.error('Error fetching voters:', error);
        }
      };
      fetchVoters();
    } else {
      setVoters([]);
    }
  }, [id, voteCount]);

  // Fetch comment count
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await votingApi.getComments(id);
        if (response.success) {
          setCommentCount(response.data.length);
        }
      } catch (error) {
        console.error('Error fetching comment count:', error);
      }
    };
    fetchCommentCount();
  }, [id]);

  // Fetch unread comment count
  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await votingApi.getUnreadCommentCount(id);
        if (response.success) {
          setUnreadCount(response.data.unreadCount);
        }
      } catch (error) {
        console.error('Error fetching unread comment count:', error);
      }
    };
    fetchUnreadCount();
  }, [id, isLoggedIn]);

  // Listen for real-time comment updates
  useEffect(() => {
    const socket = socketService.connect();

    const handleCommentAdded = (data: { targetUserId: string; comment: Comment }) => {
      if (data.targetUserId === id) {
        setCommentCount((prev) => prev + 1);
        // Increment unread count if user is logged in, modal is not open, and current user is not the author
        if (isLoggedIn && !isCommentModalOpen && currentUserId && data.comment.author._id !== currentUserId) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    };

    socket.on('commentAdded', handleCommentAdded);

    return () => {
      socket.off('commentAdded', handleCommentAdded);
    };
  }, [id, isLoggedIn, isCommentModalOpen, currentUserId]);

  const displayedVoters = voters.slice(0, 4);
  const remainingCount = voters.length > 4 ? voters.length - 4 : 0;

  const handleVotersClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (voters.length > 0) {
      setIsVotersModalOpen(true);
    }
  };

  const handleVotersKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (voters.length > 0) {
        setIsVotersModalOpen(true);
      }
    }
  };

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't allow click if currently voting
    if (isVoting) return;
    // Allow click if not logged in (will open modal) or if can vote
    if (!isLoggedIn || canVote) {
      onVote();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const handleVoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Don't allow key press if currently voting
      if (isVoting) return;
      // Allow key press if not logged in (will open modal) or if can vote
      if (!isLoggedIn || canVote) {
        onVote();
      }
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCommentModalOpen(true);
    // Don't mark as read here - CommentModal will do it when it opens
    // This prevents race conditions
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setIsCommentModalOpen(true);
      // Don't mark as read here - CommentModal will do it when it opens
      // This prevents race conditions
    }
  };

  const handleMarkAsRead = useCallback(() => {
    // Update unread count to 0 when comments are marked as read
    setUnreadCount(0);
  }, []);

  const handleCommentModalClose = () => {
    setIsCommentModalOpen(false);
    // Refresh comment count when modal closes
    const fetchCommentCount = async () => {
      try {
        const response = await votingApi.getComments(id);
        if (response.success) {
          setCommentCount(response.data.length);
        }
      } catch (error) {
        console.error('Error fetching comment count:', error);
      }
    };
    fetchCommentCount();
  };

  const getDangerLevelClass = () => {
    if (dangerLevel === 'dangerous') return styles.dangerous;
    if (dangerLevel === 'moderate') return styles.moderate;
    return '';
  };

  return (
    <div
      className={`${styles.card} ${isVoted ? styles.voted : ''} ${getDangerLevelClass()}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Xem chi tiết ${name}`}
    >
      <div className={styles.imageContainer}>
        <div className={styles.imageWrapper}>
          <img src={image} alt={name} className={styles.image} />
        </div>
        {status && (
          <div className={styles.statusBubble}>
            <div className={styles.statusText}>{status}</div>
            <div className={styles.statusArrow}></div>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{name}</h3>
        <div className={styles.voteCount}>
          <span className={styles.voteLabel}>Votes:</span>
          <span className={styles.voteNumber}>{voteCount}</span>
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={`${styles.voteButton} ${isVoted ? styles.votedButton : ''} ${isButtonDisabled ? styles.disabled : ''}`}
            onClick={handleVoteClick}
            onKeyDown={handleVoteKeyDown}
            disabled={isButtonDisabled}
            aria-label={isVoted ? `Bỏ bình chọn cho ${name}` : `Bình chọn cho ${name}`}
            tabIndex={0}
          >
            <ExclamationTriangleIcon className={styles.buttonIcon} />
            {isVoting ? 'Đang tải...' : isVoted ? 'Bỏ nghi ngờ' : 'Nghi ngờ'}
          </button>
          <div className={styles.commentButtonWrapper}>
            <button
              className={styles.commentButton}
              onClick={handleCommentClick}
              onKeyDown={handleCommentKeyDown}
              aria-label={`Bình luận về ${name}`}
              tabIndex={0}
            >
              <CommentIcon className={styles.buttonIcon} />
              {commentCount > 0 ? `Bình luận (${commentCount})` : 'Bình luận'}
            </button>
            {isLoggedIn && unreadCount > 0 && (
              <span className={styles.unreadDot} aria-label={`${unreadCount} bình luận chưa đọc`} />
            )}
          </div>
        </div>
      </div>

      {voteCount > 0 && (
        <div
          className={styles.votersContainer}
          onClick={handleVotersClick}
          onKeyDown={handleVotersKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Xem danh sách ${voters.length} người vote cho ${name}`}
        >
          {displayedVoters.map((voter, index) => (
            <div
              key={voter._id}
              className={styles.voterAvatar}
              style={{ zIndex: displayedVoters.length - index }}
            >
              <img
                src={voter.image}
                alt={voter.name}
                className={styles.voterAvatarImage}
              />
            </div>
          ))}
          {remainingCount > 0 && (
            <div className={`${styles.voterAvatar} ${styles.remainingCount}`}>
              <span className={styles.remainingCountText}>+{remainingCount}</span>
            </div>
          )}
        </div>
      )}

      {children}

      <VotersModal
        isOpen={isVotersModalOpen}
        onClose={() => setIsVotersModalOpen(false)}
        userId={id}
        userName={name}
        onVoterClick={onScrollToUser}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={handleCommentModalClose}
        userId={id}
        userName={name}
        onLoginClick={onLoginClick}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
};

export default React.memo(UserCard);
