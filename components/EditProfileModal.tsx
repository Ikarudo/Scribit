import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';

const M3 = {
  background: '#F5F0FA',
  surface: '#FFFFFF',
  surfaceContainerHigh: '#F0EBF8',
  primary: '#7C5DE8',
  primaryContainer: '#E8E0FC',
  onPrimary: '#FFFFFF',
  onSurface: '#1C1B22',
  onSurfaceVariant: '#5C5868',
  outline: '#D4CFE0',
  scrim: 'rgba(28, 27, 34, 0.4)',
};

const springConfig = { damping: 14, stiffness: 380 };

type EditProfileModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (username: string) => Promise<void>;
  currentUsername: string;
};

export default function EditProfileModal({
  visible,
  onClose,
  onSave,
  currentUsername,
}: EditProfileModalProps) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState(currentUsername);
  const [saving, setSaving] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (visible) {
      setUsername(currentUsername);
    }
  }, [visible, currentUsername]);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    if (username.trim() === currentUsername) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSave(username.trim());
      onClose();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + 16 },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Edit profile</Text>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={M3.onSurfaceVariant}
            autoCapitalize="none"
            maxLength={30}
            autoFocus
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              onPressIn={() => {
                scale.value = withSpring(0.96, springConfig);
              }}
              onPressOut={() => {
                scale.value = withSpring(1, springConfig);
              }}
            >
              <Animated.View style={[styles.saveBtnInner, animatedStyle]}>
                <Text style={styles.saveText}>
                  {saving ? 'Saving…' : 'Save'}
                </Text>
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: M3.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: M3.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: M3.outline,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: M3.onSurface,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  input: {
    borderRadius: 16,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: M3.onSurface,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: M3.onSurfaceVariant,
  },
  saveBtn: {
    backgroundColor: M3.primary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onPrimary,
  },
});
