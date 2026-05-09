import { View, Text } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function Skeleton() {
  return (
    <SafeScreen edges={['top', 'bottom']}>
      <View className='flex-1 items-center justify-center'>
        <Text className='font-display text-2xl text-primary'>role-select.tsx Skeleton</Text>
      </View>
    </SafeScreen>
  );
}
