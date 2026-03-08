import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import type { AppTheme } from '@/theme';

type EmptyStateProps = {
  icon: keyof typeof Feather.glyphMap;
  message: string;
  style?: object;
};

export function EmptyState({ icon, message, style }: EmptyStateProps) {
  const theme = useTheme<AppTheme>();

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Feather name={icon} size={40} color={theme.colors.outline} />
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
