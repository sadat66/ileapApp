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
import { useTheme } from '../context/ThemeContext';
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
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [groupName, setGroupName] = useState('');

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

    if (!groupId && !groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
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
        // Create new group with custom name
        const finalGroupName = groupName.trim() || `Group with ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}`;
        const group = await messagesAPI.createGroup(finalGroupName, '', selectedUsers);
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
        style={[
          styles.userItem, 
          { borderBottomColor: theme.colors.border },
          isSelected && { backgroundColor: theme.colors.secondary }
        ]}
        onPress={() => toggleUserSelection(item._id)}
      >
        <View style={styles.avatarContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{item.email}</Text>
          {item.role && (
            <Text style={[styles.userRole, { color: theme.colors.primary }]}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          )}
        </View>
        {!isSingleSelect && (
          <View style={[
            styles.checkbox, 
            { borderColor: theme.colors.border },
            isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
          ]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Header
        title={mode === 'conversation' ? 'Select Volunteer' : groupId ? 'Add Members' : 'Create Group'}
        onMenuPress={() => navigation.goBack()}
        isMenuOpen={false}
        onHomePress={() => navigation.navigate('Conversations')}
      />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {mode === 'group' && !groupId && (
          <View style={[styles.groupNameContainer, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.groupNameLabel, { color: theme.colors.text }]}>Group Name</Text>
            <TextInput
              style={[
                styles.groupNameInput,
                {
                  backgroundColor: theme.colors.input,
                  borderColor: theme.colors.border,
                  color: theme.colors.inputText,
                }
              ]}
              placeholder="Enter group name..."
              placeholderTextColor={theme.colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
              autoCapitalize="words"
              maxLength={100}
            />
          </View>
        )}
        <View style={[styles.searchContainer, { borderBottomColor: theme.colors.border }]}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.colors.input,
                borderColor: theme.colors.border,
                color: theme.colors.inputText,
              }
            ]}
            placeholder="Search volunteers..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>

        {mode === 'group' && selectedUsers.length > 0 && (
          <View style={[
            styles.selectedContainer,
            { 
              backgroundColor: theme.colors.secondary,
              borderBottomColor: theme.colors.border 
            }
          ]}>
            <Text style={[styles.selectedText, { color: theme.colors.text }]}>
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
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
          <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>No volunteers found</Text>
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
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameContainer: {
    padding: 15,
    borderBottomWidth: 1,
  },
  groupNameLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  selectedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  createButton: {
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
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});

