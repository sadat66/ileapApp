import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI } from '../config/api';
import { Message, Conversation, Group } from '../types/message';
import { format } from 'date-fns';
import Header from '../components/Header';

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

export default function ChatScreen({ route, navigation }: any) {
  const { userId, isGroup } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | Group | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 30 seconds (reduced from 5 seconds)
    // This reduces server load while still keeping messages relatively fresh
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [userId, isGroup]);

  const loadMessages = async () => {
    try {
      let messagesData;
      if (isGroup) {
        messagesData = await messagesAPI.getGroupMessages(userId);
      } else {
        messagesData = await messagesAPI.getMessages(userId);
        // Mark as read
        await messagesAPI.markAsRead(userId);
      }
      setMessages(messagesData.messages || []);
      
      // Load conversation/group info
      if (!isGroup) {
        const conversations = await messagesAPI.getConversations();
        const conv = conversations.find((c: Conversation) => c._id === userId);
        setConversation(conv || null);
      } else {
        const groups = await messagesAPI.getGroups();
        const group = groups.find((g: Group) => g._id === userId);
        setConversation(group || null);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || isSending) return;

    const content = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      if (isGroup) {
        await messagesAPI.sendGroupMessage(userId, content);
      } else {
        await messagesAPI.sendMessage(userId, content);
      }
      // Reload messages
      await loadMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
      setMessageText(content);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender._id === user?.id;
    const messageDate = new Date(item.createdAt);
    const showDate = true; // You can add logic to show date only when it changes
    const senderName = item.sender.organization_profile?.title || item.sender.name || 'Unknown';
    const initials = getInitials(senderName);
    const avatarColor = getAvatarColor(senderName);

    return (
      <View style={styles.messageContainer}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={[styles.dateText, { color: theme.colors.textTertiary, backgroundColor: theme.colors.surface }]}>
              {format(messageDate, 'MMM d, yyyy')}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageRow,
            isMyMessage ? styles.myMessageRow : styles.otherMessageRow,
          ]}
        >
          {!isMyMessage && (
            <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
              {item.sender.image ? (
                <Image
                  source={{ uri: item.sender.image }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isMyMessage 
                ? [styles.myMessage, { backgroundColor: theme.colors.messageBubble }]
                : [styles.otherMessage, { backgroundColor: theme.colors.messageBubbleOther }],
            ]}
          >
            {!isMyMessage && (
              <Text style={[styles.senderName, { color: theme.colors.textSecondary }]}>{senderName}</Text>
            )}
            
            {item.content && (
              <Text style={isMyMessage 
                ? [styles.myMessageText, { color: theme.colors.messageBubbleText }]
                : [styles.otherMessageText, { color: theme.colors.messageBubbleOtherText }]
              }>
                {item.content}
              </Text>
            )}
            
            <Text style={[
              styles.messageTime, 
              { color: isMyMessage 
                ? 'rgba(255, 255, 255, 0.7)' 
                : theme.colors.textTertiary 
              }
            ]}>
              {format(messageDate, 'h:mm a')}
            </Text>
          </View>
          {isMyMessage && (
            <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
              {item.sender.image ? (
                <Image
                  source={{ uri: item.sender.image }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const conversationName = isGroup
    ? (conversation as Group)?.name || 'Group'
    : (conversation as Conversation)?.user?.name || 'User';

  const dynamicStyles = {
    safeArea: { backgroundColor: theme.colors.background },
    container: { backgroundColor: theme.colors.surface },
    messagesList: { padding: 15 },
    dateText: { 
      color: theme.colors.textTertiary, 
      backgroundColor: theme.colors.surface 
    },
    messageBubbleMy: { backgroundColor: theme.colors.messageBubble },
    messageBubbleOther: { backgroundColor: theme.colors.messageBubbleOther },
    myMessageText: { color: theme.colors.messageBubbleText },
    otherMessageText: { color: theme.colors.messageBubbleOtherText },
    senderName: { color: theme.colors.textSecondary },
    messageTime: { color: theme.colors.textTertiary },
    inputContainer: { 
      backgroundColor: theme.colors.card, 
      borderTopColor: theme.colors.border 
    },
    input: { 
      backgroundColor: theme.colors.input, 
      borderColor: theme.colors.border, 
      color: theme.colors.inputText 
    },
    sendButton: { backgroundColor: theme.colors.primary },
    emptyText: { color: theme.colors.textTertiary },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, dynamicStyles.container]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header
          title={conversationName}
          onMenuPress={() => navigation.goBack()}
          isMenuOpen={false}
          onHomePress={() => navigation.navigate('Conversations')}
          onSettingsPress={isGroup ? () => navigation.navigate('GroupManagement', { groupId: userId }) : undefined}
          showSettingsButton={isGroup}
          showHomeButton={!isGroup}
        />

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.messagesList, dynamicStyles.messagesList]}
          style={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No messages yet</Text>
            </View>
          }
        />

        <SafeAreaView edges={['bottom']} style={[styles.inputSafeArea, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                dynamicStyles.sendButton,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  messagesContainer: {
    flexGrow: 1,
  },
  inputSafeArea: {
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 60,
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 10,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 15,
  },
  dateText: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    backgroundColor: '#fff',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  myMessageText: {
    fontSize: 16,
  },
  otherMessageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 10,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});

