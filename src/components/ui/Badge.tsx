import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { cn } from './Button';

type BadgeVariant = 'mint' | 'terracotta' | 'verified';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ label, variant = 'mint', icon, className }: BadgeProps) {
  const variants = {
    mint: 'bg-mint',
    terracotta: 'bg-tertiary',
    verified: 'bg-secondary-container',
  };
  
  const textVariants = {
    mint: 'text-primary',
    terracotta: 'text-white',
    verified: 'text-secondary',
  };

  return (
    <View className={cn('flex-row items-center px-2 py-1 rounded-[6px]', variants[variant], className)}>
      {icon && <View className="mr-1">{icon}</View>}
      <Text className={cn('font-bodyBold text-[12px] uppercase tracking-wider', textVariants[variant])}>
        {label}
      </Text>
    </View>
  );
}
