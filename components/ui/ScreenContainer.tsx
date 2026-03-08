import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useTheme, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppTheme } from '@/theme';

type ScreenContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  noPadding?: boolean;
};

export function ScreenContainer({
  children,
  style,
  edges = ['top'],
  noPadding,
}: ScreenContainerProps) {
  const theme = useTheme<AppTheme>();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }, style]} elevation={0}>
      <SafeAreaView
        style={[
          styles.safe,
          { backgroundColor: theme.colors.background },
          noPadding ? undefined : styles.padding,
        ]}
        edges={edges}
      >
        {children}
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: 20,
  },
});
