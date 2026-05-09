import React, { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
  className,
  textClassName,
  ...rest
}: ButtonProps) {
  const handlePress = (e: any) => {
    if (loading || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  const baseContainer = 'flex-row items-center justify-center rounded-[8px]';
  const variants = {
    primary: 'bg-primary',
    secondary: 'bg-white border-[1.5px] border-secondary',
    outline: 'bg-white border-[1.5px] border-secondary',
    ghost: 'bg-transparent',
  };
  const sizes = {
    sm: 'px-4 py-2',
    md: 'px-5 py-3',
    lg: 'px-6 py-4 rounded-[12px]',
  };
  
  const textVariants = {
    primary: 'text-white',
    secondary: 'text-secondary',
    outline: 'text-secondary',
    ghost: 'text-tertiary',
  };
  const textSizes = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg font-semibold',
  };

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      disabled={loading || disabled}
      className={cn(
        baseContainer,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50',
        className
      )}
      style={({ pressed }) => [
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#0077B6'} />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={cn(textVariants[variant], textSizes[size], textClassName)}>
            {children}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
}
