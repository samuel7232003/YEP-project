import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { fetchUserProfile } from '../../store/slices/votingSlice';
import { votingApi } from '../../services/votingApi';
import styles from './ResetPasswordModal.module.css';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSuccess: () => void;
  preventClose?: boolean; // If true, prevents closing the modal (forces reset)
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onResetSuccess, preventClose = false }) => {
  const dispatch = useAppDispatch();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setLoading(false);
      hasAutoSubmittedRef.current = false;
    }
  }, [isOpen]);

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setNewPassword(value);
      setError('');
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setConfirmPassword(value);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length !== 6) {
      setError('Mật khẩu phải gồm 6 số');
      return;
    }

    if (!confirmPassword) {
      setError('Vui lòng xác nhận mật khẩu');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const response = await votingApi.resetPassword(newPassword);
      if (response.success) {
        // Refresh user profile to get updated isResetPassword status
        await dispatch(fetchUserProfile());
        onResetSuccess();
        onClose();
      } else {
        setError(response.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra. Vui lòng thử lại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when both passwords are 6 digits and match
  useEffect(() => {
    if (
      newPassword.length === 6 &&
      confirmPassword.length === 6 &&
      newPassword === confirmPassword &&
      !loading &&
      !error &&
      !hasAutoSubmittedRef.current
    ) {
      hasAutoSubmittedRef.current = true;
      const performSubmit = async () => {
        setError('');

        if (!newPassword || newPassword.length !== 6) {
          setError('Mật khẩu phải gồm 6 số');
          hasAutoSubmittedRef.current = false;
          return;
        }

        if (!confirmPassword || confirmPassword.length !== 6) {
          setError('Vui lòng xác nhận mật khẩu');
          hasAutoSubmittedRef.current = false;
          return;
        }

        if (newPassword !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp');
          hasAutoSubmittedRef.current = false;
          return;
        }

        setLoading(true);

        try {
          const response = await votingApi.resetPassword(newPassword);
          if (response.success) {
            // Refresh user profile to get updated isResetPassword status
            await dispatch(fetchUserProfile());
            onResetSuccess();
            onClose();
          } else {
            setError(response.message || 'Đặt lại mật khẩu thất bại');
            hasAutoSubmittedRef.current = false;
          }
        } catch (err: any) {
          const errorMessage = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra. Vui lòng thử lại';
          setError(errorMessage);
          hasAutoSubmittedRef.current = false;
        } finally {
          setLoading(false);
        }
      };
      performSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPassword, confirmPassword, loading, error]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading && !preventClose) {
      onClose();
    }
  };

  const handleCloseClick = () => {
    if (!loading && !preventClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {!preventClose && (
          <button
            className={styles.closeButton}
            onClick={handleCloseClick}
            aria-label="Đóng"
            tabIndex={0}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!loading) {
                  handleCloseClick();
                }
              }
            }}
          >
            ×
          </button>
        )}

        <h2 className={styles.title}>Đặt lại mật khẩu</h2>

        <p className={styles.description}>
          Vì sự cố kĩ thuật, bạn vui lòng đặt lại mật khẩu để tiếp tục
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="newPassword" className={styles.label}>
              Mật khẩu mới (6 số) <span className={styles.required}>*</span>
            </label>
            <input
              id="newPassword"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPassword}
              onChange={handleNewPasswordChange}
              className={styles.input}
              placeholder="Nhập 6 số"
              maxLength={6}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Xác nhận mật khẩu (6 số) <span className={styles.required}>*</span>
            </label>
            <input
              id="confirmPassword"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={styles.input}
              placeholder="Nhập lại 6 số"
              maxLength={6}
              required
              disabled={loading}
            />
            <small className={styles.helpText}>
              Vui lòng nhập lại mật khẩu mới để xác nhận
            </small>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default React.memo(ResetPasswordModal);
