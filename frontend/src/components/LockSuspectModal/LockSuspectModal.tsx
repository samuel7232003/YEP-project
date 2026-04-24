import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { votingApi, VotingUser } from '../../services/votingApi';
import styles from './LockSuspectModal.module.css';

const LOCK_NOTE =
  'Xin lưu ý chỉ được phép chọn 1 lần và không thể thay đổi lựa chọn của bạn';
const CONFIRM_MESSAGE = 'Bạn có chắc chắn chọn người này là nghi phạm không?';

interface LockSuspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  users: Array<{ _id: string; id?: string; name: string; image: string }>;
  onLockSuccess: () => void;
}

type PendingSuspect = { _id: string; name: string; image: string } | null;

const LockSuspectModal: React.FC<LockSuspectModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  users,
  onLockSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [pendingSuspect, setPendingSuspect] = useState<PendingSuspect>(null);

  const filteredUsers = users.filter((u) => {
    const id = u._id || u.id;
    return id && id !== currentUserId;
  });

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) {
      handleClose();
    }
  };

  const handleClose = useCallback(() => {
    if (submitting) return;
    setPendingSuspect(null);
    setError('');
    onClose();
  }, [onClose, submitting]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (pendingSuspect) {
        setPendingSuspect(null);
      } else {
        handleClose();
      }
    }
  };

  const handleUserClick = (user: VotingUser & { _id: string }) => {
    setError('');
    setPendingSuspect({
      _id: user._id,
      name: user.name,
      image: user.image || 'https://via.placeholder.com/150',
    });
  };

  const handleUserKeyDown = (
    e: React.KeyboardEvent,
    user: VotingUser & { _id: string }
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleUserClick(user);
    }
  };

  const handleConfirm = async () => {
    if (!pendingSuspect) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await votingApi.lockSuspect(pendingSuspect._id);
      if (res.success) {
        onLockSuccess();
        handleClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : null;
      setError(msg || 'Chốt nghi phạm thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    if (!submitting) setPendingSuspect(null);
  };

  useEffect(() => {
    if (!isOpen) {
      setPendingSuspect(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-suspect-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          disabled={submitting}
          aria-label="Đóng"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClose();
            }
          }}
        >
          ×
        </button>

        <h2 id="lock-suspect-title" className={styles.title}>
          Chốt nghi phạm
        </h2>

        <p className={styles.note}>{LOCK_NOTE}</p>

        {error && <div className={styles.error}>{error}</div>}

        {!pendingSuspect ? (
          <>
            <div className={styles.userList}>
              {filteredUsers.length === 0 ? (
                <div className={styles.empty}>
                  Không có người nào khác để chọn.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const id = user._id || (user as { id?: string }).id;
                  if (!id) return null;
                  return (
                    <div
                      key={id}
                      className={styles.userItem}
                      onClick={() => handleUserClick({ ...user, _id: id })}
                      onKeyDown={(e) =>
                        handleUserKeyDown(e, { ...user, _id: id })
                      }
                      tabIndex={0}
                      role="button"
                      aria-label={`Chọn ${user.name} làm nghi phạm`}
                    >
                      <div className={styles.avatarContainer}>
                        <img
                          src={user.image || 'https://via.placeholder.com/150'}
                          alt=""
                          className={styles.avatar}
                        />
                      </div>
                      <span className={styles.userName}>{user.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className={styles.confirmSection}>
            <p className={styles.confirmMessage}>{CONFIRM_MESSAGE}</p>
            <div className={styles.confirmSuspect}>
              <div className={styles.avatarContainer}>
                <img
                  src={pendingSuspect.image}
                  alt=""
                  className={styles.avatar}
                />
              </div>
              <span className={styles.userName}>{pendingSuspect.name}</span>
            </div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={`${styles.confirmButton} ${styles.confirmButtonSecondary}`}
                onClick={handleCancelConfirm}
                disabled={submitting}
                aria-label="Hủy"
              >
                Hủy
              </button>
              <button
                type="button"
                className={`${styles.confirmButton} ${styles.confirmButtonPrimary}`}
                onClick={handleConfirm}
                disabled={submitting}
                aria-label="Xác nhận chọn nghi phạm"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LockSuspectModal;
