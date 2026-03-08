import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, Text, Button, useTheme } from 'react-native-paper';
import type { AppTheme } from '@/theme';

type AuthErrorModalProps = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

export default function AuthErrorModal({
  visible,
  message,
  onClose,
}: AuthErrorModalProps) {
  const theme = useTheme<AppTheme>();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={styles.dialog}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.errorContainer }]}>
          <Text style={[styles.iconText, { color: theme.colors.error }]}>⚠</Text>
        </View>
        <Dialog.Title style={styles.title}>Something went wrong</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="contained" onPress={onClose} buttonColor={theme.colors.error} textColor={theme.colors.onError}>
            OK
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 340,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    textAlign: 'center',
  },
});
