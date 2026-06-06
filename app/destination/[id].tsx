import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MapPin, Mountain, Thermometer, ChevronLeft, Map as MapIcon } from 'lucide-react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function DestinationDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [dest, setDest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('destinations').select('*').eq('id', id).single().then(({ data }) => {
      setDest(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <SafeScreen bg="#F7F7F4">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8B1A1A" />
        </View>
      </SafeScreen>
    );
  }

  if (!dest) return <SafeScreen><Text>Not found.</Text></SafeScreen>;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
        
        {}
        <View className="h-80 relative">
          <Image source={{ uri: dest.cover_image_url || dest.image_url }} className="w-full h-full" contentFit="cover" />
          <View className="absolute inset-0 bg-black/30" />
          
          <SafeAreaHeader>
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md ml-4 mt-2">
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaHeader>

          <View className="absolute bottom-6 left-6 right-6">
            <Text className="font-display text-white text-4xl mb-2">{dest.name}</Text>
            <View className="flex-row items-center">
              <MapPin size={16} color="#DDF1E1" />
              <Text className="font-medium text-mint ml-1 text-base">{dest.district}</Text>
            </View>
          </View>
        </View>

        {}
        <View className="px-6 pt-6 pb-24">
          <View className="flex-row justify-between mb-6">
            <View className="bg-card border border-border p-3 rounded-2xl flex-1 mr-3 items-center">
              <Mountain size={20} color="#8B1A1A" className="mb-1" />
              <Text className="font-semibold text-text text-sm">{dest.altitude_m ?? dest.elevation_m ?? '—'}m</Text>
              <Text className="text-[10px] text-text-secondary uppercase">Elevation</Text>
            </View>
            <View className="bg-card border border-border p-3 rounded-2xl flex-1 mr-3 items-center">
              <MapIcon size={20} color="#8B1A1A" className="mb-1" />
              <Text className="font-semibold text-text text-sm">{dest.difficulty_level || dest.difficulty || 'Moderate'}</Text>
              <Text className="text-[10px] text-text-secondary uppercase">Difficulty</Text>
            </View>
            <View className="bg-card border border-border p-3 rounded-2xl flex-1 items-center">
              <Thermometer size={20} color="#8B1A1A" className="mb-1" />
              <Text className="font-semibold text-text text-sm text-center">
                {Array.isArray(dest.best_season) ? dest.best_season.join(', ') : dest.best_season || 'Oct–Nov'}
              </Text>
              <Text className="text-[10px] text-text-secondary uppercase">Best Time</Text>
            </View>
          </View>

          <Text className="font-display text-xl text-text mb-3">About</Text>
          <Text className="font-sans text-base text-text-secondary leading-6 mb-8">
            {dest.description || dest.short_description || `Experience the breathtaking beauty of ${dest.name}, located in the heart of ${dest.district}. A perfect blend of nature and culture awaits you.`}
          </Text>

        </View>
      </ScrollView>

      {}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-border p-4 pb-8 flex-row items-center justify-between">
        <View>
          <Text className="font-sans text-text-secondary text-xs uppercase tracking-wider">Plan Your Trip</Text>
          <Text className="font-semibold text-primary text-base">Find a Local Guide</Text>
        </View>
        <Button onPress={() => router.push('/guides')}>View Guides</Button>
      </View>
    </View>
  );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';
function SafeAreaHeader({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingTop: insets.top, position: 'absolute', top: 0, left: 0, zIndex: 10 }}>{children}</View>;
}
