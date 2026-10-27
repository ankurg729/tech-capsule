import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'explore', title: 'Explore', icon: 'compass-outline', activeIcon: 'compass' },
  { name: 'community', title: 'Community', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  { name: 'news', title: 'News', icon: 'newspaper-outline', activeIcon: 'newspaper' },
  { name: 'learning', title: 'My Learning', icon: 'school-outline', activeIcon: 'school' },
];

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundElevated,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ color, focused, size }) => (
              <Icon
                name={focused ? tab.activeIcon : tab.icon}
                size={size - 2}
                color={typeof color === 'string' ? color : undefined}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
