import React from 'react';
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
