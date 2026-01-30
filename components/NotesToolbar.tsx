import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { useBridgeState } from '@10play/tentap-editor';
import type { EditorBridge } from '@10play/tentap-editor';
import { escapeHtml } from '@/components/notesContentUtils';

// Safe import for expo-speech-recognition (may not be available in Expo Go)
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
let isSpeechRecognitionAvailable = false;

try {
  const speechRecognition = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechRecognition.useSpeechRecognitionEvent;
  isSpeechRecognitionAvailable = !!ExpoSpeechRecognitionModule;
} catch (e) {
  console.warn('expo-speech-recognition not available:', e);
  isSpeechRecognitionAvailable = false;
}

const ACCENT = '#7B61FF';
const ACCENT_ACTIVE = '#5B41DF';
const ICON_SIZE = 20;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export interface NotesToolbarProps {
  editor: EditorBridge;
  editable?: boolean;
}

export function NotesToolbar({ editor, editable = true }: NotesToolbarProps) {
  const state = useBridgeState(editor);
  const [speaking, setSpeaking] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [dictating, setDictating] = useState(false);

  const toggleBold = useCallback(() => editor.toggleBold?.(), [editor]);
  const toggleItalic = useCallback(() => editor.toggleItalic?.(), [editor]);
  const toggleUnderline = useCallback(() => editor.toggleUnderline?.(), [editor]);
  const toggleStrike = useCallback(() => editor.toggleStrike?.(), [editor]);
  const toggleCode = useCallback(() => editor.toggleCode?.(), [editor]);
  const undo = useCallback(() => editor.undo?.(), [editor]);
  const redo = useCallback(() => editor.redo?.(), [editor]);

  const handleTTS = useCallback(async () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    try {
      const text = await editor.getText?.();
      const trimmed = (text ?? '').trim();
      if (!trimmed) {
        Alert.alert('Nothing to read', 'Add some text to your note first.');
        return;
      }
      setSpeaking(true);
      Speech.speak(trimmed, {
        language: 'en',
        pitch: 1,
        rate: 0.9,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } catch (e) {
      console.warn('NotesToolbar TTS error:', e);
      setSpeaking(false);
      Alert.alert('Text-to-speech', 'Could not read the note. Please try again.');
    }
  }, [editor, speaking]);

  // Only set up speech recognition event listeners if module is available
  if (isSpeechRecognitionAvailable && useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent('result', (event: any) => {
      const t = event.results?.[0]?.transcript?.trim();
      if (!t || !event.isFinal) return;
      (async () => {
        try {
          const html = await editor.getHTML?.();
          const base = (html ?? '').trim();
          const appended = base
            ? `${base}<p>${escapeHtml(t)}</p>`
            : `<p>${escapeHtml(t)}</p>`;
          editor.setContent?.(appended);
          editor.focus?.();
        } catch (e) {
          console.warn('NotesToolbar STT insert error:', e);
        }
      })();
    });

    useSpeechRecognitionEvent('end', () => setDictating(false));
    useSpeechRecognitionEvent('error', () => setDictating(false));
  }

  const handleSTT = useCallback(async () => {
    if (!isSpeechRecognitionAvailable || !ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Speech-to-text unavailable',
        'Speech recognition requires a development build. Please rebuild your app with "npx expo prebuild" and "npx expo run:android" or "npx expo run:ios".'
      );
      return;
    }

    if (dictating) {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        ExpoSpeechRecognitionModule.abort();
      }
      setDictating(false);
      return;
    }
    try {
      const ok = ExpoSpeechRecognitionModule.isRecognitionAvailable?.();
      if (ok === false) {
        Alert.alert(
          'Speech-to-text',
          'Speech recognition is not available on this device. Enable dictation in system settings.'
        );
        return;
      }
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Allow microphone and speech recognition to dictate notes.'
        );
        return;
      }
      setDictating(true);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        iosTaskHint: 'dictation',
      });
    } catch (e) {
      console.warn('NotesToolbar STT error:', e);
      setDictating(false);
      Alert.alert('Speech-to-text', 'Could not start dictation. Please try again.');
    }
  }, [editor, dictating]);

  const handleImagePick = useCallback(async () => {
    if (pickingImage) return;
    setPickingImage(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow access to your photo library to insert images.'
        );
        setPickingImage(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) {
        setPickingImage(false);
        return;
      }
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      if (uri && editor.setImage) {
        editor.setImage(uri);
        editor.focus?.();
      }
    } catch (e) {
      console.warn('NotesToolbar image pick error:', e);
      Alert.alert('Insert image', 'Could not insert the image. Please try again.');
    } finally {
      setPickingImage(false);
    }
  }, [editor, pickingImage]);

  const canFormat = editable && state?.isFocused;
  const boldActive = !!state?.isBoldActive;
  const italicActive = !!state?.isItalicActive;
  const underlineActive = !!state?.isUnderlineActive;
  const strikeActive = !!state?.isStrikeActive;
  const codeActive = !!state?.isCodeActive;
  const canUndo = !!state?.canUndo;
  const canRedo = !!state?.canRedo;

  const formatBtn = (
    icon: React.ComponentProps<typeof FontAwesome5>['name'],
    onPress: () => void,
    active: boolean,
    disabled?: boolean
  ) => (
    <TouchableOpacity
      hitSlop={HIT_SLOP}
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, active && styles.btnActive, disabled && styles.btnDisabled]}
    >
      <FontAwesome5
        name={icon}
        size={ICON_SIZE}
        color={active ? '#fff' : disabled ? '#bbb' : '#444'}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {formatBtn('bold', toggleBold, boldActive, !canFormat)}
        {formatBtn('italic', toggleItalic, italicActive, !canFormat)}
        {formatBtn('underline', toggleUnderline, underlineActive, !canFormat)}
        {formatBtn('strikethrough', toggleStrike, strikeActive, !canFormat)}
        {formatBtn('code', toggleCode, codeActive, !canFormat)}
        <View style={styles.divider} />
        {formatBtn('undo', undo, false, !canUndo)}
        {formatBtn('redo', redo, false, !canRedo)}
        <View style={styles.divider} />
        <TouchableOpacity
          hitSlop={HIT_SLOP}
          onPress={handleTTS}
          style={[styles.btn, speaking && styles.btnActive]}
        >
          <FontAwesome5
            name={speaking ? 'stop-circle' : 'volume-up'}
            size={ICON_SIZE}
            color={speaking ? '#fff' : '#444'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={HIT_SLOP}
          onPress={handleSTT}
          disabled={!editable}
          style={[styles.btn, dictating && styles.btnActive]}
        >
          <FontAwesome5
            name="microphone"
            size={ICON_SIZE}
            color={dictating ? '#fff' : !editable ? '#bbb' : '#444'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={HIT_SLOP}
          onPress={handleImagePick}
          disabled={!editable || pickingImage}
          style={[styles.btn, pickingImage && styles.btnDisabled]}
        >
          {pickingImage ? (
            <ActivityIndicator size="small" color={ACCENT} />
          ) : (
            <FontAwesome5
              name="image"
              size={ICON_SIZE}
              color={!editable || pickingImage ? '#bbb' : '#444'}
            />
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F8FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  btn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  btnActive: {
    backgroundColor: ACCENT,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 6,
  },
});
