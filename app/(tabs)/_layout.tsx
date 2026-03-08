import React from 'react';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { CollapsibleTabBar } from '@/components/CollapsibleTabBar';
import type { AppTheme } from '@/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome5>['name'];
  color: string;
}) {
  return <FontAwesome5 size={24} style={{ marginBottom: -2 }} {...props} />;
}

const TAB_OPTIONS: Record<string, { title: string; icon: React.ComponentProps<typeof FontAwesome5>['name'] }> = {
  home: { title: 'Home', icon: 'home' },
  notes: { title: 'Notes', icon: 'sticky-note' },
  calendar: { title: 'Calendar', icon: 'calendar' },
  reminders: { title: 'Reminders', icon: 'bell' },
  tasks: { title: 'Tasks', icon: 'check-square' },
  profile: { title: 'Profile', icon: 'user' },
};

export default function TabLayout() {
  const theme = useTheme<AppTheme>();
  const tabBarBg = theme.colors.surfaceVariant;
  const tabBarActive = theme.colors.primary;
  const tabBarInactive = theme.colors.onSurfaceVariant;

  return (
    <Tabs
      tabBar={(props) => <CollapsibleTabBar {...props} />}
      screenOptions={({ route }) => {
        const opts = TAB_OPTIONS[route.name] ?? { title: route.name, icon: 'circle' as const };
        return {
          headerShown: false,
          title: opts.title,
          tabBarIcon: ({ color }) => <TabBarIcon name={opts.icon} color={color} />,
          tabBarActiveTintColor: tabBarActive,
          tabBarInactiveTintColor: tabBarInactive,
          tabBarStyle: {
            backgroundColor: tabBarBg,
            borderTopWidth: 0,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderBottomRightRadius: 26,
            borderBottomLeftRadius: 26,
            overflow: 'hidden',
            elevation: 8,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            height: 70,
            marginHorizontal: 4,
            marginBottom: 8,
            position: 'absolute',
          },
          tabBarBackground: () => (
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 92,
              backgroundColor: tabBarBg,
            }} />
          ),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarItemStyle: {
            paddingTop: 6,
          },
        };
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="reminders" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}