import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Image, TextInput, Linking } from 'react-native';
import { ExploreMap } from '../../src/components/map/ExploreMap';
import { Search, Navigation, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../src/components/ui/Card';
import { RatingPill } from '../../src/components/ui/RatingPill';
import { DifficultyMeter } from '../../src/components/ui/DifficultyMeter';
import { Button } from '../../src/components/ui/Button';
import { supabase } from '../../src/lib/supabase';

interface DbDestination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cover_image_url?: string;
  district?: string;
  difficulty_level?: string;
  altitude_m?: number;
  [key: string]: unknown;
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [selectedDest, setSelectedDest] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.from('destinations').select('*').then(({ data }) => {
      if (data) {
        const rows = data as unknown as DbDestination[];
        const mapped = rows.map(d => ({
          ...d,
          lat: d.latitude,
          lng: d.longitude,
          image_url: d.cover_image_url,
          location_district: d.district,
          difficulty: d.difficulty_level
            ? d.difficulty_level.charAt(0).toUpperCase() + d.difficulty_level.slice(1)
            : 'Moderate',
          elevation_m: d.altitude_m,
        }));
        setDestinations(mapped);
      } else {
        setDestinations([
          {
            id: '1', name: 'Phewa Lake', location_district: 'Kaski',
            lat: 28.2100, lng: 83.9500,
            image_url: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=400',
            difficulty: 'Easy', elevation_m: 742,
          },
          {
            id: '2', name: 'Annapurna Base Camp', location_district: 'Kaski',
            lat: 28.5300, lng: 83.8780,
            image_url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=400',
            difficulty: 'Hard', elevation_m: 4130,
          },
        ]);
      }
    });
  }, []);

  const openGoogleMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${name}`;
    Linking.openURL(url);
  };

  const getDifficultyLevel = (diff: string) => {
    if (diff === 'Easy' || diff === 'Easy Walk') return 1;
    if (diff === 'Moderate') return 2;
    if (diff === 'Hard') return 3;
    if (diff === 'Expert') return 4;
    return 2;
  };

  return (
    <View className="flex-1 bg-surface dark:bg-gray-900">
      <ExploreMap
        destinations={destinations}
        selectedDest={selectedDest}
        setSelectedDest={setSelectedDest}
        mapRef={mapRef}
        searchQuery={searchQuery}
      />

      {}
      <View style={{ paddingTop: insets.top + 10 }} className="px-5 w-full absolute top-0 z-10">
        <View
          className="bg-white h-12 rounded-[16px] flex-row items-center px-4 shadow-sm"
          style={{ shadowColor: '#8B1A1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}
        >
          <Search size={20} color="#717973" />
          <TextInput
            className="flex-1 font-body text-[16px] text-on-surface ml-3"
            placeholder="Search destinations, landmarks..."
            placeholderTextColor="#717973"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-[13px] text-primary font-bodyMedium px-1">Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      {selectedDest && (
        <View className="absolute bottom-4 left-5 right-5 z-10" style={{ elevation: 20 }}>
          <Card noPadding className="w-full rounded-t-[16px] rounded-b-[16px] overflow-hidden p-4 bg-white">
            <View className="w-8 h-1 bg-outline-variant rounded-full self-center mb-4" />

            <View className="relative mb-4">
              <Image
                source={{ uri: selectedDest.image_url || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }}
                className="w-full h-[180px] rounded-[16px]"
              />
              <View className="absolute top-3 left-3">
                <RatingPill rating="4.8" />
              </View>
            </View>

            <View className="mb-4">
              <Text className="font-displayBold text-[24px] text-on-surface" numberOfLines={1}>
                {selectedDest.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <MapPin size={14} color="#717973" />
                <Text className="font-body text-[14px] text-on-surface-variant ml-1">
                  {selectedDest.location_district || 'Nepal'}
                </Text>
              </View>
            </View>

            <View className="flex-row mb-6">
              <View className="flex-1 border-r border-outline-variant pr-4">
                <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">
                  TREK DIFFICULTY
                </Text>
                <DifficultyMeter
                  level={getDifficultyLevel(selectedDest.difficulty)}
                  label={selectedDest.difficulty || 'Moderate'}
                />
              </View>
              <View className="flex-1 pl-4">
                <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">
                  ELEVATION
                </Text>
                <View className="flex-row items-baseline">
                  <Text className="font-displaySemiBold text-[20px] text-on-surface">
                    {selectedDest.elevation_m || 822}
                  </Text>
                  <Text className="font-body text-[12px] text-on-surface-variant ml-1">m ASL</Text>
                </View>
              </View>
            </View>

            <Button
              variant="primary"
              className="w-full"
              leftIcon={<Navigation size={18} color="#FFF" />}
              onPress={() => openGoogleMaps(selectedDest.lat, selectedDest.lng, selectedDest.name)}
            >
              Navigate
            </Button>
          </Card>
        </View>
      )}
    </View>
  );
}
