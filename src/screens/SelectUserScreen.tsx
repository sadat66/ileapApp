import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersAPI } from '../config/api';
import { messagesAPI } from '../config/api';
import Header from '../components/Header';

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
}

interface SelectUserScreenProps {
  navigation: any;
  route: {
    params: {
      mode: 'conversation' | 'group';
      groupId?: string; // For adding to existing group
    };
  };
}

export default function SelectUserScreen({ navigation, route }: SelectUserScreenProps) {
  const { mode, groupId } = route.params;
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [searchQuery]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await usersAPI.getAvailableUsers(1, 100, searchQuery);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (mode === 'conversation') {
      // For conversation, only one user can be selected
      handleStartConversation(userId);
    } else {
      // For group, multiple users can be selected
      setSelectedUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleStartConversation = async (userId: string) => {
    try {
      navigation.navigate('Chat', { userId, isGroup: false });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start conversation');
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    try {
      setIsCreating(true);
      
      if (groupId) {
        // Add members to existing group
        await messagesAPI.addGroupMembers(groupId, selectedUsers);
        Alert.alert('Success', 'Members added to group');
        navigation.goBack();
      } else {
        // Create new group
        const groupName = `Group with ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}`;
        const group = await messagesAPI.createGroup(groupName, '', selectedUsers);
        Alert.alert('Success', 'Group created successfully');
        navigation.navigate('Chat', { userId: group._id, isGroup: true });
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item._id);
    const isSingleSelect = mode === 'conversation';

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUserItem]}
        onPress={() => toggleUserSelection(item._id)}
      >
        <View style={styles.avatarContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.role && (
            <Text style={styles.userRole}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          )}
        </View>
        {!isSingleSelect && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title={mode === 'conversation' ? 'Select Volunteer' : groupId ? 'Add Members' : 'Create Group'}
        onMenuPress={() => navigation.goBack()}
        isMenuOpen={false}
        onHomePress={() => navigation.navigate('Conversations')}
      />
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search volunteers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>

        {mode === 'group' && selectedUsers.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedText}>
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateGroup}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>
                  {groupId ? 'Add Members' : 'Create Group'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No volunteers found</Text>
              </View>
            }
          />
        )}
      </View>
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
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  selectedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUserItem: {
    backgroundColor: '#f0f8ff',
  },
  avatarContainer: {
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

