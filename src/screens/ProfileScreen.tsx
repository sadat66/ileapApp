import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../config/api';
import Header from '../components/Header';
import MenuDrawer from '../components/MenuDrawer';
import { Switch } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';

export default function ProfileScreen({ navigation }: any) {
  const { user: authUser, refreshSession } = useAuth();
  const { theme, setThemeMode, toggleTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const currentUser = await authAPI.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await refreshSession();
      } else {
        setUser(authUser);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setUser(authUser);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Header
          title="Profile"
          onMenuPress={() => setIsMenuOpen(true)}
          isMenuOpen={isMenuOpen}
        />
        <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        <MenuDrawer visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </SafeAreaView>
    );
  }

  const displayUser = user || authUser;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Header
        title="Profile"
        onMenuPress={() => setIsMenuOpen(true)}
        isMenuOpen={isMenuOpen}
        onHomePress={() => navigation.navigate('Conversations')}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={[styles.profileHeader, { borderBottomColor: theme.colors.border }]}>
          {displayUser?.image ? (
            <Image source={{ uri: displayUser.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {displayUser?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <Text style={[styles.name, { color: theme.colors.text }]}>{displayUser?.name || 'User'}</Text>
          {displayUser?.role && (
            <Text style={[styles.role, { color: theme.colors.primary }]}>
              {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}
            </Text>
          )}
        </View>

        <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>
          
          <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.themeToggleContainer}>
              {theme.isDark ? (
                <Moon size={20} color={theme.colors.text} />
              ) : (
                <Sun size={20} color={theme.colors.text} />
              )}
              <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={theme.isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.isDark ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account Information</Text>
          
          <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>{displayUser?.email || 'N/A'}</Text>
          </View>

          {displayUser?.role && (
            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Role</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}
              </Text>
            </View>
          )}

          {displayUser?.id && (
            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>User ID</Text>
              <Text style={[styles.infoValue, styles.userId, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                {displayUser.id}
              </Text>
            </View>
          )}
        </View>

        {displayUser?.organization_profile && (
          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Organization Profile</Text>
            {typeof displayUser.organization_profile === 'object' ? (
              <>
                {displayUser.organization_profile.title && (
                  <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Organization Name</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                      {displayUser.organization_profile.title}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.type && (
                  <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Type</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                      {displayUser.organization_profile.type}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.contact_email && (
                  <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Contact Email</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                      {displayUser.organization_profile.contact_email}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.phone_number && (
                  <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                      {displayUser.organization_profile.phone_number}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.state && (
                  <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>State</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                      {displayUser.organization_profile.state}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.area && (
                  <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Area</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                      {displayUser.organization_profile.area}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>Organization profile exists</Text>
            )}
          </View>
        )}
      </ScrollView>
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
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  userId: {
    fontSize: 12,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
});

