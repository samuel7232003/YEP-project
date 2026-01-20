import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { votingApi, VotingUser } from '../../services/votingApi';

export interface User extends VotingUser {
  id: string;
}

export interface UserProfile {
  _id: string;
  username: string;
  name?: string;
  image?: string;
  status?: string;
  isResetPassword?: boolean;
}

interface VotingState {
  users: User[];
  currentUser: string | null;
  userProfile: UserProfile | null;
  userVotes: string[]; // Array of user IDs that current user has voted for
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: VotingState = {
  users: [],
  currentUser: null,
  userProfile: null,
  userVotes: [],
  token: null,
  loading: false,
  error: null,
};

// Async thunks
export const registerUser = createAsyncThunk(
  'voting/register',
  async ({ username, password }: { username: string; password: string }) => {
    const response = await votingApi.register(username, password);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('username', response.data.user.username);
    return response.data;
  }
);

export const loginUser = createAsyncThunk(
  'voting/login',
  async ({ username, password }: { username: string; password: string }) => {
    const response = await votingApi.login(username, password);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('username', response.data.user.username);
    return response.data;
  }
);

export const fetchUsers = createAsyncThunk('voting/fetchUsers', async () => {
  const response = await votingApi.getUsers();
  return response.data.map((user) => ({
    _id: user._id,
    id: user._id,
    name: user.name,
    image: user.image,
    voteCount: user.voteCount,
    status: user.status,
  }));
});

export const fetchMyVotes = createAsyncThunk('voting/fetchMyVotes', async () => {
  const response = await votingApi.getMyVotes();
  return response.data;
});

export const voteForUser = createAsyncThunk(
  'voting/voteForUser',
  async (userId: string, { dispatch }) => {
    const response = await votingApi.vote(userId);
    // Refresh users to get updated vote counts
    await dispatch(fetchUsers());
    return response.data.votes;
  }
);

export const initDefaultUsers = createAsyncThunk('voting/initDefaultUsers', async () => {
  await votingApi.initDefaultUsers();
});

export const fetchUserProfile = createAsyncThunk('voting/fetchUserProfile', async () => {
  const response = await votingApi.getProfile();
  return response.data;
});

export const updateUserProfile = createAsyncThunk(
  'voting/updateUserProfile',
  async (data: { name?: string; image?: string }) => {
    const response = await votingApi.updateProfile(data);
    return response.data;
  }
);

const votingSlice = createSlice({
  name: 'voting',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<string | null>) => {
      state.currentUser = action.payload;
      if (!action.payload) {
        state.userVotes = [];
        state.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('username');
      }
    },
    loadUserFromStorage: (state) => {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      if (token && username) {
        state.token = token;
        state.currentUser = username;
      }
    },
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload.user.username;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        const errorMessage = action.error.message || 'Đăng ký thất bại. Vui lòng thử lại';
        state.error = errorMessage;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload.user.username;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        // Lấy message từ error, nếu không có thì dùng message mặc định
        const errorMessage = action.error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập';
        state.error = errorMessage;
      })
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi khi tải danh sách người dùng';
      })
      // Fetch my votes
      .addCase(fetchMyVotes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyVotes.fulfilled, (state, action) => {
        state.loading = false;
        state.userVotes = action.payload;
      })
      .addCase(fetchMyVotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi khi tải danh sách votes';
      })
      // Vote for user
      .addCase(voteForUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(voteForUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userVotes = action.payload;
      })
      .addCase(voteForUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Bình chọn thất bại';
      })
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi khi tải thông tin người dùng';
      })
      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Cập nhật thông tin thất bại';
      });
  },
});

export const { setCurrentUser, loadUserFromStorage, setUsers, clearError } = votingSlice.actions;
export default votingSlice.reducer;
