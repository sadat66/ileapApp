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
    // Poll for new messages every 30 seconds (reduced from 5 seconds)
    // This reduces server load while still keeping data relatively fresh
    const interval = setInterval(loadData, 30000);
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

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const timeAgo = formatDistanceToNow(new Date(item.lastMessage.createdAt), { addSuffix: true });
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => navigation.navigate('Chat', { userId: item._id, isGroup: false })}
      >
        <View style={styles.avatarContainer}>
          {item.user.image ? (
            <Image source={{ uri: item.user.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {item.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.user.name}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textTertiary }]}>{timeAgo}</Text>
          </View>
          <Text style={[styles.lastMessage, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage.content}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupItem = ({ item }: { item: Group }) => {
    const timeAgo = item.lastMessage
      ? formatDistanceToNow(new Date(item.lastMessage.createdAt), { addSuffix: true })
      : '';
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => navigation.navigate('Chat', { userId: item._id, isGroup: true })}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, { color: theme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {timeAgo && <Text style={[styles.time, { color: theme.colors.textTertiary }]}>{timeAgo}</Text>}
          </View>
          {item.lastMessage && (
            <Text style={[styles.lastMessage, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.lastMessage.content}
            </Text>
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'conversations' && { borderBottomColor: theme.colors.primary }]}
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
            style={[styles.tab, activeTab === 'groups' && { borderBottomColor: theme.colors.primary }]}
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
    borderBottomWidth: 1,
    paddingTop: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
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
    padding: 15,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
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

