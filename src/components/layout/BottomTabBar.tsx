import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { Home, Compass, Bot, MessageSquare, Settings, LayoutDashboard, Briefcase, MessageCircle } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../ui/Button';

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row bg-white dark:bg-gray-900 border-t border-surface-container dark:border-gray-800 pt-3"
      style={[{ paddingBottom: insets.bottom || 20 }, styles.shadow]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let Icon = Home;
        if (route.name === 'home') Icon = Home;
        else if (route.name === 'explore') Icon = Compass;
        else if (route.name === 'ai-plan') Icon = Bot;
        else if (route.name === 'inbox') Icon = MessageSquare;
        else if (route.name === 'settings') Icon = Settings;
        else if (route.name === 'dashboard') Icon = LayoutDashboard;
        else if (route.name === 'bookings') Icon = Briefcase;
        else if (route.name === 'messages') Icon = MessageCircle;

        return (
          <Pressable
            key={index}
            onPress={onPress}
            className="flex-1 items-center justify-center relative"
          >
            <View className={cn('items-center', route.name === 'ai-plan' && 'mt-[-8px]')}>
              <Icon
                size={24}
                color={isFocused ? '#8B1A1A' : '#9CA3AF'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
              <Text
                className={cn(
                  'text-[11px] font-bodyMedium mt-1',
                  isFocused ? 'text-primary font-semibold' : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {label as string}
              </Text>
            </View>
            {isFocused && (
              <View className="w-1 h-1 rounded-full bg-primary absolute bottom-[-6px]" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#8B1A1A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
});
