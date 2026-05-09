import React, { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { cn } from './Button';

interface ChipProps {
  selected?: boolean;
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
  className?: string;
}

export function Chip({ selected, label, icon, onPress, className }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center px-4 py-2 rounded-full',
        selected ? 'bg-primary' : 'bg-surface-container-low',
        className
      )}
    >
      {icon && <View className="mr-1.5">{icon}</View>}
      <Text
        className={cn(
          'font-bodyMedium text-sm',
          selected ? 'text-white' : 'text-on-surface'
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
