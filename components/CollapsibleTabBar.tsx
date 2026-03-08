import React, { useState, useCallback, useContext, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTheme } from 'react-native-paper';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { AppTheme } from '@/theme';

const SWIPE_THRESHOLD = 36;
const ARROW_HEIGHT = 48;
const FULL_HEIGHT = 78; // tab bar ~70 + margin 8

export function CollapsibleTabBar(props: BottomTabBarProps) {
  const theme = useTheme<AppTheme>();
  const [collapsed, setCollapsed] = useState(false);
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  useEffect(() => {
    if (collapsed) onHeightChange?.(ARROW_HEIGHT);
  }, [collapsed, onHeightChange]);

  const collapse = useCallback(() => setCollapsed(true), []);
  const expand = useCallback(() => setCollapsed(false), []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
        onPanResponderRelease: (_, g) => {
          if (g.dy > SWIPE_THRESHOLD) collapse();
        },
      }),
    [collapse]
  );

  if (collapsed) {
    return (
      <View
        style={[styles.arrowRoot, { height: ARROW_HEIGHT }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={expand}
          style={[styles.arrowBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          activeOpacity={0.8}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <FontAwesome5 name="chevron-up" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      <BottomTabBar {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
  arrowRoot: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  arrowBtn: {
    width: 48,
    height: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
