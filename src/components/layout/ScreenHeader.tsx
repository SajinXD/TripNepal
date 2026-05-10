import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Menu, Sparkles, Bell } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/Button';
import { SideDrawer } from './SideDrawer';
import { useAuth } from '../../hooks/useAuth';

interface ScreenHeaderProps {
  showTripNow?: boolean;
  showBell?: boolean;
  onTripNow?: () => void;
  onBellPress?: () => void;
  className?: string;
}

export function ScreenHeader({ showTripNow, showBell, onTripNow, onBellPress, className }: ScreenHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <>
      <View className={cn('flex-row items-center justify-between bg-white dark:bg-gray-900 px-5 py-4 border-b border-outline-variant dark:border-gray-800', className)}>
        <View className="flex-row items-center">
          <Pressable onPress={() => setDrawerOpen(true)} className="mr-3" hitSlop={8}>
            <Menu size={24} color="#8B1A1A" />
          </Pressable>
          <Text className="font-displayBold text-[20px] text-primary">Trip Nepal</Text>
        </View>

        <View className="flex-row items-center">
          {showTripNow && (
            <Pressable
              onPress={onTripNow}
              hitSlop={8}
              className="flex-row items-center bg-primary px-3 py-1.5 rounded-full mr-4"
            >
              <Sparkles size={14} color="#FFF" />
              <Text className="text-white font-bodyBold text-[12px] ml-1.5">Trip Now</Text>
            </Pressable>
          )}

          {showBell && (
            <Pressable onPress={onBellPress} hitSlop={8} className="mr-4 relative">
              <Bell size={24} color="#191C1D" />
              <View className="w-2 h-2 rounded-full bg-error absolute top-0 right-0" />
            </Pressable>
          )}

          <Avatar size={36} src={profile?.avatar_url || undefined} />
        </View>
      </View>

      <SideDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
