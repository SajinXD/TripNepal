import React from 'react';
import { View, Text, ImageBackground, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { Button } from '../src/components/ui/Button';
import { Avatar } from '../src/components/ui/Avatar';
import { Badge } from '../src/components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1000&auto=format&fit=crop' }}
        className="flex-1 w-full h-full justify-between"
      >
        <LinearGradient
          colors={['rgba(20,40,60,0.4)', 'rgba(10,20,30,0.7)']}
          className="absolute inset-0 w-full h-full"
        />
        
        <View style={{ paddingTop: insets.top + 20 }} className="px-6 flex-row justify-between items-start">
          <View>
            <Text className="text-white/70 font-bodyBold text-[12px] uppercase tracking-wider mb-1">
              HIGHLANDS & HORIZONS
            </Text>
            <Text className="font-displayBold text-[24px] text-white">Trip Nepal</Text>
          </View>
          <Avatar src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=150" size={40} borderMint />
        </View>

        <View className="px-6 pb-12" style={{ paddingBottom: insets.bottom + 40 }}>
          <View className="bg-white/20 border border-white/20 self-start px-3 py-1.5 rounded-[8px] flex-row items-center mb-6">
            <ShieldCheck size={14} color="#A5D0B9" />
            <Text className="text-white font-bodyBold text-[12px] ml-1.5 tracking-wider uppercase">READY FOR EXPEDITION</Text>
          </View>

          <Text className="font-displayBold text-[48px] text-white leading-[52px] tracking-tight mb-4">
            The mountains are calling, and I must go.
          </Text>
          
          <Text className="text-white/70 font-body text-[16px] mb-6">
            — John Muir
          </Text>

          <Text className="text-white font-body text-[16px] leading-[24px] mb-8 pr-4">
            Navigate the rugged beauty of the Himalayas with expert-led expeditions and real-time mountain intelligence.
          </Text>

          <Button
            variant="primary"
            fullWidth={false}
            className="w-[180px] mb-12"
            rightIcon={<ArrowRight size={18} color="#FFF" />}
            onPress={() => router.push('/(auth)/login')}
          >
            Trip Now
          </Button>

          <View className="flex-row items-center justify-between border-t border-white/20 pt-6">
            <View>
              <Text className="text-white font-displaySemiBold text-[20px]">8,848m</Text>
              <Text className="text-white/70 font-bodyMedium text-[11px] uppercase tracking-wider">MAX ELEVATION</Text>
            </View>
            <View>
              <Text className="text-white font-displaySemiBold text-[20px]">24/7</Text>
              <Text className="text-white/70 font-bodyMedium text-[11px] uppercase tracking-wider">SUPPORT</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
