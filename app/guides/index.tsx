import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { Search, MapPin, MessageSquare, Star, SlidersHorizontal, X } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';
import { Button } from '../../src/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';

type Guide = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio_guide: string | null;
  rating: number;
  review_count: number;
  total_trips: number;
  languages: string[];
  specializations: string[];
  operating_districts: string[];
  years_experience: number;
  is_licensed?: boolean;
};


const ALL_AREAS = [
  'Kathmandu', 'Pokhara', 'Chitwan', 'Bhaktapur', 'Patan (Lalitpur)',
  'Nagarkot', 'Dhulikhel', 'Bandipur', 'Solukhumbu (Everest)',
  'Kaski (Annapurna)', 'Mustang', 'Langtang', 'Manaslu', 'Kanchenjunga',
  'Dolpo', 'Poon Hill (Ghorepani)', 'Jomsom', 'Rara Lake', 'Bardiya',
  'Ilam', 'Lumbini', 'Gorkha', 'Tansen (Palpa)', 'Dharan', 'Biratnagar',
  'Butwal', 'Nepalgunj', 'Dhangadhi',
];

const ALL_SPECS = [
  'trekking', 'cultural', 'adventure', 'wildlife', 'spiritual',
  'photography', 'sightseeing', 'food', 'local', 'other',
];

export default function FindGuideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Filter modal state
  const [showFilter, setShowFilter] = useState(false);
  const [filterNegotiable, setFilterNegotiable] = useState(false);
  const [filterLocal, setFilterLocal] = useState(false);
  const [filterLicensed, setFilterLicensed] = useState(false);
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
  const [filterSpecs, setFilterSpecs] = useState<string[]>([]);

  const hasActiveFilter = filterNegotiable || filterLocal || filterLicensed || filterAreas.length > 0 || filterSpecs.length > 0;

  const loadGuides = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) { setLoading(true); setPage(0); }

    // @ts-ignore — search_guides RPC is not in generated types
    const { data, error } = await (supabase.rpc as any)('search_guides', {
      p_district: null,
      p_languages: null,
      p_max_price: null,
      p_categories: null,
      p_lat: null,
      p_lng: null,
      p_radius_km: 500,
    });

    if (!error && data) {
      let results: Guide[] = data;

      // Client-side name search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        results = results.filter(
          (g: Guide) =>
            g.full_name?.toLowerCase().includes(q) ||
            g.operating_districts?.some((d: string) => d.toLowerCase().includes(q)) ||
            g.specializations?.some((s: string) => s.toLowerCase().includes(q))
        );
      }

      // Area filter
      if (filterAreas.length) {
        results = results.filter(g =>
          filterAreas.some(a =>
            g.operating_districts?.some((d: string) => d.toLowerCase().includes(a.toLowerCase()))
          )
        );
      }

      // Specialization filter
      if (filterSpecs.length) {
        results = results.filter(g =>
          filterSpecs.some(s => g.specializations?.includes(s))
        );
      }

      // Local guide filter
      if (filterLocal) {
        results = results.filter(g => g.specializations?.includes('local'));
      }

      // Negotiable / Licensed — secondary query for guide_profiles flags
      if (filterNegotiable || filterLicensed) {
        let q = (supabase.from('guide_profiles') as any).select('id');
        if (filterNegotiable) q = q.eq('price_negotiable', true);
        if (filterLicensed) q = q.eq('is_verified', true);
        const { data: gpIds } = await q;
        const ids = new Set((gpIds ?? []).map((r: any) => r.id));
        results = results.filter(g => ids.has(g.id));
      }

      if (reset) {
        setGuides(results.slice(0, PAGE_SIZE));
      } else {
        setGuides(prev => [...prev, ...results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)]);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [search, page, filterNegotiable, filterLocal, filterLicensed, filterAreas, filterSpecs]);

  useEffect(() => {
    loadGuides(true);
  }, []);

  async function handleMessageGuide(guideId: string) {
    if (!user) return;
    try {
      const { data: threadId, error } = await (supabase.rpc as any)('find_or_create_chat_thread', {
        p_tourist_id: user.id,
        p_guide_id: guideId,
      });
      if (error) throw error;
      router.push(`/chat/${threadId}` as any);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not open chat.');
    }
  }

  const handleSearch = () => loadGuides(true);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadGuides(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGuides(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B1A1A" />}
      >
        {/* Search + Filter button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, height: 48 }}>
            <Search size={20} color="#717973" />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#1A1C1E', marginLeft: 10 }}
              placeholder="Search by name, region or specialty..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <Pressable
            onPress={() => setShowFilter(true)}
            style={{
              width: 48, height: 48,
              backgroundColor: hasActiveFilter ? '#8B1A1A' : '#fff',
              borderWidth: 1,
              borderColor: hasActiveFilter ? '#8B1A1A' : '#E5E7EB',
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={20} color={hasActiveFilter ? '#fff' : '#717973'} />
          </Pressable>
        </View>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <Text style={{ fontWeight: '700', fontSize: 22, color: '#1A1C1E' }}>Certified Guides</Text>
          {!loading && (
            <Text style={{ fontSize: 13, color: '#717973' }}>{guides.length} available</Text>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <ActivityIndicator size="large" color="#8B1A1A" />
            <Text style={{ color: '#717973', marginTop: 12, fontSize: 14 }}>Finding guides...</Text>
          </View>
        ) : guides.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏔️</Text>
            <Text style={{ fontWeight: '700', fontSize: 18, color: '#1A1C1E', marginBottom: 6 }}>No guides found</Text>
            <Text style={{ fontSize: 14, color: '#717973', textAlign: 'center' }}>
              Try a different filter or check back soon — guides are joining every day!
            </Text>
          </View>
        ) : (
          guides.map(guide => (
            <TouchableOpacity key={guide.id} activeOpacity={0.9} onPress={() => router.push(`/guides/${guide.id}` as any)}>
            <Card className="mb-4">
              {/* Header row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', flex: 1 }}>
                  <View style={{ marginRight: 12 }}>
                    <Avatar
                      src={guide.avatar_url || undefined}
                      size={52}
                      status="online"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontWeight: '700', fontSize: 17, color: '#1A1C1E' }}>{guide.full_name}</Text>
                      {guide.is_licensed && (
                        <View style={{ backgroundColor: '#D1FAE5', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#065F46', letterSpacing: 0.5 }}>NTB LICENSED</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      <Star size={13} color="#F4A261" fill="#F4A261" />
                      <Text style={{ fontSize: 13, color: '#1A1C1E', fontWeight: '600', marginLeft: 3 }}>
                        {guide.rating ? Number(guide.rating).toFixed(1) : 'New'}
                      </Text>
                      {guide.review_count > 0 && (
                        <Text style={{ fontSize: 12, color: '#717973', marginLeft: 4 }}>({guide.review_count} reviews)</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Specialization tags */}
              {guide.specializations?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                  {guide.specializations.slice(0, 3).map(s => (
                    <View key={s} style={{ backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#414844', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.replace('_', ' ')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Bio */}
              {guide.bio_guide ? (
                <Text style={{ fontSize: 13, color: '#717973', lineHeight: 19, marginBottom: 12 }} numberOfLines={2}>
                  {guide.bio_guide}
                </Text>
              ) : (
                <Text style={{ fontSize: 13, color: '#717973', lineHeight: 19, marginBottom: 12 }}>
                  {guide.years_experience ? `${guide.years_experience} years of experience` : 'Certified Nepal guide'} · {guide.total_trips || 0} trips completed
                </Text>
              )}

              {/* Districts */}
              {guide.operating_districts?.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <MapPin size={12} color="#717973" />
                  <Text style={{ fontSize: 12, color: '#717973', marginLeft: 4 }}>
                    {guide.operating_districts.slice(0, 3).join(', ')}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={{ flexDirection: 'row' }}>
                <Button
                  variant="primary"
                  className="flex-1 mr-2 h-[44px]"
                  onPress={() => { router.push(`/booking/new?guideId=${guide.id}` as any); }}
                >
                  Book Now
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 ml-2 h-[44px]"
                  leftIcon={<MessageSquare size={16} color="#0077B6" />}
                  onPress={() => handleMessageGuide(guide.id)}
                >
                  Message
                </Button>
              </View>
            </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Load more */}
        {!loading && guides.length >= PAGE_SIZE && (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Button variant="secondary" onPress={handleLoadMore} className="w-[200px]">
              Load More Guides
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowFilter(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontWeight: '700', fontSize: 18, color: '#1A1C1E' }}>Filter Guides</Text>
            <Pressable onPress={() => setShowFilter(false)}>
              <X size={22} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Section 1: Guide Type */}
            <Text style={{ fontWeight: '700', fontSize: 12, color: '#717973', letterSpacing: 1, marginBottom: 10 }}>GUIDE TYPE</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {[
                { label: 'Negotiable', state: filterNegotiable, set: setFilterNegotiable },
                { label: 'Local',      state: filterLocal,      set: setFilterLocal },
                { label: 'Licensed',   state: filterLicensed,   set: setFilterLicensed },
              ].map(({ label, state, set }) => (
                <Pressable
                  key={label}
                  onPress={() => set(!state)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: state ? '#8B1A1A' : '#F3F4F6',
                    borderWidth: 1, borderColor: state ? '#8B1A1A' : '#E5E7EB',
                  }}
                >
                  <Text style={{ color: state ? '#fff' : '#1A1C1E', fontWeight: '600', fontSize: 13 }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Section 2: Areas */}
            <Text style={{ fontWeight: '700', fontSize: 12, color: '#717973', letterSpacing: 1, marginBottom: 10 }}>AREAS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ALL_AREAS.map(area => {
                const active = filterAreas.includes(area);
                return (
                  <Pressable
                    key={area}
                    onPress={() => setFilterAreas(prev => active ? prev.filter(a => a !== area) : [...prev, area])}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: active ? '#0077B6' : '#F3F4F6',
                      borderWidth: 1, borderColor: active ? '#0077B6' : '#E5E7EB',
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : '#1A1C1E', fontSize: 12, fontWeight: '600' }}>{area}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Section 3: Specialization */}
            <Text style={{ fontWeight: '700', fontSize: 12, color: '#717973', letterSpacing: 1, marginBottom: 10 }}>SPECIALIZATION</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {ALL_SPECS.map(spec => {
                const active = filterSpecs.includes(spec);
                return (
                  <Pressable
                    key={spec}
                    onPress={() => setFilterSpecs(prev => active ? prev.filter(s => s !== spec) : [...prev, spec])}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: active ? '#8B1A1A' : '#F3F4F6',
                      borderWidth: 1, borderColor: active ? '#8B1A1A' : '#E5E7EB',
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : '#1A1C1E', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                      {spec.replace('_', ' ')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Clear + Apply */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => {
                  setFilterNegotiable(false);
                  setFilterLocal(false);
                  setFilterLicensed(false);
                  setFilterAreas([]);
                  setFilterSpecs([]);
                }}
                style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontWeight: '600', color: '#1A1C1E' }}>Clear All</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowFilter(false); loadGuides(true); }}
                style={{ flex: 2, height: 48, borderRadius: 12, backgroundColor: '#8B1A1A', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>Apply Filters</Text>
              </Pressable>
            </View>

          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}