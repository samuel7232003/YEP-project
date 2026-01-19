import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, clearError } from '../../store/slices/votingSlice';
import { votingApi } from '../../services/votingApi';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

type LoginMode = 'first-time' | 'registered';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.voting);

  const [mode, setMode] = useState<LoginMode>('registered');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [usernames, setUsernames] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedUsername('');
      setPassword('');
      setLocalError('');
      dispatch(clearError());
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (isOpen) {
      // Fetch usernames based on selected mode
      const fetchUsernames = async () => {
        try {
          // false = users without password (first-time), true = users with password (registered)
          const hasPassword = mode === 'registered';
          const response = await votingApi.getUsernames(hasPassword);
          if (response.success) {
            setUsernames(response.data);
            // Reset selected username when mode changes
            setSelectedUsername('');
          }
        } catch (error) {
          console.error('Error fetching usernames:', error);
        }
      };
      fetchUsernames();
    }
  }, [isOpen, mode]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUsername(e.target.value);
    setLocalError('');
    dispatch(clearError());
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setPassword(value);
      setLocalError('');
      dispatch(clearError());
    }
  };

  const performLogin = async () => {
    if (!selectedUsername) {
      setLocalError('Vui lòng chọn tên người dùng');
      return;
    }

    // Password is required
    if (!password) {
      setLocalError('Vui lòng nhập mật khẩu');
      return;
    }

    if (password.length !== 6) {
      setLocalError('Mật khẩu phải gồm 6 số');
      return;
    }

    setLocalError('');
    dispatch(clearError());

    try {
      // Login with password (required for all users)
      // For first-time login, password will be set as initial password
      // For subsequent logins, password must match
      const loginResult = await dispatch(loginUser({ username: selectedUsername, password }));

      if (loginUser.fulfilled.match(loginResult)) {
        onLoginSuccess();
        onClose();
      } else if (loginUser.rejected.match(loginResult)) {
        // Login failed - clear password field and show error message
        setPassword('');
        const errorMessage = loginResult.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập';
        setLocalError(errorMessage);
      }
    } catch (err: any) {
      // Login failed - clear password field
      setPassword('');
      const errorMessage = err?.message || 'Có lỗi xảy ra. Vui lòng thử lại';
      setLocalError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin();
  };

  // Auto-login when 6 digits are entered
  useEffect(() => {
    if (password.length === 6 && selectedUsername && !loading) {
      performLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password.length, selectedUsername]);

  const handleModeChange = (newMode: LoginMode) => {
    setMode(newMode);
    setSelectedUsername('');
    setPassword('');
    setLocalError('');
    dispatch(clearError());
  };

  const handleClose = () => {
    setMode('registered');
    setSelectedUsername('');
    setPassword('');
    setLocalError('');
    dispatch(clearError());
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const displayError = localError || error;

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Đóng"
          tabIndex={0}
          disabled={loading}
        >
          ×
        </button>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.modeSelector}>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'first-time' ? styles.modeButtonActive : ''}`}
              onClick={() => handleModeChange('first-time')}
              disabled={loading}
            >
              Vào lần đầu
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'registered' ? styles.modeButtonActive : ''}`}
              onClick={() => handleModeChange('registered')}
              disabled={loading}
            >
              Đã đăng kí
            </button>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Chọn tên người dùng
            </label>
            <select
              id="username"
              value={selectedUsername}
              onChange={handleUsernameChange}
              className={styles.select}
              required
              disabled={loading}
            >
              <option value="">-- Chọn tên người dùng --</option>
              {usernames.map((username) => (
                <option key={username} value={username}>
                  {username}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Mật khẩu (6 số) <span className={styles.required}>*</span>
            </label>
            <input
              id="password"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={password}
              onChange={handlePasswordChange}
              className={styles.input}
              placeholder="Nhập 6 số"
              maxLength={6}
              required
              disabled={loading || !selectedUsername}
            />
            <small className={styles.helpText}>
              {mode === 'first-time'
                ? 'Vui lòng nhập mật khẩu cho lần đăng nhập sau (6 số). Mật khẩu này sẽ được sử dụng cho các lần đăng nhập tiếp theo.'
                : 'Vui lòng nhập đúng mật khẩu khi bạn vào lần đầu (6 số).'}
            </small>
          </div>

          {displayError && <div className={styles.error}>{displayError}</div>}
        </form>
      </div>
    </div>
  );
};

export default React.memo(LoginModal);
