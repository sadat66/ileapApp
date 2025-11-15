import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { User, LogIn, LogOut, X } from 'lucide-react-native';

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function MenuDrawer({ visible, onClose }: MenuDrawerProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProfilePress = () => {
    if (isAuthenticated) {
      navigation.navigate('Profile');
      onClose();
    }
  };

  const handleLoginPress = () => {
    onClose();
    // Navigation to login will be handled by AppNavigator when isAuthenticated becomes false
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Menu drawer"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityLabel="Close menu"
        accessibilityRole="button"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.drawerContainer}
        >
          <SafeAreaView style={styles.drawer} edges={['top', 'left']}>
            <View style={styles.header}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Close menu"
                accessibilityRole="button"
              >
                <X size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

          <ScrollView style={styles.content}>
            {isAuthenticated && user ? (
              <>
                <View style={styles.userSection}>
                  {user.image ? (
                    <Image source={{ uri: user.image }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    {user.role && (
                      <Text style={styles.userRole}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleProfilePress}
                  accessibilityRole="button"
                  accessibilityLabel="View profile"
                >
                  <User size={20} color="#007AFF" />
                  <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutButton]}
                  onPress={handleLogout}
                  accessibilityRole="button"
                  accessibilityLabel="Log out"
                >
                  <LogOut size={20} color="#FF3B30" />
                  <Text style={[styles.menuItemText, styles.logoutText]}>
                    Log Out
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.menuItem, styles.loginButton]}
                onPress={handleLoginPress}
                accessibilityRole="button"
                accessibilityLabel="Log in"
              >
                <LogIn size={20} color="#007AFF" />
                <Text style={[styles.menuItemText, styles.loginText]}>
                  Log In
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    flex: 1,
    width: '75%',
    maxWidth: 300,
  },
  drawer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
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
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  loginButton: {
    marginTop: 20,
  },
  loginText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});

