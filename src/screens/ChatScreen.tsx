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
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI } from '../config/api';
import { Message, Conversation, Group } from '../types/message';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
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
  const isUserScrollingRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const shouldScrollToBottomOnLoad = useRef(false);

  // Check for new messages without resetting the list (for polling)
  const checkForNewMessages = async () => {
    // Don't check for new messages if user is actively scrolling or viewing older messages
    if (isUserScrollingRef.current || isLoadingOlder) return;
    
    try {
      let messagesData;
      if (isGroup) {
        messagesData = await messagesAPI.getGroupMessages(userId, 20);
      } else {
        messagesData = await messagesAPI.getMessages(userId, 20);
      }
      
      const fetchedMessages = messagesData.messages || [];
      
      // Only update if there are actually new messages
      if (fetchedMessages.length > 0 && messages.length > 0) {
        const latestFetchedId = fetchedMessages[fetchedMessages.length - 1]._id;
        const latestCurrentId = messages[messages.length - 1]._id;
        
        // Check if there are new messages (comparing latest message IDs)
        if (latestFetchedId !== latestCurrentId) {
          // Find the index of the latest current message in the fetched messages
          const currentLatestIndex = fetchedMessages.findIndex((m: Message) => m._id === latestCurrentId);
          
          if (currentLatestIndex >= 0) {
            // There are new messages after our current latest
            const newMessages = fetchedMessages.slice(currentLatestIndex + 1);
            if (newMessages.length > 0) {
              // Append only new messages without resetting the list
              // NO AUTO-SCROLL - let user stay where they are
              // Filter out duplicates by checking existing message IDs
              setMessages(prev => {
                const existingIds = new Set(prev.map((m: Message) => m._id));
                const uniqueNewMessages = newMessages.filter((m: Message) => !existingIds.has(m._id));
                if (uniqueNewMessages.length > 0) {
                  previousMessageCountRef.current = prev.length + uniqueNewMessages.length;
                  return [...prev, ...uniqueNewMessages];
                }
                return prev;
              });
              
              // Mark as read only if user is at bottom (but don't auto-scroll)
              if (isAtBottomRef.current && !isGroup) {
                await messagesAPI.markAsRead(userId);
              }
            }
          } else {
            // Latest message not found - might be a new conversation, do a full refresh only if at bottom
            if (isAtBottomRef.current) {
              setMessages(fetchedMessages);
              setNextCursor(messagesData.nextCursor || null);
              setHasMoreMessages(!!messagesData.nextCursor);
              previousMessageCountRef.current = fetchedMessages.length;
            }
          }
        }
      } else if (fetchedMessages.length > messages.length && isAtBottomRef.current) {
        // Initial load case or messages were cleared
        setMessages(fetchedMessages);
        setNextCursor(messagesData.nextCursor || null);
        setHasMoreMessages(!!messagesData.nextCursor);
        previousMessageCountRef.current = fetchedMessages.length;
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  };

  useEffect(() => {
    // Reset refs when conversation changes
    isUserScrollingRef.current = false;
    isAtBottomRef.current = true;
    previousMessageCountRef.current = 0;
    setNextCursor(null);
    setHasMoreMessages(true);
    setMessages([]);
    shouldScrollToBottomOnLoad.current = true; // Mark that we should scroll on initial load
    
    loadMessages(false); // Don't scroll here, we'll do it after messages render
    // Poll for new messages every 5 seconds (only checks for new messages, doesn't reset)
    const interval = setInterval(() => checkForNewMessages(), 5000);
    return () => clearInterval(interval);
  }, [userId, isGroup]);

  const loadMessages = async (shouldScrollToBottom = false) => {
    try {
      let messagesData;
      if (isGroup) {
        messagesData = await messagesAPI.getGroupMessages(userId, 20);
      } else {
        messagesData = await messagesAPI.getMessages(userId, 20);
        // Mark as read when loading messages
        await messagesAPI.markAsRead(userId);
      }
      
      const newMessages = messagesData.messages || [];
      
      // Remove duplicates by filtering unique IDs
      const seenIds = new Set<string>();
      const uniqueMessages = newMessages.filter((m: Message) => {
        if (seenIds.has(m._id)) {
          return false;
        }
        seenIds.add(m._id);
        return true;
      });
      
      setMessages(uniqueMessages);
      setNextCursor(messagesData.nextCursor || null);
      setHasMoreMessages(!!messagesData.nextCursor);
      previousMessageCountRef.current = uniqueMessages.length;
      
      // Scroll will be handled by onContentSizeChange when messages render
      
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

  const loadOlderMessages = async () => {
    if (!nextCursor || isLoadingOlder || !hasMoreMessages) return;
    
    setIsLoadingOlder(true);
    try {
      let messagesData;
      if (isGroup) {
        messagesData = await messagesAPI.getGroupMessages(userId, 20, nextCursor);
      } else {
        messagesData = await messagesAPI.getMessages(userId, 20, nextCursor);
      }
      
      const olderMessages = messagesData.messages || [];
      if (olderMessages.length > 0) {
        // Prepend older messages to the existing messages, filtering out duplicates
        setMessages(prev => {
          const existingIds = new Set(prev.map((m: Message) => m._id));
          const uniqueOlderMessages = olderMessages.filter((m: Message) => !existingIds.has(m._id));
          if (uniqueOlderMessages.length > 0) {
            return [...uniqueOlderMessages, ...prev];
          }
          return prev;
        });
        setNextCursor(messagesData.nextCursor || null);
        setHasMoreMessages(!!messagesData.nextCursor);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setIsLoadingOlder(false);
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
      // Reload messages after sending (no auto-scroll - user stays where they are)
      await loadMessages(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
      setMessageText(content);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender._id === user?.id;
    const messageDate = new Date(item.createdAt);
    
    // Show date separator only when the day changes
    // Check if this is the first message or if the previous message was on a different day
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const previousMessageDate = previousMessage ? new Date(previousMessage.createdAt) : null;
    
    // Show date if:
    // 1. This is the first message (index === 0), OR
    // 2. The previous message was on a different day
    const showDate = !previousMessageDate || !isSameDay(messageDate, previousMessageDate);
    
    // Format date with smart labels (Today, Yesterday, or full date)
    const getDateLabel = (date: Date): string => {
      if (isToday(date)) {
        return 'Today';
      } else if (isYesterday(date)) {
        return 'Yesterday';
      } else {
        return format(date, 'MMM d, yyyy');
      }
    };
    
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
              {getDateLabel(messageDate)}
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

  // Handle scroll events to track user position and load older messages
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 100; // Threshold for "at bottom"
    const isNearBottom = 
      contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
    
    isAtBottomRef.current = isNearBottom;
    
    // Load older messages when user scrolls near the top
    const paddingToTop = 200; // Threshold for "near top"
    const isNearTop = contentOffset.y <= paddingToTop;
    
    if (isNearTop && hasMoreMessages && !isLoadingOlder && nextCursor) {
      loadOlderMessages();
    }
  };

  const handleScrollBeginDrag = () => {
    isUserScrollingRef.current = true;
  };

  const handleScrollEndDrag = () => {
    // Reset scrolling flag after a short delay
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);
  };

  // Handle content size change to scroll to bottom on initial load
  const handleContentSizeChange = () => {
    // Scroll to bottom only on initial load (when opening conversation)
    if (shouldScrollToBottomOnLoad.current && messages.length > 0) {
      shouldScrollToBottomOnLoad.current = false; // Reset flag
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        isAtBottomRef.current = true;
      }, 100);
    }
  };

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
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
          ListHeaderComponent={
            hasMoreMessages && !isLoadingOlder ? (
              <TouchableOpacity
                style={[styles.loadOlderButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={loadOlderMessages}
              >
                <Text style={[styles.loadOlderText, { color: theme.colors.primary }]}>
                  Load older messages
                </Text>
              </TouchableOpacity>
            ) : isLoadingOlder ? (
              <View style={styles.loadOlderButton}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadOlderText, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                  Loading older messages...
                </Text>
              </View>
            ) : null
          }
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
              <View style={[
                styles.emojiPickerContainer, 
                { 
                  backgroundColor: theme.colors.card,
                  height: Dimensions.get('window').height * 0.7,
                  maxHeight: 500,
                }
              ]}>
                <View style={[styles.emojiPickerHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.emojiPickerTitle, { color: theme.colors.text }]}>Select Emoji</Text>
                  <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                    <X size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.emojiScrollView}
                  contentContainerStyle={styles.emojiGrid}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {(() => {
                    const screenWidth = Dimensions.get('window').width;
                    const padding = 32; // 16px on each side
                    const itemsPerRow = 8;
                    const gap = 8; // Space between items
                    const totalGaps = (itemsPerRow - 1) * gap;
                    const itemWidth = (screenWidth - padding - totalGaps) / itemsPerRow;
                    
                    return ['😀', '😂', '🥰', '😍', '🤔', '😎', '👍', '❤️', '🔥', '🎉', '✅', '👏', '🙏', '💪', '🎊', '😊', '😉', '😋', '😘', '😗', '😙', '😚', '😛', '😜', '😝', '😞', '😟', '😠', '😡', '😢', '😣', '😤', '😥', '😦', '😧', '😨', '😩', '😪', '😫', '😬', '😭', '😮', '😯', '😰', '😱', '😲', '😳', '😴', '😵', '😶', '😷', '😸', '😹', '😺', '😻', '😼', '😽', '😾', '😿', '🙀'].map((emoji, index) => {
                      const isLastInRow = (index + 1) % itemsPerRow === 0;
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.emojiItem, 
                            { 
                              width: itemWidth, 
                              height: itemWidth,
                              marginRight: isLastInRow ? 0 : gap,
                              marginBottom: gap,
                            }
                          ]}
                          onPress={() => {
                            setMessageText(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.emojiText}>{emoji}</Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </ScrollView>
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
  emojiScrollView: {
    flex: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingBottom: 24,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  emojiItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 28,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
  loadOlderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  loadOlderText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

