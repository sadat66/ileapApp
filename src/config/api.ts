import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './constants';

const BASE_URL = API_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't override Content-Type if it's multipart/form-data (for file uploads)
    if (config.headers['Content-Type'] === 'multipart/form-data') {
      delete config.headers['Content-Type']; // Let axios set it automatically with boundary
    }
    return config;
  },
  (error) => {
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
    } catch (error) {
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
    const response = await apiClient.get('/api/messages/conversations');
    return response.data || [];
  },
  
  getMessages: async (userId: string, limit: number = 20, cursor?: string) => {
    const params: any = { limit };
    if (cursor) params.cursor = cursor;
    const response = await apiClient.get(`/api/messages/messages/${userId}`, { params });
    return response.data || { messages: [], nextCursor: null };
  },
  
  sendMessage: async (receiverId: string, content: string, mediaUri?: string) => {
    const formData = new FormData();
    formData.append('receiverId', receiverId);
    formData.append('content', content);
    
    if (mediaUri) {
      // Extract file name and type from URI
      const uriParts = mediaUri.split('/');
      const fileName = uriParts[uriParts.length - 1] || 'media';
      const fileExtension = fileName.split('.').pop() || 'jpg';
      
      // Determine mime type from extension
      let mimeType = 'image/jpeg';
      if (fileExtension === 'mp4' || fileExtension === 'mov' || fileExtension === 'avi') {
        mimeType = 'video/mp4';
      } else if (fileExtension === 'png') {
        mimeType = 'image/png';
      } else if (fileExtension === 'gif') {
        mimeType = 'image/gif';
      }
      
      formData.append('media', {
        uri: mediaUri,
        type: mimeType,
        name: fileName,
      } as any);
    }
    
    const response = await apiClient.post('/api/messages/messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  markAsRead: async (conversationId: string) => {
    const response = await apiClient.post(`/api/messages/conversations/${conversationId}/read`);
    return response.data;
  },
  
  getGroups: async () => {
    const response = await apiClient.get('/api/messages/groups');
    return response.data || [];
  },
  
  getGroupMessages: async (groupId: string, limit: number = 20, cursor?: string) => {
    const params: any = { limit };
    if (cursor) params.cursor = cursor;
    const response = await apiClient.get(`/api/messages/groups/${groupId}/messages`, { params });
    return response.data || { messages: [], nextCursor: null };
  },
  
  sendGroupMessage: async (groupId: string, content: string, mediaUri?: string) => {
    const formData = new FormData();
    formData.append('content', content);
    
    if (mediaUri) {
      // Extract file name and type from URI
      const uriParts = mediaUri.split('/');
      const fileName = uriParts[uriParts.length - 1] || 'media';
      const fileExtension = fileName.split('.').pop() || 'jpg';
      
      // Determine mime type from extension
      let mimeType = 'image/jpeg';
      if (fileExtension === 'mp4' || fileExtension === 'mov' || fileExtension === 'avi') {
        mimeType = 'video/mp4';
      } else if (fileExtension === 'png') {
        mimeType = 'image/png';
      } else if (fileExtension === 'gif') {
        mimeType = 'image/gif';
      }
      
      formData.append('media', {
        uri: mediaUri,
        type: mimeType,
        name: fileName,
      } as any);
    }
    
    const response = await apiClient.post(`/api/messages/groups/${groupId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  createGroup: async (name: string, description: string, memberIds: string[], isOrganizationGroup?: boolean, opportunityId?: string) => {
    const response = await apiClient.post('/api/messages/groups', {
      name,
      description,
      memberIds,
      isOrganizationGroup,
      opportunityId,
    });
    return response.data;
  },

  updateGroup: async (groupId: string, name?: string, description?: string) => {
    const response = await apiClient.put(`/api/messages/groups/${groupId}`, {
      name,
      description,
    });
    return response.data;
  },

  addGroupMembers: async (groupId: string, memberIds: string[]) => {
    const response = await apiClient.post(`/api/messages/groups/${groupId}/members`, {
      memberIds,
    });
    return response.data;
  },

  removeGroupMember: async (groupId: string, memberId: string) => {
    const response = await apiClient.delete(`/api/messages/groups/${groupId}/members/${memberId}`);
    return response.data;
  },

  deleteGroup: async (groupId: string) => {
    const response = await apiClient.delete(`/api/messages/groups/${groupId}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/api/messages/unread-count');
    return response.data;
  },
};

// Users endpoints
export const usersAPI = {
  getAvailableUsers: async (page: number = 1, limit: number = 50, search?: string) => {
    const params: any = { page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/api/users/available', { params });
    return response.data;
  },
};

// Notifications endpoints
export const notificationsAPI = {
  registerDeviceToken: async (expoPushToken: string) => {
    const response = await apiClient.post('/api/notifications/register-token', {
      expoPushToken,
    });
    return response.data;
  },

  unregisterDeviceToken: async () => {
    const response = await apiClient.post('/api/notifications/unregister-token');
    return response.data;
  },
};

