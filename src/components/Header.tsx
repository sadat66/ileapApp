import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu, X, Home, Settings } from 'lucide-react-native';

interface HeaderProps {
  title?: string;
  onMenuPress: () => void;
  isMenuOpen: boolean;
  onHomePress?: () => void;
  showHomeButton?: boolean;
  onSettingsPress?: () => void;
  showSettingsButton?: boolean;
  unreadCount?: number;
}

export default function Header({ 
  title = 'iLeap', 
  onMenuPress, 
  isMenuOpen,
  onHomePress,
  showHomeButton = true,
  onSettingsPress,
  showSettingsButton = false,
  unreadCount = 0,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={onMenuPress}
        accessibilityLabel={isMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMenuOpen ? (
          <X size={24} color="#fff" />
        ) : (
          <Menu size={24} color="#fff" />
        )}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rightButtons}>
        {showSettingsButton && onSettingsPress ? (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onSettingsPress}
            accessibilityLabel="Group settings"
          >
            <Settings size={24} color="#fff" />
          </TouchableOpacity>
        ) : null}
        {showHomeButton && onHomePress ? (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={onHomePress}
            accessibilityLabel="Go to home"
          >
            <Home size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          !showSettingsButton && <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#000',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  homeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});

