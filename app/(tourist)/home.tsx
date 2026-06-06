import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ImageBackground, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, DollarSign, Home as HomeIcon, Bookmark, BookmarkCheck, Trees, Landmark, Users } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { RatingPill } from '../../src/components/ui/RatingPill';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';

const FALLBACK_IMAGES: Record<string, string> = {
  trekking:    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
  cultural:    'https://images.unsplash.com/photo-1582654291374-c8bcf56e7e21?w=800',
  spiritual:   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  wildlife:    'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800',
  adventure:   'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800',
  sightseeing: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800',
  default:     'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800',
};

function getDestImage(dest: any): string {
  if (dest.cover_image_url) return dest.cover_image_url;
  if (dest.image_url) return dest.image_url;
  const cat = dest.category?.[0] || dest.difficulty_level || 'default';
  return FALLBACK_IMAGES[cat] || FALLBACK_IMAGES.default;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [destinations, setDestinations] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lodgeCount, setLodgeCount] = useState<number>(0);
  const [guideCount, setGuideCount] = useState<number>(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  function toggleSave(id: string, name: string) {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        Alert.alert('Removed', `${name} removed from your wishlist.`);
      } else {
        next.add(id);
        Alert.alert('Saved! 🔖', `${name} added to your wishlist.`);
      }
      return next;
    });
  }

  async function loadData() {
    setRefreshing(true);

    
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, district, cover_image_url, category, difficulty_level, estimated_cost_npr, is_featured, description')
      .eq('is_active', true)
      .limit(12);

    if (!error && data) {
      const featuredDest = data.find((d: any) => d.is_featured) || data[0];
      setFeatured(featuredDest);
      setDestinations(data.filter((d: any) => d.id !== featuredDest?.id));
    }

    
    const { count: gCount } = await (supabase.from('guide_profiles') as any)
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', true);
    if (gCount) setGuideCount(gCount);

    
    try {
      const { count: lCount, error: lErr } = await (supabase.from('stays') as any)
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      if (!lErr && lCount !== null) setLodgeCount(lCount);
      else {
        const { count: dCount } = await supabase
          .from('destinations')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);
        if (dCount !== null) setLodgeCount(dCount);
      }
    } catch {
      const { count: dCount } = await supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      if (dCount !== null) setLodgeCount(dCount);
    }

    
    try {
      const key = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;
      const url = key
        ? `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
        : 'https://open.er-api.com/v6/latest/USD';
      const res = await fetch(url);
      const json = await res.json();
      const npr = json?.conversion_rates?.NPR ?? json?.rates?.NPR;
      if (npr) {
        setFxRate(Number(npr));
        setLastUpdated(new Date().toLocaleDateString());
      }
    } catch {
      
    }

    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, []);

  return (
    <View className="flex-1 bg-surface dark:bg-gray-900">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          showTripNow
          onTripNow={() => router.push('/(tourist)/ai-plan' as any)}
        />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#8B1A1A" />}
      >
        <View className="px-5 pt-5">
          <Text className="font-sans text-sm text-on-surface-variant dark:text-gray-400 mb-1">Namaste,</Text>
          <Text className="font-displayBold text-[24px] text-on-surface dark:text-white mb-4">
            {profile?.full_name?.split(' ')[0] || 'Traveler'} 👋
          </Text>
        </View>

        {}
        {featured && (
          <View className="px-5 mb-5">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/destination/${featured.id}` as any)}
            >
              <Card noPadding className="w-full h-[200px] overflow-hidden">
                <ImageBackground
                  source={{ uri: getDestImage(featured) }}
                  className="w-full h-full justify-end p-4"
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(10,20,30,0.85)']}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <Text className="text-white/80 font-bodyBold text-[12px] uppercase tracking-wider mb-1" style={{ zIndex: 1 }}>FEATURED TREK</Text>
                  <Text className="text-white font-displayBold text-[24px]" numberOfLines={1} style={{ zIndex: 1 }}>{featured.name}</Text>
                  <Text className="text-white/80 font-body text-[13px] mt-1" numberOfLines={2} style={{ zIndex: 1 }}>
                    {featured.description || 'Experience the breathtaking beauty of the Himalayas.'}
                  </Text>
                </ImageBackground>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {}
        <View className="px-5 mb-8">
          <View className="flex-row">

            {}
            <TouchableOpacity
              activeOpacity={0.8}
              style={{ flex: 1, marginRight: 6 }}
              onPress={() => router.push('/converter' as any)}
            >
              <View style={{ backgroundColor: '#E6F4EA', borderRadius: 16, padding: 12, height: 110, justifyContent: 'space-between',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <DollarSign size={18} color="#8B1A1A" />
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 3 }} />
                    <Text style={{ color: '#8B1A1A', fontSize: 9, fontWeight: '700' }}>LIVE</Text>
                  </View>
                </View>
                <View>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: '#8B1A1A' }}>USD → NPR</Text>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: '#8B1A1A', marginTop: 2 }}>
                    {fxRate ? fxRate.toFixed(1) : '—'}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#717973', marginTop: 1 }}>Tap to convert</Text>
                </View>
              </View>
            </TouchableOpacity>

            {}
            <TouchableOpacity
              activeOpacity={0.8}
              style={{ flex: 1, marginRight: 6 }}
              onPress={() => router.push('/guides' as any)}
            >
              <View style={{ backgroundColor: '#FFF0ED', borderRadius: 16, padding: 12, height: 110, justifyContent: 'space-between',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                <Users size={18} color="#8B1A1A" />
                <View>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: '#8B1A1A' }}>Guides</Text>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: '#8B1A1A', marginTop: 2 }}>
                    {guideCount > 0 ? guideCount : '—'}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#717973', marginTop: 1 }}>Certified locals</Text>
                </View>
              </View>
            </TouchableOpacity>

            {}
            <TouchableOpacity
              activeOpacity={0.8}
              style={{ flex: 1 }}
              onPress={() => router.push('/stays' as any)}
            >
              <View style={{ backgroundColor: '#E1F0FF', borderRadius: 16, padding: 12, height: 110, justifyContent: 'space-between',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                <HomeIcon size={18} color="#0077B6" />
                <View>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: '#0077B6' }}>Lodges</Text>
                  <Text style={{ fontWeight: '800', fontSize: 20, color: '#0077B6', marginTop: 2 }}>{lodgeCount > 0 ? lodgeCount : '—'}</Text>
                  <Text style={{ fontSize: 9, color: '#717973', marginTop: 1 }}>Stays & rentals</Text>
                </View>
              </View>
            </TouchableOpacity>

          </View>
        </View>

        {}
        <View className="px-5 flex-row justify-between items-end mb-4">
          <Text className="font-displaySemiBold text-[20px] text-on-surface">Popular Destinations</Text>
          <TouchableOpacity onPress={() => router.push('/(tourist)/explore' as any)}>
            <Text className="font-bodySemibold text-[14px] text-primary">View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8" contentContainerStyle={{ paddingHorizontal: 20 }}>
          {destinations.length === 0 ? (
            <View style={{ width: 220, height: 200, backgroundColor: '#F3F4F6', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Loading...</Text>
            </View>
          ) : destinations.map(dest => (
            <TouchableOpacity
              key={dest.id}
              activeOpacity={0.85}
              style={{ marginRight: 14 }}
              onPress={() => router.push(`/destination/${dest.id}` as any)}
            >
              <View style={{ width: 200, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 }}>
                <View style={{ height: 130, position: 'relative' }}>
                  <ImageBackground
                    source={{ uri: getDestImage(dest) }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <View style={{ position: 'absolute', top: 8, right: 8 }}>
                      <RatingPill rating="4.8" />
                    </View>
                  </ImageBackground>
                </View>
                <View style={{ padding: 10 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: '#1A1C1E' }} numberOfLines={1}>{dest.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <MapPin size={11} color="#717973" />
                    <Text style={{ fontSize: 11, color: '#717973', marginLeft: 3 }} numberOfLines={1}>{dest.district || 'Nepal'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: '#8B1A1A' }}>
                      NPR {dest.estimated_cost_npr ? Number(dest.estimated_cost_npr).toLocaleString() : '15,000'}/day
                    </Text>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={(e) => { e.stopPropagation(); toggleSave(dest.id, dest.name); }}
                    >
                      {savedIds.has(dest.id)
                        ? <BookmarkCheck size={18} color="#8B1A1A" />
                        : <Bookmark size={18} color="#9CA3AF" />}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {}
        <View className="px-5 mb-8">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="font-displaySemiBold text-[20px] text-on-surface">For You</Text>
            <Text className="font-body text-[12px] text-on-surface-variant">Based on Nepal top picks</Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/guides' as any)}>
            <Card className="bg-[#FFE4D6] mb-3">
              <View className="flex-row">
                <View className="bg-white w-10 h-10 rounded-[8px] items-center justify-center mr-3">
                  <Trees size={20} color="#BC6C25" />
                </View>
                <View className="flex-1">
                  <Text className="font-displaySemiBold text-[16px] text-on-surface">Chitwan Safari</Text>
                  <Text className="font-body text-[13px] text-on-surface-variant mt-1">Jungle safari, elephant rides & wildlife.</Text>
                  <Text className="font-bodySemibold text-[13px] text-tertiary mt-2">Find Guides →</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tourist)/ai-plan' as any)}>
            <Card className="bg-[#DDF1E1]">
              <View className="flex-row">
                <View className="bg-white w-10 h-10 rounded-[8px] items-center justify-center mr-3">
                  <Landmark size={20} color="#8B1A1A" />
                </View>
                <View className="flex-1">
                  <Text className="font-displaySemiBold text-[16px] text-on-surface">Kathmandu Culture</Text>
                  <Text className="font-body text-[13px] text-on-surface-variant mt-1">Temples, heritage & local food tours.</Text>
                  <Text className="font-bodySemibold text-[13px] text-primary mt-2">Plan with AI →</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
