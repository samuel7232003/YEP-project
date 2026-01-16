import React, { useState, useEffect } from 'react';
import { votingApi, Voter } from '../../services/votingApi';
import VotersModal from '../VotersModal/VotersModal';
import styles from './UserCard.module.css';

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
  children
}) => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);

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
        <button
          className={`${styles.voteButton} ${isVoted ? styles.votedButton : ''} ${isButtonDisabled ? styles.disabled : ''}`}
          onClick={handleVoteClick}
          onKeyDown={handleVoteKeyDown}
          disabled={isButtonDisabled}
          aria-label={isVoted ? `Bỏ bình chọn cho ${name}` : `Bình chọn cho ${name}`}
          tabIndex={0}
        >
          {isVoting ? 'Đang tải...' : isVoted ? 'Bỏ nghi ngờ' : 'Nghi ngờ'}
        </button>
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
    </div>
  );
};

export default React.memo(UserCard);
