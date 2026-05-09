import React from 'react';
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
