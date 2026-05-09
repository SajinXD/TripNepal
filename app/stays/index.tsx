import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, ImageBackground, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Heart, Wifi, Coffee, Flame, MapPin } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Chip } from '../../src/components/ui/Chip';
import { Button } from '../../src/components/ui/Button';
import { RatingPill } from '../../src/components/ui/RatingPill';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATIC_LODGES = [
  {
    id: 'lodge-1',
    name: 'Annapurna Serenity Villa',
    location: 'Sarangkot, Pokhara',
    price_npr: 14500,
    price_usd: 110,
    rating: '4.9',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    amenities: ['wifi', 'breakfast', 'heating'],
    type: 'Villa',
    is_featured: true,
  },
  {
    id: 'lodge-2',
    name: 'Himalayan Teahouse Retreat',
    location: 'Namche Bazaar, Solukhumbu',
    price_npr: 4800,
    price_usd: 36,
    rating: '4.7',
    image_url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800',
    amenities: ['breakfast', 'heating'],
    type: 'Teahouse',
    is_featured: false,
  },
  {
    id: 'lodge-3',
    name: 'Lakeside Heritage Inn',
    location: 'Lakeside, Pokhara',
    price_npr: 8200,
    price_usd: 62,
    rating: '4.8',
    image_url: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    amenities: ['wifi', 'breakfast'],
    type: 'Boutique Hotel',
    is_featured: false,
  },
  {
    id: 'lodge-4',
    name: 'Jungle Canopy Lodge',
    location: 'Sauraha, Chitwan',
    price_npr: 11000,
    price_usd: 83,
    rating: '4.6',
    image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    amenities: ['wifi', 'breakfast', 'heating'],
    type: 'Eco Lodge',
    is_featured: false,
  },
];

const FILTERS = ['All', 'Villa', 'Teahouse', 'Boutique Hotel', 'Eco Lodge'];
const WISHLIST_KEY = 'stays_wishlist';

export default function StaysScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Load persisted wishlist on mount
  useEffect(() => {
    AsyncStorage.getItem(WISHLIST_KEY).then(saved => {
      if (saved) setWishlist(new Set(JSON.parse(saved)));
    });
  }, []);

  function toggleWishlist(id: string) {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  // Sort: bookmarked first, then filter
  const filtered = useMemo(() => {
    const sorted = [...STATIC_LODGES].sort(
      (a, b) => (wishlist.has(b.id) ? 1 : 0) - (wishlist.has(a.id) ? 1 : 0)
    );
    return sorted.filter(l => {
      const matchFilter = activeFilter === 'All' || l.type === activeFilter;
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.location.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [activeFilter, search, wishlist]);

  const featured = STATIC_LODGES.find(l => l.is_featured);

  return (
    <View className="flex-1 bg-surface dark:bg-gray-900">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor="#8B1A1A" />}
      >
        {/* Search */}
        <View className="px-5 pt-5">
          <View className="bg-white dark:bg-gray-800 h-12 border border-outline-variant dark:border-gray-700 rounded-[8px] flex-row items-center px-4 mb-4">
            <Search size={20} color="#717973" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              className="flex-1 font-body text-[16px] text-on-surface dark:text-white ml-3"
              placeholder="Search mountain lodges, villas..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 px-5">
          {FILTERS.map(f => (
            <TouchableOpacity key={f} activeOpacity={0.7} onPress={() => setActiveFilter(f)} className="mr-2">
              <Chip label={f} selected={activeFilter === f} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Hero */}
        {featured && activeFilter === 'All' && !search && (
          <TouchableOpacity
            activeOpacity={0.9}
            className="mx-5 mb-5"
            onPress={() => router.push(`/stays/${featured.id}` as any)}
          >
            <Card noPadding className="w-full h-[220px] overflow-hidden">
              <ImageBackground
                source={{ uri: featured.image_url }}
                className="w-full h-full justify-end p-4"
              >
                <LinearGradient colors={['transparent', 'rgba(10,20,30,0.82)']} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <View className="bg-white/20 self-start px-2 py-1 rounded-[6px] mb-2" style={{ zIndex: 1 }}>
                  <Text className="text-white font-bodyBold text-[10px] uppercase tracking-wider">FEATURED PROPERTY</Text>
                </View>
                <Text className="text-white font-displayBold text-[24px]" style={{ zIndex: 1 }}>{featured.name}</Text>
                <View className="flex-row items-center mt-1" style={{ zIndex: 1 }}>
                  <MapPin size={12} color="rgba(255,255,255,0.7)" />
                  <Text className="text-white/80 font-body text-[14px] ml-1">{featured.location}</Text>
                </View>
              </ImageBackground>
            </Card>
          </TouchableOpacity>
        )}

        {/* Rental Insight */}
        {activeFilter === 'All' && !search && (
          <Card className="bg-primary mx-5 mb-5 p-5">
            <Text className="font-displaySemiBold text-[16px] text-mint mb-1">Rental Insight</Text>
            <Text className="font-body text-[14px] text-white leading-[20px]">
              Mountain lodge demand in Pokhara is up 15% this season. Book early for best rates.
            </Text>
          </Card>
        )}

        {/* Listings */}
        <View className="px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-displaySemiBold text-[20px] text-on-surface dark:text-white">
              {activeFilter === 'All' ? 'All Stays' : activeFilter + 's'}
            </Text>
            <Text className="font-body text-[13px] text-on-surface-variant">{filtered.length} properties</Text>
          </View>

          {filtered.map(lodge => (
            <TouchableOpacity
              key={lodge.id}
              activeOpacity={0.9}
              onPress={() => router.push(`/stays/${lodge.id}` as any)}
            >
              <Card noPadding className="mb-5 p-4">
                {/* Image */}
                <View className="relative mb-3">
                  <ImageBackground
                    source={{ uri: lodge.image_url }}
                    className="w-full h-[180px] rounded-[16px] overflow-hidden justify-between p-3"
                  >
                    <View className="items-end">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={(e) => { e.stopPropagation(); toggleWishlist(lodge.id); }}
                        style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: wishlist.has(lodge.id) ? '#EF4444' : 'rgba(255,255,255,0.85)',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Heart
                          size={16}
                          color={wishlist.has(lodge.id) ? '#fff' : '#717973'}
                          fill={wishlist.has(lodge.id) ? '#fff' : 'none'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row justify-between items-end">
                      <View className="bg-mint px-2 py-1 rounded-[6px]">
                        <Text className="font-bodyBold text-[10px] text-primary uppercase tracking-wider">VERIFIED</Text>
                      </View>
                      <RatingPill rating={lodge.rating} />
                    </View>
                  </ImageBackground>
                  {wishlist.has(lodge.id) && (
                    <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>SAVED</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="flex-row justify-between items-start mb-1">
                  <View className="flex-1 mr-3">
                    <Text className="font-displaySemiBold text-[16px] text-on-surface" numberOfLines={1}>{lodge.name}</Text>
                    <View className="flex-row items-center mt-1">
                      <MapPin size={11} color="#717973" />
                      <Text className="font-body text-[13px] text-on-surface-variant ml-1">{lodge.location}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="font-displaySemiBold text-[16px] text-secondary">NPR {lodge.price_npr.toLocaleString()}</Text>
                    <Text className="font-body text-[12px] text-on-surface-variant">${lodge.price_usd} / night</Text>
                  </View>
                </View>

                {/* Amenities */}
                <View className="flex-row items-center mb-4 border-t border-outline-variant pt-3 mt-1">
                  {lodge.amenities.includes('wifi') && (
                    <View className="flex-row items-center mr-3">
                      <Wifi size={13} color="#717973" />
                      <Text className="font-body text-[12px] text-on-surface-variant ml-1">WiFi</Text>
                    </View>
                  )}
                  {lodge.amenities.includes('breakfast') && (
                    <View className="flex-row items-center mr-3">
                      <Coffee size={13} color="#717973" />
                      <Text className="font-body text-[12px] text-on-surface-variant ml-1">Breakfast</Text>
                    </View>
                  )}
                  {lodge.amenities.includes('heating') && (
                    <View className="flex-row items-center">
                      <Flame size={13} color="#717973" />
                      <Text className="font-body text-[12px] text-on-surface-variant ml-1">Heating</Text>
                    </View>
                  )}
                </View>

                <Button variant="primary" className="w-full" onPress={() => router.push(`/stays/${lodge.id}` as any)}>
                  View Details
                </Button>
              </Card>
            </TouchableOpacity>
          ))}

          {filtered.length === 0 && (
            <View className="items-center py-16">
              <Text className="font-displaySemiBold text-[18px] text-on-surface dark:text-white mb-2">No stays found</Text>
              <Text className="font-body text-[14px] text-on-surface-variant text-center">Try adjusting your filters or search term.</Text>
            </View>
          )}
        </View>

        <View className="h-12" />
      </ScrollView>
    </View>
  );
}
