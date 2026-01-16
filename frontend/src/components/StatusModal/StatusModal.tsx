import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { votingApi } from '../../services/votingApi';
import styles from './StatusModal.module.css';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
  currentStatus?: string;
}

const StatusModal: React.FC<StatusModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpdateSuccess,
  currentStatus 
}) => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus || '');
      setError('');
      setShowEmojiPicker(false);
    }
  }, [isOpen, currentStatus]);

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

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 20) {
      setStatus(value);
      setError('');
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const newStatus = status + emoji;
    if (newStatus.length <= 20) {
      setStatus(newStatus);
      setError('');
      // Focus back to input
      inputRef.current?.focus();
    }
    setShowEmojiPicker(false);
  };

  const handleToggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const updateData: { status?: string } = {};
      if (status.trim()) {
        updateData.status = status.trim();
      } else {
        updateData.status = '';
      }

      const updateResponse = await votingApi.updateProfile(updateData);

      if (updateResponse.success) {
        onUpdateSuccess();
        onClose();
      } else {
        throw new Error(updateResponse.message || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra. Vui lòng thử lại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStatus('');
    setError('');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.overlay} 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
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

        <h2 id="status-modal-title" className={styles.title}>Cập nhật trạng thái</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="status" className={styles.label}>
              Trạng thái
            </label>
            <div className={styles.inputContainer}>
              <input
                ref={inputRef}
                id="status"
                type="text"
                value={status}
                onChange={handleStatusChange}
                className={styles.input}
                placeholder="Nhập trạng thái của bạn"
                maxLength={20}
                disabled={loading}
              />
              <button
                type="button"
                className={styles.emojiButton}
                onClick={handleToggleEmojiPicker}
                disabled={loading}
                aria-label="Chọn emoji"
                tabIndex={0}
              >
                😀
              </button>
            </div>
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className={styles.emojiPickerContainer}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  autoFocusSearch={false}
                  skinTonesDisabled={true}
                />
              </div>
            )}
            <small className={styles.helpText}>
              {status.length}/20 ký tự
            </small>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(StatusModal);
