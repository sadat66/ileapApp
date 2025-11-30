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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI } from '../config/api';
import { Message, Conversation, Group } from '../types/message';
import { format } from 'date-fns';
import Header from '../components/Header';
import { Smile, Send, X } from 'lucide-react-native';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
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

  // Get group members for mentions
  const getGroupMembers = () => {
    if (!isGroup || !conversation) return [];
    const group = conversation as Group;
    return group.members || [];
  };

  // Handle text input change with mention detection
  const handleTextChange = (text: string) => {
    setMessageText(text);
    
    if (isGroup) {
      // Check for @ mentions - look for @ followed by text until space or end
      const lastAtIndex = text.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const afterAt = text.substring(lastAtIndex + 1);
        const spaceIndex = afterAt.indexOf(' ');
        const newlineIndex = afterAt.indexOf('\n');
        const endIndex = Math.min(
          spaceIndex === -1 ? afterAt.length : spaceIndex,
          newlineIndex === -1 ? afterAt.length : newlineIndex
        );
        
        if (endIndex > 0 || afterAt.length === 0) {
          // Still typing mention
          const query = afterAt.substring(0, endIndex);
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
        } else {
          setShowMentionSuggestions(false);
        }
      } else {
        setShowMentionSuggestions(false);
      }
    }
  };

  // Insert mention into text
  const insertMention = (member: { _id: string; name: string }) => {
    const beforeMention = messageText.substring(0, mentionStartIndex);
    const afterMention = messageText.substring(mentionStartIndex + 1 + mentionQuery.length);
    const newText = `${beforeMention}@${member.name} ${afterMention}`;
    setMessageText(newText);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  // Filter members for mention suggestions
  const getMentionSuggestions = () => {
    if (!mentionQuery) return getGroupMembers();
    const query = mentionQuery.toLowerCase();
    return getGroupMembers().filter((member: any) =>
      member.name?.toLowerCase().includes(query)
    );
  };

  // Render text with mentions highlighted
  const renderMessageText = (content: string, isMyMessage: boolean) => {
    const textColor = theme.isDark 
      ? (isMyMessage ? '#FFFFFF' : theme.colors.text)
      : '#000000';
    const baseStyle = [styles.messageTextContent, { color: textColor }];

    if (!isGroup) {
      return <Text style={baseStyle}>{content}</Text>;
    }

    // Parse mentions in the format @username (supports names with spaces)
    const parts: Array<{ text: string; isMention: boolean; userId?: string }> = [];
    const mentionRegex = /@([^\s@]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({ text: content.substring(lastIndex, match.index), isMention: false });
      }
      
      // Find the member - try exact match first, then partial match
      const mentionText = match[1];
      const member = getGroupMembers().find((m: any) => 
        m.name === mentionText || m.name?.toLowerCase().includes(mentionText.toLowerCase())
      );
      
      if (member) {
        parts.push({ text: `@${mentionText}`, isMention: true, userId: member._id });
      } else {
        parts.push({ text: match[0], isMention: false });
      }
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({ text: content.substring(lastIndex), isMention: false });
    }

    if (parts.length === 0) {
      parts.push({ text: content, isMention: false });
    }

    const mentionColor = theme.colors.primary;
    const mentionBg = theme.isDark 
      ? `rgba(${theme.colors.primary === '#0A84FF' ? '10, 132, 255' : '0, 122, 255'}, 0.2)`
      : `rgba(0, 122, 255, 0.15)`;

    return (
      <Text style={baseStyle}>
        {parts.map((part, index) => (
          <Text
            key={index}
            style={part.isMention ? [styles.mentionText, { color: mentionColor, backgroundColor: mentionBg }] : undefined}
          >
            {part.text}
          </Text>
        ))}
      </Text>
    );
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
            <Text style={[
              styles.dateText, 
              { 
                color: theme.isDark ? theme.colors.textSecondary : '#666666',
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
              }
            ]}>
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
                ? [styles.myMessage, { backgroundColor: dynamicStyles.sentMessageBg }]
                : [
                    styles.otherMessage, 
                    { 
                      backgroundColor: dynamicStyles.receivedMessageBg,
                      shadowOpacity: theme.isDark ? 0 : 0.1,
                      elevation: theme.isDark ? 0 : 1,
                    }
                  ],
            ]}
          >
            {!isMyMessage && (
              <Text style={[styles.senderName, { color: theme.colors.primary }]}>{senderName}</Text>
            )}
            
            {item.content && (
              renderMessageText(item.content, isMyMessage)
            )}
            
            <Text style={[styles.messageTime, { color: theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }]}>
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

  // Theme-aware colors for message bubbles
  const sentMessageBg = theme.isDark ? '#1E3A5F' : '#D6E8FF'; // Dark blue for dark mode, light blue for light
  const receivedMessageBg = theme.isDark ? theme.colors.surface : '#FFFFFF';
  const chatBackground = theme.isDark ? theme.colors.background : '#F5F7FA';
  const inputAreaBg = theme.isDark ? theme.colors.card : '#F0F0F0';

  const dynamicStyles = {
    safeArea: { backgroundColor: chatBackground },
    container: { backgroundColor: chatBackground },
    inputContainer: { 
      backgroundColor: inputAreaBg, 
      borderTopColor: theme.colors.border 
    },
    input: { 
      backgroundColor: theme.colors.input, 
      borderColor: theme.colors.border, 
      color: theme.colors.inputText 
    },
    sendButton: { backgroundColor: theme.colors.primary },
    emptyText: { color: theme.colors.textTertiary },
    sentMessageBg: sentMessageBg,
    receivedMessageBg: receivedMessageBg,
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
          contentContainerStyle={styles.messagesList}
          style={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No messages yet</Text>
            </View>
          }
        />

        <SafeAreaView edges={['bottom']} style={[styles.inputSafeArea, { backgroundColor: theme.colors.card }]}>
          {/* Mention Suggestions */}
          {showMentionSuggestions && isGroup && (
            <View style={[styles.mentionSuggestions, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <FlatList
                data={getMentionSuggestions()}
                keyExtractor={(item: any) => item._id}
                renderItem={({ item: member }: { item: any }) => (
                  <TouchableOpacity
                    style={styles.mentionItem}
                    onPress={() => insertMention(member)}
                  >
                    <View style={[styles.mentionAvatar, { backgroundColor: getAvatarColor(member.name || '') }]}>
                      {member.image ? (
                        <Image source={{ uri: member.image }} style={styles.mentionAvatarImage} />
                      ) : (
                        <Text style={styles.mentionAvatarText}>{getInitials(member.name || '')}</Text>
                      )}
                    </View>
                    <Text style={[styles.mentionName, { color: theme.colors.text }]}>{member.name}</Text>
                  </TouchableOpacity>
                )}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}

          <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
            <TouchableOpacity
              style={styles.emojiButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.input, borderColor: theme.colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.colors.inputText }]}
                value={messageText}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                editable={!isSending}
              />
            </View>

            {messageText.trim() ? (
              <TouchableOpacity
                style={[styles.sendButton, dynamicStyles.sendButton, isSending && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.sendButtonPlaceholder} />
            )}
          </View>

          {/* Simple Emoji Picker Modal */}
          <Modal
            visible={showEmojiPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEmojiPicker(false)}
          >
            <View style={styles.emojiPickerOverlay}>
              <View style={[styles.emojiPickerContainer, { backgroundColor: theme.colors.card }]}>
                <View style={[styles.emojiPickerHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.emojiPickerTitle, { color: theme.colors.text }]}>Select Emoji</Text>
                  <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                    <X size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.emojiGrid}>
                  {['😀', '😂', '🥰', '😍', '🤔', '😎', '👍', '❤️', '🔥', '🎉', '✅', '👏', '🙏', '💪', '🎊', '😊', '😉', '😋', '😘', '😗', '😙', '😚', '😛', '😜', '😝', '😞', '😟', '😠', '😡', '😢', '😣', '😤', '😥', '😦', '😧', '😨', '😩', '😪', '😫', '😬', '😭', '😮', '😯', '😰', '😱', '😲', '😳', '😴', '😵', '😶', '😷', '😸', '😹', '😺', '😻', '😼', '😽', '😾', '😿', '🙀'].map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.emojiItem}
                      onPress={() => {
                        setMessageText(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
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
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  messageContainer: {
    marginBottom: 2,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    // backgroundColor and color will be set dynamically based on theme
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
    paddingLeft: 60, // Space for avatar on left side
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
    paddingRight: 60, // Space for avatar on right side
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    // WhatsApp-like rounded corners
    borderTopLeftRadius: 0,
  },
  myMessage: {
    // backgroundColor will be set dynamically based on theme
    borderTopRightRadius: 0,
    borderTopLeftRadius: 8,
  },
  otherMessage: {
    // backgroundColor will be set dynamically based on theme
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    // Shadow for depth (only in light mode)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    // color will be set dynamically based on theme
  },
  messageTextContent: {
    fontSize: 15,
    lineHeight: 20,
  },
  mentionText: {
    // color and backgroundColor will be set dynamically based on theme
    fontWeight: '600',
    paddingHorizontal: 2,
    borderRadius: 3,
  },
  myMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  otherMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
    // color will be set dynamically based on theme
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderTopWidth: 0.5,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
  },
  input: {
    fontSize: 15,
    padding: 0,
    maxHeight: 84,
  },
  emojiButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#25D366', // WhatsApp green send button
  },
  sendButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mentionSuggestions: {
    maxHeight: 150,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  mentionAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  mentionAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  emojiPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emojiPickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '50%',
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically based on theme
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  emojiItem: {
    width: '12%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  emojiText: {
    fontSize: 32,
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

