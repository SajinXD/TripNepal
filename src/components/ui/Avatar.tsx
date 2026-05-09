import React from 'react';
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
