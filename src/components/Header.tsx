import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu, X, Home } from 'lucide-react-native';

interface HeaderProps {
  title?: string;
  onMenuPress: () => void;
  isMenuOpen: boolean;
  onHomePress?: () => void;
  showHomeButton?: boolean;
}

export default function Header({ 
  title = 'iLeap', 
  onMenuPress, 
  isMenuOpen,
  onHomePress,
  showHomeButton = true,
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
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {showHomeButton && onHomePress ? (
        <TouchableOpacity
          style={styles.homeButton}
          onPress={onHomePress}
          accessibilityLabel="Go to home"
        >
          <Home size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  homeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

