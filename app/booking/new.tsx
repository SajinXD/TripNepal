import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { Calendar, Users, MapPin, ChevronLeft, Star } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function NewBookingScreen() {
  const { guideId } = useLocalSearchParams<{ guideId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [guide, setGuide] = useState<any>(null);
  const [loadingGuide, setLoadingGuide] = useState(true);

  const [days, setDays] = useState('3');
  const [travelers, setTravelers] = useState(2);
  const [startDate, setStartDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickup, setPickup] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const areaMap: Record<string, number> = guide?.area_prices ?? {};
  const guideAreas: string[] = guide?.service_areas ?? [];
  const showAreaPicker = guideAreas.length > 0;

  
  const baseRatePerDay = selectedAreas.reduce((sum, a) => sum + (areaMap[a] ?? 0), 0);
  const subtotal = parseInt(days || '0') * baseRatePerDay;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;

  useEffect(() => {
    if (!guideId) return;
    supabase
      .from('guide_profiles')
      .select('id, area_prices, service_areas, average_rating, total_reviews, languages_spoken, bio_long, profiles(full_name, avatar_url)')
      .eq('id', guideId)
      .single()
      .then(({ data }) => {
        setGuide(data);
        setLoadingGuide(false);
      });
  }, [guideId]);

  async function handleContinue() {
    if (!user) return;
    if (!pickup.trim()) {
      Alert.alert('Missing Info', 'Please enter a pickup location.');
      return;
    }
    if (!startDate) {
      Alert.alert('Missing Date', 'Please select a start date.');
      return;
    }
    if (!guideId) {
      Alert.alert('Error', 'No guide selected.');
      return;
    }
    if (showAreaPicker && selectedAreas.length === 0) {
      Alert.alert('Select Area', 'Please select at least one service area to continue.');
      return;
    }

    setLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + parseInt(days || '1') - 1);
      const endDateStr = end.toISOString().split('T')[0];

      
      const { data: booking, error } = await (supabase
        .from('bookings') as any)
        .insert({
          tourist_id: user.id,
          guide_id: guideId,
          start_date: startDate,
          end_date: endDateStr,
          pickup_location: pickup.trim(),
          travelers_count: travelers,
          total_days: parseInt(days || '1'),
          daily_rate_npr: baseRatePerDay,
          subtotal_npr: subtotal,
          service_fee_npr: serviceFee,
          total_amount_npr: total,
          special_notes: notes.trim() || null,
          selected_areas: selectedAreas.length ? selectedAreas : undefined,
          status: 'requested',
          payment_status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      router.replace({
        pathname: '/booking/confirm',
        params: { bookingId: booking.id },
      });
    } catch (err: any) {
      console.error('Booking error:', err);
      Alert.alert('Booking Failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen edges={['top', 'bottom']} bg="#F7F7F4">
      <View className="px-6 py-4 flex-row items-center border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <ChevronLeft size={24} color="#0A0A0A" />
        </TouchableOpacity>
        <Text className="font-display text-xl text-text">Send Request</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {}
          {loadingGuide ? (
            <View className="bg-white border border-border rounded-2xl p-5 mb-6 items-center">
              <ActivityIndicator color="#8B1A1A" />
            </View>
          ) : guide ? (
            <View className="bg-white border border-border rounded-2xl p-5 mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mr-4">
                  <Text className="font-bold text-primary text-lg">
                    {((guide?.profiles as any)?.full_name || 'G')[0].toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-text text-base">{(guide?.profiles as any)?.full_name || 'Guide'}</Text>
                  <View className="flex-row items-center mt-1">
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text className="text-text-secondary text-xs ml-1">{guide.average_rating?.toFixed(1) || '0.0'} · {guide.total_reviews || 0} reviews</Text>
                  </View>
                </View>
              </View>
              {guide.languages_spoken?.length > 0 && (
                <Text className="text-text-muted text-xs">🌐 {guide.languages_spoken.join(', ')}</Text>
              )}
            </View>
          ) : null}

          {}
          {!loadingGuide && showAreaPicker && (guide?.service_areas ?? []).length > 0 && (
            <View className="mb-5">
              <Text className="font-semibold text-sm text-text mb-2">
                Select Areas <Text className="font-normal text-text-muted">(tap all you'll visit)</Text>
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(guide.service_areas as string[]).map(area => {
                  const price = areaMap[area];
                  const active = selectedAreas.includes(area);
                  return (
                    <TouchableOpacity
                      key={area}
                      onPress={() => setSelectedAreas(prev =>
                        prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                      )}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? '#8B1A1A' : '#E5E7EB',
                        backgroundColor: active ? '#8B1A1A' : '#fff',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : '#0A0A0A' }}>{area}</Text>
                      {price ? (
                        <Text style={{ fontSize: 10, marginTop: 2, color: active ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>
                          रू {price.toLocaleString()}/day
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Start Date — calendar picker */}
          <View className="mb-5">
            <Text className="font-semibold text-sm text-text mb-2">Start Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center bg-white border border-border rounded-xl px-4 py-4"
            >
              <Calendar size={18} color="#6B7280" />
              <Text className={`flex-1 ml-3 text-base ${startDate ? 'text-text' : 'text-[#9CA3AF]'}`}>
                {startDate || 'Select start date'}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={startDate ? new Date(startDate) : new Date()}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  setShowDatePicker(false);
                  if (date) setStartDate(date.toISOString().split('T')[0]);
                }}
              />
            )}
          </View>

          {/* Travelers */}
          <View className="mb-5">
            <Text className="font-semibold text-sm text-text mb-2">Number of Travelers</Text>
            <View className="flex-row items-center bg-white border border-border rounded-xl px-4 py-3">
              <Users size={18} color="#6B7280" />
              <Text className="flex-1 ml-3 text-base text-text">{travelers} {travelers === 1 ? 'Traveler' : 'Travelers'}</Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() => setTravelers(Math.max(1, travelers - 1))}
                  className="bg-border w-9 h-9 rounded-full items-center justify-center"
                >
                  <Text className="text-primary font-bold text-lg">−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTravelers(Math.min(20, travelers + 1))}
                  className="bg-primary w-9 h-9 rounded-full items-center justify-center"
                >
                  <Text className="text-white font-bold text-lg">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Pickup */}
          <View className="mb-5">
            <Text className="font-semibold text-sm text-text mb-2">Pickup Location</Text>
            <View className="flex-row items-center bg-white border border-border rounded-xl px-4">
              <MapPin size={18} color="#6B7280" />
              <TextInput
                value={pickup}
                onChangeText={setPickup}
                placeholder="e.g. Kathmandu Marriott Hotel"
                placeholderTextColor="#9CA3AF"
                className="flex-1 py-4 ml-3 text-base text-text"
              />
            </View>
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="font-semibold text-sm text-text mb-2">Special Requests (Optional)</Text>
            <View className="bg-white border border-border rounded-xl px-4 py-2">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Dietary restrictions, specific interests, pace preferences..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                className="text-base text-text"
                style={{ minHeight: 80 }}
              />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View className="p-6 bg-white border-t border-border">
        <Button onPress={handleContinue} loading={loading} fullWidth size="lg">
          Send Request
        </Button>
      </View>
    </SafeScreen>
  );
}