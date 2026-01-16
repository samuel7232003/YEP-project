import React, { useState, useEffect, useRef } from 'react';
import { votingApi } from '../../services/votingApi';
import styles from './EditProfileModal.module.css';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
  currentProfile: {
    name?: string;
    image?: string;
  } | null;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpdateSuccess,
  currentProfile 
}) => {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialValues, setInitialValues] = useState({
    name: '',
    image: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentProfile) {
      const initialName = currentProfile.name || '';
      const initialImage = currentProfile.image || '';
      setName(initialName);
      setImage(initialImage);
      setPreviewUrl(initialImage || null);
      setImageFile(null);
      setPassword('');
      setConfirmPassword('');
      setError('');
      setInitialValues({
        name: initialName,
        image: initialImage,
      });
    }
  }, [isOpen, currentProfile]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setPassword(value);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Chỉ chấp nhận file ảnh');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước file không được vượt quá 5MB');
        return;
      }

      setImageFile(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate password if provided
      if (password || confirmPassword) {
        if (password.length !== 6) {
          setError('Mật khẩu phải gồm 6 số');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp');
          setLoading(false);
          return;
        }
      }

      let imageUrl = image;

      // Upload new image if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('avatar', imageFile);

        const uploadResponse = await votingApi.uploadAvatar(formData);
        if (uploadResponse.success) {
          imageUrl = uploadResponse.data.imageUrl;
        } else {
          throw new Error('Lỗi khi upload ảnh');
        }
      }

      // Update profile
      const updateData: { name?: string; image?: string; password?: string } = {};
      if (name.trim()) {
        updateData.name = name.trim();
      }
      if (imageUrl) {
        updateData.image = imageUrl;
      }
      if (password) {
        updateData.password = password;
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
    setName('');
    setImage('');
    setImageFile(null);
    setPreviewUrl(null);
    setPassword('');
    setConfirmPassword('');
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

  const hasChanges = (): boolean => {
    // Check if name changed
    if (name.trim() !== initialValues.name) {
      return true;
    }

    // Check if image changed (new file uploaded or image URL changed)
    if (imageFile) {
      return true;
    }
    if (image !== initialValues.image) {
      return true;
    }

    // Check if password is being changed
    if (password && password.length === 6) {
      return true;
    }

    return false;
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
      aria-labelledby="edit-profile-title"
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

        <h2 id="edit-profile-title" className={styles.title}>Chỉnh sửa tài khoản</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="avatar" className={styles.label}>
              Avatar
            </label>
            <div className={styles.avatarSection}>
              <div 
                className={styles.avatarPreview}
                onClick={handleAvatarClick}
                role="button"
                tabIndex={0}
                aria-label="Chọn ảnh đại diện"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAvatarClick();
                  }
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar preview" className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <span>+</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={handleAvatarClick}
                className={styles.avatarButton}
                disabled={loading}
              >
                Chọn ảnh
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              Tên hiển thị
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              className={styles.input}
              placeholder="Nhập tên hiển thị"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Mật khẩu mới (6 số)
            </label>
            <input
              id="password"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={password}
              onChange={handlePasswordChange}
              className={styles.input}
              placeholder="Nhập mật khẩu mới (để trống nếu không đổi)"
              maxLength={6}
              disabled={loading}
            />
            <small className={styles.helpText}>
              Để trống nếu không muốn thay đổi mật khẩu
            </small>
          </div>

          {password && (
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Xác nhận mật khẩu mới
              </label>
              <input
                id="confirmPassword"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                className={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                maxLength={6}
                disabled={loading}
              />
            </div>
          )}

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
              disabled={loading || !hasChanges()}
            >
              {loading ? 'Đang xử lý...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(EditProfileModal);
