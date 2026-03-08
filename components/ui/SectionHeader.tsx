import React from 'react';
import { Text } from 'react-native-paper';

type SectionHeaderProps = {
  children: string;
};

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <Text variant="titleMedium" style={{ marginBottom: 16 }}>
      {children}
    </Text>
  );
}
