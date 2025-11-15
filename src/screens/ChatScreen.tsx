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
import { messagesAPI } from '../config/api';
import { Message, Conversation, Group } from '../types/message';
import { format } from 'date-fns';
import Header from '../components/Header';
import * as ImagePicker from 'expo-image-picker';

export default function ChatScreen({ route, navigation }: any) {
  const { userId, isGroup } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | Group | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  const requestMediaPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert('Permission Required', 'We need camera and photo library access to send media.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max for videos
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Select Media',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia) || isSending) return;

    const content = messageText.trim();
    const mediaUri = selectedMedia;
    
    setMessageText('');
    setSelectedMedia(null);
    setIsSending(true);

    try {
      if (isGroup) {
        await messagesAPI.sendGroupMessage(userId, content, mediaUri || undefined);
      } else {
        await messagesAPI.sendMessage(userId, content, mediaUri || undefined);
      }
      // Reload messages
      await loadMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
      // Restore media if sending failed
      if (mediaUri) setSelectedMedia(mediaUri);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender._id === user?.id;
    const messageDate = new Date(item.createdAt);
    const showDate = true; // You can add logic to show date only when it changes

    return (
      <View style={styles.messageContainer}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {format(messageDate, 'MMM d, yyyy')}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {!isMyMessage && (
            <Text style={styles.senderName}>{item.sender.name}</Text>
          )}
          
          {/* Render media if present */}
          {item.media && (
            <View style={styles.mediaContainer}>
              {item.media.type === 'image' ? (
                <Image
                  source={{ uri: item.media.url }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoContainer}>
                  <Text style={styles.videoPlaceholder}>📹 Video</Text>
                  <Text style={styles.videoInfo}>{item.media.fileName || 'Video file'}</Text>
                </View>
              )}
            </View>
          )}
          
          {item.content && (
            <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
              {item.content}
            </Text>
          )}
          
          <Text style={[styles.messageTime, !isMyMessage && styles.otherMessageTime]}>
            {format(messageDate, 'h:mm a')}
          </Text>
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const conversationName = isGroup
    ? (conversation as Group)?.name || 'Group'
    : (conversation as Conversation)?.user?.name || 'User';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header
          title={conversationName}
          onMenuPress={() => navigation.goBack()}
          isMenuOpen={false}
          onHomePress={() => navigation.navigate('Conversations')}
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
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />

        <SafeAreaView edges={['bottom']} style={styles.inputSafeArea}>
          {/* Show selected media preview */}
          {selectedMedia && (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: selectedMedia }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => setSelectedMedia(null)}
              >
                <Text style={styles.removeMediaText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={showMediaOptions}
              disabled={isSending}
            >
              <Text style={styles.attachButtonText}>📎</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              multiline
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!messageText.trim() && !selectedMedia) || isSending) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={(!messageText.trim() && !selectedMedia) || isSending}
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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
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
    color: '#999',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  myMessageText: {
    color: '#fff',
    fontSize: 16,
  },
  otherMessageText: {
    color: '#1a1a1a',
    fontSize: 16,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  otherMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  mediaContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
  },
  videoContainer: {
    width: 250,
    height: 150,
    backgroundColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    fontSize: 40,
    marginBottom: 8,
  },
  videoInfo: {
    color: '#fff',
    fontSize: 12,
  },
  mediaPreview: {
    marginHorizontal: 15,
    marginBottom: 10,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  attachButton: {
    marginRight: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
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
    color: '#999',
  },
});

