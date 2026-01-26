import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import {
  RichText,
  useEditorBridge,
  TenTapStartKit,
  PlaceholderBridge,
} from '@10play/tentap-editor';
import { NotesToolbar } from '@/components/NotesToolbar';

const PLACEHOLDER = 'Start typing your note...';
const DEBOUNCE_MS = 1200;

const SCRIBIT_PLACEHOLDER_CSS = `
  /* Show placeholder for the entire empty editor */
  .is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  /* Show placeholder for ANY empty node (including list item paragraphs) */
  .is-empty::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`;

export interface TenTapNoteEditorRef {
  getHTML: () => Promise<string>;
  setContent: (content: string | object) => void;
  focus: (pos?: 'start' | 'end' | 'all' | number | boolean | null) => void;
}

export interface TenTapNoteEditorProps {
  initialContent: string;
  onContentChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

const TenTapNoteEditor = forwardRef<TenTapNoteEditorRef, TenTapNoteEditorProps>(
  function TenTapNoteEditor(
    {
      initialContent,
      onContentChange,
      placeholder = PLACEHOLDER,
      editable = true,
    },
    ref
  ) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [mounted, setMounted] = useState(false);

    const editor = useEditorBridge({
      bridgeExtensions: [
        ...TenTapStartKit,
        // Make placeholders work inside templates (nested lists, empty paragraphs, etc)
        // and add the missing CSS for empty nodes.
        PlaceholderBridge.configureExtension({
          placeholder,
          includeChildren: true,
          showOnlyCurrent: false,
        }).configureCSS(SCRIBIT_PLACEHOLDER_CSS),
      ],
      autofocus: false,
      avoidIosKeyboard: true,
      initialContent: initialContent || '',
      editable,
      DEV: false,
      webviewBaseURL: 'about:blank',
      onChange: useCallback(() => {
        if (!onContentChange) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          editor.getHTML().then(onContentChange);
        }, DEBOUNCE_MS);
      }, [onContentChange]),
    });

    useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editor.getHTML(),
        setContent: (content: string | object) => editor.setContent(content),
        focus: (pos) => editor.focus(pos),
      }),
      [editor]
    );

    useEffect(() => {
      setMounted(true);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, []);

    useEffect(() => {
      if (mounted && editor.setPlaceholder) {
        editor.setPlaceholder(placeholder);
      }
    }, [mounted, placeholder, editor]);

    return (
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 16}
      >
        <NotesToolbar editor={editor} editable={editable} />
        <RichText editor={editor} style={styles.richText} />
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 200,
  },
  richText: {
    flex: 1,
    minHeight: 160,
  },
});

export default TenTapNoteEditor;
