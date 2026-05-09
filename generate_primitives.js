const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, 'src/components/ui');
if (!fs.existsSync(UI_DIR)) {
  fs.mkdirSync(UI_DIR, { recursive: true });
}

const files = {
  'Button.tsx': `import React, { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Variant = 'primary' | 'secondary' | 'ghost';
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
`,
  'Input.tsx': `import React, { useState } from 'react';
import { TextInput, TextInputProps, View, Text, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from './Button'; // Assuming we put cn there or in a utils file

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  isPassword,
  className,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="w-full">
      {label && (
        <Text className="font-semibold text-[14px] text-on-surface mb-2 font-bodySemibold">
          {label}
        </Text>
      )}
      <View
        className={cn(
          'flex-row items-center bg-surface-container-low border border-surface-container-highest rounded-[8px] px-3 h-12',
          isFocused && 'border-secondary',
          error && 'border-error',
          className
        )}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-on-surface font-body"
          placeholderTextColor="#9CA3AF"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <Pressable onPress={() => setShowPassword(!showPassword)} className="p-2">
            {showPassword ? (
              <EyeOff size={20} color="#717973" />
            ) : (
              <Eye size={20} color="#717973" />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-error text-sm mt-1 font-body">{error}</Text>
      )}
    </View>
  );
}
`,
  'Chip.tsx': `import React, { ReactNode } from 'react';
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
`,
  'SegmentedControl.tsx': `import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { cn } from './Button';

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  const translateX = useSharedValue(selectedIndex * 100);

  useEffect(() => {
    translateX.value = withTiming(selectedIndex * 100, {
      duration: 250,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
  }, [selectedIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: \`\${translateX.value}%\` as any }],
    width: \`\${100 / options.length}%\`,
  }));

  return (
    <View className="flex-row bg-surface-container-low rounded-full p-1 w-full relative h-12">
      <Animated.View
        className="absolute top-1 bottom-1 left-1 bg-primary rounded-full shadow-sm"
        style={[animatedStyle, { shadowColor: '#1B4332', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}
      />
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        return (
          <Pressable
            key={option}
            className="flex-1 justify-center items-center rounded-full z-10"
            onPress={() => onChange(index)}
          >
            <Text
              className={cn(
                'font-bodyMedium text-sm',
                isSelected ? 'text-white' : 'text-on-surface-variant'
              )}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
`,
  'Card.tsx': `import React, { ReactNode } from 'react';
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
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});
`,
  'Avatar.tsx': `import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { cn } from './Button';

type Status = 'online' | 'busy' | 'offline' | 'none';

interface AvatarProps {
  src?: string | ImageSourcePropType;
  size?: number;
  status?: Status;
  className?: string;
  borderMint?: boolean;
}

export function Avatar({ src, size = 36, status = 'none', className, borderMint }: AvatarProps) {
  const statusColors = {
    online: 'bg-[#22C55E]',
    busy: 'bg-[#F97316]',
    offline: 'bg-[#9CA3AF]',
  };

  return (
    <View className={cn('relative', className)}>
      <Image
        source={typeof src === 'string' ? { uri: src } : src || { uri: 'https://via.placeholder.com/150' }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className={cn(borderMint && 'border-[3px] border-mint')}
      />
      {status !== 'none' && (
        <View
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
            statusColors[status]
          )}
        />
      )}
    </View>
  );
}
`,
  'Badge.tsx': `import React, { ReactNode } from 'react';
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
`,
  'RatingPill.tsx': `import React from 'react';
import { View, Text } from 'react-native';
import { Star } from 'lucide-react-native';
import { cn } from './Button';

interface RatingPillProps {
  rating: number | string;
  className?: string;
}

export function RatingPill({ rating, className }: RatingPillProps) {
  return (
    <View className={cn('flex-row items-center bg-mint px-2 py-1 rounded-full', className)}>
      <Star size={12} color="#F4A261" fill="#F4A261" />
      <Text className="text-primary font-bodyBold text-[12px] ml-1">{rating}</Text>
    </View>
  );
}
`,
  'DifficultyMeter.tsx': `import React from 'react';
import { View, Text } from 'react-native';
import { cn } from './Button';

type Difficulty = 'Easy Walk' | 'Moderate' | 'Hard' | 'Expert';

interface DifficultyMeterProps {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  className?: string;
}

export function DifficultyMeter({ level, label, className }: DifficultyMeterProps) {
  const segments = [1, 2, 3, 4, 5];
  
  // Custom colors matching Sand to Terracotta
  const getSegmentColor = (idx: number) => {
    if (idx >= level) return 'bg-surface-container-highest';
    const colors = ['bg-[#F4A261]', 'bg-[#E69352]', 'bg-[#D88543]', 'bg-[#CA7634]', 'bg-[#BC6C25]'];
    return colors[idx];
  };

  return (
    <View className={className}>
      <View className="flex-row mb-1">
        {segments.map((idx) => (
          <View
            key={idx}
            className={cn('h-1 flex-1 rounded-full mr-2 last:mr-0', getSegmentColor(idx - 1))}
          />
        ))}
      </View>
      <Text className="text-primary font-bodySemibold text-[14px]">
        {label}
      </Text>
    </View>
  );
}
`,
  'IconTile.tsx': `import React, { ReactNode } from 'react';
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
    preferences: 'bg-[#E1F0FF]', // Light blue tint
    info: 'bg-surface-container',
    danger: 'bg-error-container',
  };

  return (
    <View className={cn('w-10 h-10 rounded-[8px] items-center justify-center', variants[variant], className)}>
      {icon}
    </View>
  );
}
`
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(UI_DIR, name), content);
  console.log('Wrote', name);
}

// Add clsx and tailwind-merge to package.json since we used it
const { execSync } = require('child_process');
try {
  execSync('npm install clsx tailwind-merge lucide-react-native', { stdio: 'inherit' });
} catch (e) {
  console.log('Dependencies might already be installed or error installing');
}
