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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { messagesAPI, usersAPI } from '../config/api';
import { Group } from '../types/message';
import Header from '../components/Header';
import { UserPlus, UserMinus, Users } from 'lucide-react-native';

interface GroupManagementScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

export default function GroupManagementScreen({ navigation, route }: GroupManagementScreenProps) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  useEffect(() => {
    if (showAddMembers && group) {
      if (searchQuery.length > 0) {
        const timeoutId = setTimeout(() => {
          loadAvailableUsers();
        }, 300);
        return () => clearTimeout(timeoutId);
      } else {
        loadAvailableUsers();
      }
    }
  }, [searchQuery, showAddMembers, group]);

  const loadGroup = async () => {
    try {
      setIsLoading(true);
      const groups = await messagesAPI.getGroups();
      const foundGroup = groups.find((g: Group) => g._id === groupId);
      setGroup(foundGroup || null);
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Error', 'Failed to load group information');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const data = await usersAPI.getAvailableUsers(1, 100, searchQuery);
      // Filter out users who are already members
      const memberIds = group?.members?.map(m => m._id) || [];
      const filtered = (data.users || []).filter((u: any) => !memberIds.includes(u._id));
      setAvailableUsers(filtered);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const canManageMembers = (): boolean => {
    if (!user || !group) return false;
    
    const userRole = user.role;
    const isAdminOrOrganization = userRole === 'admin' || userRole === 'organization';
    const isGroupAdmin = group.admins?.some(admin => admin._id === user.id) || false;
    const isGroupCreator = group.createdBy === user.id;
    
    return isAdminOrOrganization || isGroupAdmin || isGroupCreator;
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user to add');
      return;
    }

    try {
      setIsAdding(true);
      await messagesAPI.addGroupMembers(groupId, selectedUsers);
      Alert.alert('Success', 'Members added successfully');
      setSelectedUsers([]);
      setShowAddMembers(false);
      setSearchQuery('');
      await loadGroup();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to add members');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesAPI.removeGroupMember(groupId, memberId);
              Alert.alert('Success', 'Member removed successfully');
              await loadGroup();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

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

  const renderMemberItem = ({ item }: { item: any }) => {
    const isAdmin = group?.admins?.some(admin => admin._id === item._id) || false;
    const canRemove = canManageMembers() && item._id !== user?.id;

    return (
      <View style={[styles.memberItem, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(item.name) }]}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
            )}
          </View>
          <View style={styles.memberDetails}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, { color: theme.colors.text }]}>{item.name}</Text>
              {isAdmin && (
                <View style={[styles.adminBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            <Text style={[styles.memberRole, { color: theme.colors.textSecondary }]}>
              {item.role?.charAt(0).toUpperCase() + item.role?.slice(1) || 'User'}
            </Text>
          </View>
        </View>
        {canRemove && (
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
            onPress={() => handleRemoveMember(item._id, item.name)}
          >
            <UserMinus size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAvailableUserItem = ({ item }: { item: any }) => {
    const isSelected = selectedUsers.includes(item._id);

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
            <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(item.name) }]}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
          )}
        </View>
        <View style={styles.memberDetails}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.memberRole, { color: theme.colors.textSecondary }]}>
            {item.role?.charAt(0).toUpperCase() + item.role?.slice(1) || 'User'}
          </Text>
        </View>
        <View style={[
          styles.checkbox,
          { borderColor: theme.colors.border },
          isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
        ]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Header
          title="Group Management"
          onMenuPress={() => navigation.goBack()}
          isMenuOpen={false}
        />
        <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Header
          title="Group Management"
          onMenuPress={() => navigation.goBack()}
          isMenuOpen={false}
        />
        <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasManagePermission = canManageMembers();
  const members = group.members || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Header
        title="Group Management"
        onMenuPress={() => navigation.goBack()}
        isMenuOpen={false}
      />
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.groupInfo, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.groupName, { color: theme.colors.text }]}>{group.name}</Text>
          {group.description && (
            <Text style={[styles.groupDescription, { color: theme.colors.textSecondary }]}>
              {group.description}
            </Text>
          )}
          <View style={styles.memberCount}>
            <Users size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.memberCountText, { color: theme.colors.textSecondary }]}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {hasManagePermission && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              setShowAddMembers(!showAddMembers);
              if (!showAddMembers) {
                loadAvailableUsers();
              }
            }}
          >
            <UserPlus size={20} color="#fff" />
            <Text style={styles.addButtonText}>
              {showAddMembers ? 'Cancel' : 'Add Members'}
            </Text>
          </TouchableOpacity>
        )}

        {showAddMembers && hasManagePermission && (
          <View style={[styles.addMembersSection, { backgroundColor: theme.colors.card }]}>
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

            {isLoadingUsers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              <FlatList
                data={availableUsers}
                renderItem={renderAvailableUserItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                      No volunteers found
                    </Text>
                  </View>
                }
              />
            )}

            {selectedUsers.length > 0 && (
              <TouchableOpacity
                style={[styles.addSelectedButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddMembers}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <UserPlus size={18} color="#fff" />
                    <Text style={styles.addSelectedButtonText}>
                      Add {selectedUsers.length} member{selectedUsers.length > 1 ? 's' : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.membersSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Members</Text>
          <FlatList
            data={members}
            renderItem={renderMemberItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                  No members yet
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>
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
  groupInfo: {
    padding: 20,
    borderBottomWidth: 1,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCountText: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addMembersSection: {
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    overflow: 'hidden',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  membersSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 14,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
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
  addSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  addSelectedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});

