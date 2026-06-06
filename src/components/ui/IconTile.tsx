import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from './Button';

type TileVariant = 'primary' | 'preferences' | 'info' | 'danger';

interface IconTileProps {
  icon: ReactNode;
  variant?: TileVariant;
  className?: string;
}

export function IconTile({ icon, variant = 'info', className }: IconTileProps) {
  const variants = {
    primary: 'bg-mint',
    preferences: 'bg-[#E1F0FF]', 
    info: 'bg-surface-container',
    danger: 'bg-error-container',
  };

  return (
    <View className={cn('w-10 h-10 rounded-[8px] items-center justify-center', variants[variant], className)}>
      {icon}
    </View>
  );
}
