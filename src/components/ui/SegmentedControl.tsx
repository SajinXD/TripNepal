import React, { useEffect } from 'react';
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
    transform: [{ translateX: `${translateX.value}%` as any }],
    width: `${100 / options.length}%`,
  }));

  return (
    <View className="flex-row bg-surface-container-low rounded-full p-1 w-full relative h-12">
      <Animated.View
        className="absolute top-1 bottom-1 left-1 bg-primary rounded-full shadow-sm"
        style={[animatedStyle, { shadowColor: '#8B1A1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}
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
