import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { messagesAPI } from '../config/api';
import { Conversation, Group } from '../types/message';
import { formatDistanceToNow } from 'date-fns';
import Header from '../components/Header';
import MenuDrawer from '../components/MenuDrawer';
import { Plus } from 'lucide-react-native';

export default function ConversationsScreen({ navigation }: any) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  // const { testNotificationWithReply } = useNotifications(); // Hidden for now, may need later for debugging
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'groups'>('conversations');
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    loadData();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [conversationsData, groupsData, unreadData] = await Promise.all([
        messagesAPI.getConversations(),
        messagesAPI.getGroups(),
        messagesAPI.getUnreadCount().catch(() => ({ totalUnread: 0 })),
      ]);
      
      // Sort conversations by last message time (most recent first)
      const sortedConversations = [...conversationsData].sort((a, b) => {
        const aTime = new Date(a.lastMessage.createdAt).getTime();
        const bTime = new Date(b.lastMessage.createdAt).getTime();
        return bTime - aTime; // Descending order (most recent first)
      });
      
      // Sort groups by last message time (most recent first)
      const sortedGroups = [...groupsData].sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime; // Descending order (most recent first)
      });
      
      setConversations(sortedConversations);
      setGroups(sortedGroups);
      setTotalUnreadCount(unreadData.totalUnread || 0);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Helper function to get initials from name
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Helper function to generate consistent color from name
  const getAvatarColor = (name: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#A8E6CF', '#DCEDC8', '#FFD3B6', '#FFAAA5',
      '#FF9A9E', '#FECFEF', '#FAD0C4', '#DDA0DD',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#74B9FF',
      '#FD79A8', '#FDCB6E', '#00B894', '#6C5CE7',
      '#A29BFE', '#00CEC9', '#0984E3', '#E17055',
      '#D63031', '#E84393', '#636E72', '#2D3436'
    ];
    const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[seed % colors.length];
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const messageDate = new Date(item.lastMessage.createdAt);
    const isToday = messageDate.toDateString() === new Date().toDateString();
    const timeAgo = isToday 
      ? new Date(messageDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : formatDistanceToNow(messageDate, { addSuffix: true });
    
    const senderName = item.user.name || 'Unknown';
    const initials = getInitials(senderName);
    const avatarColor = getAvatarColor(senderName);
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem, 
          { 
            backgroundColor: theme.isDark ? '#0B141A' : '#FFFFFF',
            borderBottomColor: theme.isDark ? '#1E2428' : '#E4E6E9'
          }
        ]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Chat', { userId: item._id, isGroup: false })}
      >
        <View style={styles.avatarContainer}>
          {item.user.image ? (
            <Image source={{ uri: item.user.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, { color: theme.colors.text }]} numberOfLines={1}>
              {senderName}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textTertiary }]}>{timeAgo}</Text>
          </View>
          <View style={styles.lastMessageRow}>
            <Text 
              style={[
                styles.lastMessage, 
                { 
                  color: item.unreadCount > 0 
                    ? (theme.isDark ? theme.colors.text : '#000000')
                    : theme.colors.textSecondary,
                  fontWeight: item.unreadCount > 0 ? '500' : '400'
                }
              ]} 
              numberOfLines={1}
            >
              {item.lastMessage.content}
            </Text>
            {item.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = ({ item }: { item: Group }) => {
    const messageDate = item.lastMessage ? new Date(item.lastMessage.createdAt) : null;
    const isToday = messageDate && messageDate.toDateString() === new Date().toDateString();
    const timeAgo = messageDate
      ? (isToday 
          ? messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          : formatDistanceToNow(messageDate, { addSuffix: true }))
      : '';
    
    const groupName = item.name || 'Group';
    const initials = getInitials(groupName);
    const avatarColor = getAvatarColor(groupName);
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem, 
          { 
            backgroundColor: theme.isDark ? '#0B141A' : '#FFFFFF',
            borderBottomColor: theme.isDark ? '#1E2428' : '#E4E6E9'
          }
        ]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Chat', { userId: item._id, isGroup: true })}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, { color: theme.colors.text }]} numberOfLines={1}>
              {groupName}
            </Text>
            {timeAgo && <Text style={[styles.time, { color: theme.colors.textTertiary }]}>{timeAgo}</Text>}
          </View>
          {item.lastMessage && (
            <View style={styles.lastMessageRow}>
              <Text 
                style={[
                  styles.lastMessage, 
                  { 
                    color: item.unreadCount > 0 
                      ? (theme.isDark ? theme.colors.text : '#000000')
                      : theme.colors.textSecondary,
                    fontWeight: item.unreadCount > 0 ? '500' : '400'
                  }
                ]} 
                numberOfLines={1}
              >
                {item.lastMessage.content}
              </Text>
              {item.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.badgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const chatBackground = theme.isDark ? '#0B141A' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: chatBackground }]} edges={['top']}>
      <Header
        title="Conversations"
        onMenuPress={() => setIsMenuOpen(true)}
        isMenuOpen={isMenuOpen}
        onHomePress={() => {
          // Already on home screen, just close menu if open
          if (isMenuOpen) {
            setIsMenuOpen(false);
          }
        }}
        showHomeButton={false}
        unreadCount={totalUnreadCount}
      />
      <View style={[styles.container, { backgroundColor: chatBackground }]}>
        <View style={[
          styles.tabContainer, 
          { 
            borderBottomColor: theme.isDark ? '#1E2428' : '#E4E6E9',
            backgroundColor: chatBackground
          }
        ]}>
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === 'conversations' && { 
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 3
              }
            ]}
            onPress={() => setActiveTab('conversations')}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.colors.textSecondary },
                activeTab === 'conversations' && { color: theme.colors.primary, fontWeight: '600' },
              ]}
            >
              Conversations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === 'groups' && { 
                borderBottomColor: theme.colors.primary,
                borderBottomWidth: 3
              }
            ]}
            onPress={() => setActiveTab('groups')}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.colors.textSecondary },
                activeTab === 'groups' && { color: theme.colors.primary, fontWeight: '600' },
              ]}
            >
              Groups
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={activeTab === 'conversations' ? conversations : groups}
          renderItem={activeTab === 'conversations' ? renderConversationItem : renderGroupItem}
          keyExtractor={(item) => item._id}
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                No {activeTab === 'conversations' ? 'conversations' : 'groups'} yet
              </Text>
            </View>
          }
        />
      </View>
      {(user?.role === 'organization' || user?.role === 'admin' || user?.role === 'mentor') && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('SelectUser', { 
            mode: activeTab === 'conversations' ? 'conversation' : 'group' 
          })}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {/* Debug: Test notification with reply - Hidden for now, may need later for debugging */}
      {/* <TouchableOpacity
        style={[styles.testButton, { backgroundColor: theme.colors.primary + '80' }]}
        onPress={testNotificationWithReply}
        onLongPress={() => console.log('Test notification button pressed')}
      >
        <Text style={styles.testButtonText}>🧪 Test Reply</Text>
      </TouchableOpacity> */}
      <MenuDrawer visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    paddingTop: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listContent: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    minHeight: 72,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    justifyContent: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
  },
  time: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '400',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
  },
  testButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

