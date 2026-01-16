import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { votingApi, Voter } from '../../services/votingApi';
import styles from './VotersModal.module.css';

interface VotersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onVoterClick?: (userId: string) => void;
}

const VotersModal: React.FC<VotersModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onVoterClick,
}) => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && userId) {
      const fetchVoters = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await votingApi.getVoters(userId);
          if (response.success) {
            setVoters(response.data);
          } else {
            setError('Không thể tải danh sách người vote');
          }
        } catch (err) {
          console.error('Error fetching voters:', err);
          setError('Không thể tải danh sách người vote');
        } finally {
          setLoading(false);
        }
      };

      fetchVoters();
    }
  }, [isOpen, userId]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleVoterClick = (voterId: string) => {
    if (onVoterClick) {
      onVoterClick(voterId);
    }
    onClose();
  };

  const handleVoterKeyDown = (e: React.KeyboardEvent, voterId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleVoterClick(voterId);
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
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Đóng"
          tabIndex={0}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClose();
            }
          }}
        >
          ×
        </button>

        <h2 className={styles.title}>Danh sách người vote cho {userName}</h2>

        {loading && (
          <div className={styles.loading}>Đang tải...</div>
        )}

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        {!loading && !error && (
          <div className={styles.votersList}>
            {voters.length === 0 ? (
              <div className={styles.empty}>Chưa có ai vote cho {userName}</div>
            ) : (
              voters.map((voter) => (
                <div
                  key={voter._id}
                  className={styles.voterItem}
                  onClick={() => handleVoterClick(voter._id)}
                  onKeyDown={(e) => handleVoterKeyDown(e, voter._id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Xem ${voter.name}`}
                >
                  <div className={styles.avatarContainer}>
                    <img
                      src={voter.image}
                      alt={voter.name}
                      className={styles.avatar}
                    />
                  </div>
                  <span className={styles.voterName}>{voter.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default VotersModal;
