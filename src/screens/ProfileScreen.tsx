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
import { authAPI } from '../config/api';
import Header from '../components/Header';
import MenuDrawer from '../components/MenuDrawer';

export default function ProfileScreen({ navigation }: any) {
  const { user: authUser, refreshSession } = useAuth();
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="Profile"
          onMenuPress={() => setIsMenuOpen(true)}
          isMenuOpen={isMenuOpen}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
        <MenuDrawer visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </SafeAreaView>
    );
  }

  const displayUser = user || authUser;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Profile"
        onMenuPress={() => setIsMenuOpen(true)}
        isMenuOpen={isMenuOpen}
        onHomePress={() => navigation.navigate('Conversations')}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileHeader}>
          {displayUser?.image ? (
            <Image source={{ uri: displayUser.image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayUser?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{displayUser?.name || 'User'}</Text>
          {displayUser?.role && (
            <Text style={styles.role}>
              {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{displayUser?.email || 'N/A'}</Text>
          </View>

          {displayUser?.role && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>
                {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}
              </Text>
            </View>
          )}

          {displayUser?.id && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={[styles.infoValue, styles.userId]} numberOfLines={1}>
                {displayUser.id}
              </Text>
            </View>
          )}
        </View>

        {displayUser?.organization_profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organization Profile</Text>
            {typeof displayUser.organization_profile === 'object' ? (
              <>
                {displayUser.organization_profile.title && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Organization Name</Text>
                    <Text style={styles.infoValue}>
                      {displayUser.organization_profile.title}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.type && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>
                      {displayUser.organization_profile.type}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.contact_email && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Contact Email</Text>
                    <Text style={styles.infoValue}>
                      {displayUser.organization_profile.contact_email}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.phone_number && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>
                      {displayUser.organization_profile.phone_number}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.state && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>State</Text>
                    <Text style={styles.infoValue}>
                      {displayUser.organization_profile.state}
                    </Text>
                  </View>
                )}
                {displayUser.organization_profile.area && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Area</Text>
                    <Text style={styles.infoValue}>
                      {displayUser.organization_profile.area}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.infoValue}>Organization profile exists</Text>
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
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    backgroundColor: '#007AFF',
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
    color: '#1a1a1a',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
});

