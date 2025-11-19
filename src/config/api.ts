import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './constants';

const BASE_URL = API_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Enhanced error logging for debugging
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout - server took too long to respond');
      console.error('API URL:', BASE_URL);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('🔌 Connection refused - is the server running?');
      console.error('API URL:', BASE_URL);
      console.error('Make sure:');
      console.error('1. Backend server is running on port 3001');
      console.error('2. Your phone and computer are on the same Wi-Fi network');
      console.error('3. The IP address in constants.ts matches your computer\'s IP');
    } else if (error.response) {
      // Server responded with error status
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
      console.error('API URL:', BASE_URL);
    }
    return Promise.reject(error);
  }
);

// Auth endpoints - Using standalone API with JWT
export const authAPI = {
  signIn: async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/auth/signin', {
        email,
        password,
      });

      if (response.data.token) {
        // Store JWT token
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }

      throw new Error('Login failed - no token received');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },
  
  getCurrentUser: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return null;

      const response = await apiClient.get('/api/auth/me');
      return response.data;
    } catch (error: any) {
      // Token might be invalid, clear it
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      return null;
    }
  },
  
  signOut: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('session');
  },
};

// Messages endpoints - Using standalone REST API
export const messagesAPI = {
  getConversations: async () => {
    try {
      const response = await apiClient.get('/api/messages/conversations');
      return response.data || [];
    } catch (error: any) {
      throw error;
    }
  },
  
  getMessages: async (userId: string, limit: number = 20, cursor?: string) => {
    try {
      const params: any = { limit };
      if (cursor) params.cursor = cursor;
      const response = await apiClient.get(`/api/messages/messages/${userId}`, { params });
      return response.data || { messages: [], nextCursor: null };
    } catch (error: any) {
      throw error;
    }
  },
  
  sendMessage: async (receiverId: string, content: string) => {
    try {
      const response = await apiClient.post('/api/messages/messages', {
        receiverId,
        content,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
  
  markAsRead: async (conversationId: string) => {
    try {
      const response = await apiClient.post(`/api/messages/conversations/${conversationId}/read`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
  
  getGroups: async () => {
    try {
      const response = await apiClient.get('/api/messages/groups');
      return response.data || [];
    } catch (error: any) {
      throw error;
    }
  },
  
  getGroupMessages: async (groupId: string, limit: number = 20, cursor?: string) => {
    try {
      const params: any = { limit };
      if (cursor) params.cursor = cursor;
      const response = await apiClient.get(`/api/messages/groups/${groupId}/messages`, { params });
      return response.data || { messages: [], nextCursor: null };
    } catch (error: any) {
      throw error;
    }
  },
  
  sendGroupMessage: async (groupId: string, content: string) => {
    try {
      const response = await apiClient.post(`/api/messages/groups/${groupId}/messages`, {
        content,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  createGroup: async (name: string, description: string, memberIds: string[], isOrganizationGroup?: boolean, opportunityId?: string) => {
    try {
      const response = await apiClient.post('/api/messages/groups', {
        name,
        description,
        memberIds,
        isOrganizationGroup,
        opportunityId,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  updateGroup: async (groupId: string, name?: string, description?: string) => {
    try {
      const response = await apiClient.put(`/api/messages/groups/${groupId}`, {
        name,
        description,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  addGroupMembers: async (groupId: string, memberIds: string[]) => {
    try {
      const response = await apiClient.post(`/api/messages/groups/${groupId}/members`, {
        memberIds,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  removeGroupMember: async (groupId: string, memberId: string) => {
    try {
      const response = await apiClient.delete(`/api/messages/groups/${groupId}/members/${memberId}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      const response = await apiClient.delete(`/api/messages/groups/${groupId}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await apiClient.get('/api/messages/unread-count');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};

// Users endpoints
export const usersAPI = {
  getAvailableUsers: async (page: number = 1, limit: number = 50, search?: string) => {
    try {
      const params: any = { page, limit };
      if (search) params.search = search;
      const response = await apiClient.get('/api/users/available', { params });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};

// Notifications endpoints
export const notificationsAPI = {
  registerDeviceToken: async (expoPushToken: string) => {
    try {
      const response = await apiClient.post('/api/notifications/register-token', {
        expoPushToken,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  unregisterDeviceToken: async () => {
    try {
      const response = await apiClient.post('/api/notifications/unregister-token');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};

