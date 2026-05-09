const fs = require('fs');
const path = require('path');

const LAYOUT_DIR = path.join(__dirname, 'src/components/layout');
if (!fs.existsSync(LAYOUT_DIR)) {
  fs.mkdirSync(LAYOUT_DIR, { recursive: true });
}

const files = {
  'BottomTabBar.tsx': `import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { Home, Compass, Bot, MessageSquare, Settings, LayoutDashboard } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../ui/Button';

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row bg-white border-t border-surface-container pt-3"
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

        return (
          <Pressable
            key={index}
            onPress={onPress}
            className="flex-1 items-center justify-center relative"
          >
            <View className={cn('items-center', route.name === 'ai-plan' && 'mt-[-8px]')}>
              <Icon
                size={24}
                color={isFocused ? '#1B4332' : '#717973'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
              <Text
                className={cn(
                  'text-[11px] font-bodyMedium mt-1',
                  isFocused ? 'text-primary font-semibold' : 'text-outline'
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
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
});
`,
  'ScreenHeader.tsx': `import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Menu, Sparkles, Bell } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/Button';

interface ScreenHeaderProps {
  showTripNow?: boolean;
  showBell?: boolean;
  onMenuPress?: () => void;
  className?: string;
}

export function ScreenHeader({ showTripNow, showBell, onMenuPress, className }: ScreenHeaderProps) {
  return (
    <View className={cn('flex-row items-center justify-between bg-white px-5 py-4 border-b border-outline-variant', className)}>
      <View className="flex-row items-center">
        <Pressable onPress={onMenuPress} className="mr-3">
          <Menu size={24} color="#1B4332" />
        </Pressable>
        <Text className="font-displayBold text-[20px] text-primary">Trip Nepal</Text>
      </View>
      
      <View className="flex-row items-center">
        {showTripNow && (
          <Pressable className="flex-row items-center bg-primary px-3 py-1.5 rounded-full mr-4">
            <Sparkles size={14} color="#FFF" />
            <Text className="text-white font-bodyBold text-[12px] ml-1.5">Trip Now</Text>
          </Pressable>
        )}
        
        {showBell && (
          <Pressable className="mr-4 relative">
            <Bell size={24} color="#191C1D" />
            <View className="w-2 h-2 rounded-full bg-error absolute top-0 right-0" />
          </Pressable>
        )}
        
        <Avatar size={36} src="https://via.placeholder.com/150" />
      </View>
    </View>
  );
}
`
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(LAYOUT_DIR, name), content);
  console.log('Wrote layout component', name);
}
