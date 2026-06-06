import React, { useState, ReactNode } from 'react';
import { TextInput, TextInputProps, View, Text, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from './Button'; 

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
