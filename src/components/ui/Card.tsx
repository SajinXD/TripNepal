import React, { ReactNode } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { cn } from './Button';

interface CardProps extends ViewProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function Card({ children, className, noPadding, style, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'bg-white rounded-[16px]',
        !noPadding && 'p-4',
        className
      )}
      style={[styles.cardShadow, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#8B1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});
