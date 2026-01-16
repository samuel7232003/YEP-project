import React, { useState, useEffect } from 'react';
import { votingApi, AdminUser } from '../../services/votingApi';
import styles from './AdminPage.module.css';

const AdminPage = () => {
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Form state for creating new user
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    image: '',
  });
  const [creating, setCreating] = useState<boolean>(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    name: '',
    image: '',
    status: '',
  });
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    // Check if admin is already authenticated
    const storedPassword = sessionStorage.getItem('adminPassword');
    if (storedPassword) {
      setAdminPassword(storedPassword);
      setIsAuthenticated(true);
      fetchUsers(storedPassword);
    }
  }, []);

  const fetchUsers = async (password: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await votingApi.getAdminUsers(password);
      if (response.success) {
        setUsers(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi lấy danh sách người dùng');
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('adminPassword');
        setAdminPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setError('Vui lòng nhập mật khẩu admin');
      return;
    }

    setError('');
    try {
      // Try to fetch users to verify password
      await fetchUsers(adminPassword);
      setIsAuthenticated(true);
      sessionStorage.setItem('adminPassword', adminPassword);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Mật khẩu admin không đúng');
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminPassword');
    setAdminPassword('');
    setUsers([]);
    setError('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username) {
      setError('Username là bắt buộc');
      return;
    }

    // Validate password format only if provided
    if (newUser.password && !/^\d{6}$/.test(newUser.password)) {
      setError('Password phải gồm 6 số');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const response = await votingApi.createAdminUser(
        newUser.username,
        newUser.password || '',
        newUser.name || undefined,
        newUser.image || undefined,
        adminPassword
      );
      if (response.success) {
        // Refresh users list
        await fetchUsers(adminPassword);
        // Reset form
        setNewUser({
          username: '',
          password: '',
          name: '',
          image: '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tạo người dùng');
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (field: keyof typeof newUser, value: string) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminPassword(e.target.value);
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit(e);
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      username: user.username || '',
      password: '',
      name: user.name || '',
      image: user.image || '',
      status: user.status || '',
    });
    setError('');
  };

  const handleCloseEditModal = () => {
    setEditingUser(null);
    setEditForm({
      username: '',
      password: '',
      name: '',
      image: '',
      status: '',
    });
    setError('');
  };

  const handleEditInputChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password format only if provided
    if (editForm.password && !/^\d{6}$/.test(editForm.password)) {
      setError('Password phải gồm 6 số');
      return;
    }

    if (!editingUser) return;

    setUpdating(true);
    setError('');
    try {
      const updateData: {
        username?: string;
        password?: string;
        name?: string;
        image?: string;
        status?: string;
      } = {};

      if (editForm.username !== editingUser.username) {
        updateData.username = editForm.username;
      }
      if (editForm.password) {
        updateData.password = editForm.password;
      }
      if (editForm.name !== (editingUser.name || '')) {
        updateData.name = editForm.name || undefined;
      }
      if (editForm.image !== (editingUser.image || '')) {
        updateData.image = editForm.image || undefined;
      }
      if (editForm.status !== (editingUser.status || '')) {
        updateData.status = editForm.status || undefined;
      }

      const response = await votingApi.updateAdminUser(
        editingUser._id,
        updateData,
        adminPassword
      );
      if (response.success) {
        // Refresh users list
        await fetchUsers(adminPassword);
        // Close modal
        handleCloseEditModal();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi cập nhật người dùng');
    } finally {
      setUpdating(false);
    }
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      handleCloseEditModal();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.authContainer}>
          <h1 className={styles.title}>Admin Login</h1>
          <form onSubmit={handlePasswordSubmit} className={styles.authForm}>
            <div className={styles.formGroup}>
              <label htmlFor="adminPassword" className={styles.label}>
                Admin Password
              </label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={handlePasswordInputChange}
                onKeyDown={handlePasswordKeyDown}
                className={styles.input}
                placeholder="Nhập mật khẩu admin"
                autoFocus
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.button}>
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin - Quản lý người dùng</h1>
        <button
          onClick={handleLogout}
          className={styles.logoutButton}
          tabIndex={0}
          aria-label="Logout"
        >
          Thoát
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        <div className={styles.createSection}>
          <h2 className={styles.sectionTitle}>Tạo người dùng mới</h2>
          <form onSubmit={handleCreateUser} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="username" className={styles.label}>
                  Username *
                </label>
                <input
                  id="username"
                  type="text"
                  value={newUser.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password (6 số) - Tùy chọn
                </label>
                <input
                  id="password"
                  type="text"
                  value={newUser.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={styles.input}
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder="Để trống nếu chưa có mật khẩu"
                />
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Để trống nếu chưa có mật khẩu. Mật khẩu sẽ được tạo tự động khi người dùng bình chọn lần đầu.
                </small>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newUser.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="image" className={styles.label}>
                  Image URL
                </label>
                <input
                  id="image"
                  type="text"
                  value={newUser.image}
                  onChange={(e) => handleInputChange('image', e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={creating}
            >
              {creating ? 'Đang tạo...' : 'Tạo người dùng'}
            </button>
          </form>
        </div>

        <div className={styles.usersSection}>
          <h2 className={styles.sectionTitle}>Danh sách người dùng ({users.length})</h2>
          {loading && users.length === 0 ? (
            <div className={styles.loading}>Đang tải...</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th>Name</th>
                    <th>Image</th>
                    <th>Status</th>
                    <th>Vote Count</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className={styles.idCell}>{user._id}</td>
                      <td>{user.username || '-'}</td>
                      <td className={styles.passwordCell}>{user.password || '-'}</td>
                      <td>{user.name || '-'}</td>
                      <td>
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || 'User'}
                            className={styles.userImage}
                          />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{user.status || '-'}</td>
                      <td>{user.voteCount ?? '-'}</td>
                      <td>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleString('vi-VN')
                          : '-'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleEditUser(user)}
                          className={styles.editButton}
                          tabIndex={0}
                          aria-label={`Edit user ${user.username || user._id}`}
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className={styles.modalOverlay}
          onClick={handleCloseEditModal}
          onKeyDown={handleModalKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="edit-modal-title" className={styles.modalTitle}>
                Sửa người dùng
              </h2>
              <button
                onClick={handleCloseEditModal}
                className={styles.modalCloseButton}
                tabIndex={0}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-username" className={styles.label}>
                    Username *
                  </label>
                  <input
                    id="edit-username"
                    type="text"
                    value={editForm.username}
                    onChange={(e) => handleEditInputChange('username', e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-password" className={styles.label}>
                    Password (6 số) - Để trống nếu không đổi
                  </label>
                  <input
                    id="edit-password"
                    type="text"
                    value={editForm.password}
                    onChange={(e) => handleEditInputChange('password', e.target.value)}
                    className={styles.input}
                    maxLength={6}
                    pattern="\d{6}"
                    placeholder="Để trống nếu không đổi mật khẩu"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-name" className={styles.label}>
                    Name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleEditInputChange('name', e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-image" className={styles.label}>
                    Image URL
                  </label>
                  <input
                    id="edit-image"
                    type="text"
                    value={editForm.image}
                    onChange={(e) => handleEditInputChange('image', e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-status" className={styles.label}>
                  Status
                </label>
                <input
                  id="edit-status"
                  type="text"
                  value={editForm.status}
                  onChange={(e) => handleEditInputChange('status', e.target.value)}
                  className={styles.input}
                  maxLength={30}
                  placeholder="Trạng thái (tối đa 30 ký tự)"
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className={styles.cancelButton}
                  tabIndex={0}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={updating}
                >
                  {updating ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
