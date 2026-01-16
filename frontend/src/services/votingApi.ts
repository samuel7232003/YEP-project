import axiosInstance from '../utils/axiosConfig';

export interface VotingUser {
  _id: string;
  name: string;
  image: string;
  voteCount: number;
  status?: string;
}

export interface Voter {
  _id: string;
  name: string;
  image: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      _id: string;
      username: string;
    };
    token: string;
  };
}

export interface VotingUsersResponse {
  success: boolean;
  data: VotingUser[];
}

export interface VoteResponse {
  success: boolean;
  message: string;
  data: {
    action: 'added' | 'removed';
    votes: string[];
  };
}

export interface AdminUser {
  _id: string;
  username?: string;
  password: string;
  name?: string;
  image?: string;
  voteCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUsersResponse {
  success: boolean;
  data: AdminUser[];
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
  data: AdminUser;
}

export const votingApi = {
  // Auth
  register: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/auth/register', { username, password });
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/auth/login', { username, password });
    return response.data;
  },

  getProfile: async (): Promise<{ success: boolean; data: { _id: string; username: string; name?: string; image?: string; status?: string } }> => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
  },

  uploadAvatar: async (formData: FormData): Promise<{ success: boolean; data: { imageUrl: string } }> => {
    const response = await axiosInstance.post('/auth/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateProfile: async (data: { name?: string; image?: string; password?: string; status?: string }): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await axiosInstance.put('/auth/profile', data);
    return response.data;
  },

  getUsernames: async (): Promise<{ success: boolean; data: string[] }> => {
    const response = await axiosInstance.get('/auth/usernames');
    return response.data;
  },

  // Voting
  getUsers: async (): Promise<VotingUsersResponse> => {
    const response = await axiosInstance.get('/voting/users');
    return response.data;
  },

  getMyVotes: async (): Promise<{ success: boolean; data: string[] }> => {
    const response = await axiosInstance.get('/voting/my-votes');
    return response.data;
  },

  vote: async (userId: string): Promise<VoteResponse> => {
    const response = await axiosInstance.post('/voting/vote', { userId });
    return response.data;
  },

  getVoters: async (userId: string): Promise<{ success: boolean; data: Voter[] }> => {
    const response = await axiosInstance.get(`/voting/users/${userId}/voters`);
    return response.data;
  },

  initDefaultUsers: async (): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.post('/voting/init-default-users');
    return response.data;
  },

  // Admin
  getAdminUsers: async (adminPassword: string): Promise<AdminUsersResponse> => {
    const credentials = btoa(`admin:${adminPassword}`);
    const response = await axiosInstance.get('/admin/users', {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });
    return response.data;
  },

  createAdminUser: async (
    username: string,
    password: string,
    name?: string,
    image?: string,
    adminPassword?: string
  ): Promise<CreateUserResponse> => {
    const headers: Record<string, string> = {};
    if (adminPassword) {
      const credentials = btoa(`admin:${adminPassword}`);
      headers.Authorization = `Basic ${credentials}`;
    }
    const body: Record<string, any> = { username, name, image };
    // Only include password if provided
    if (password) {
      body.password = password;
    }
    const response = await axiosInstance.post(
      '/admin/users',
      body,
      { headers }
    );
    return response.data;
  },
};
