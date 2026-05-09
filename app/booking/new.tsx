import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
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
  const [pickup, setPickup] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Derived pricing
  const ratePerDay = guide?.price_per_day ?? 3500;
  const subtotal = parseInt(days || '0') * ratePerDay * travelers;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;

  useEffect(() => {
    if (!guideId) return;
    supabase
      .from('guide_profiles')
      .select('id, price_per_day, average_rating, total_reviews, languages_spoken, bio_long, profiles(full_name, avatar_url)')
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
    if (!startDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      Alert.alert('Invalid Date', 'Please enter the start date in YYYY-MM-DD format.');
      return;
    }
    if (!guideId) {
      Alert.alert('Error', 'No guide selected.');
      return;
    }

    setLoading(true);
    try {
      // Calculate end date
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + parseInt(days || '1') - 1);
      const endDateStr = end.toISOString().split('T')[0];

      // @ts-ignore - Supabase type inference for bookings table results in never
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
          daily_rate_npr: ratePerDay,
          subtotal_npr: subtotal,
          service_fee_npr: serviceFee,
          total_amount_npr: total,
          special_notes: notes.trim() || null,
          status: 'requested',
          payment_status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Navigate to payment screen
      router.push({
        pathname: '/booking/payment',
        params: {
          bookingId: booking.id,
          guideId,
          amount: total,
          travelers,
          days,
          pickup,
          notes,
          guideName: (guide?.profiles as any)?.full_name || 'Your Guide',
        }
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
        <Text className="font-display text-xl text-text">Book Guide</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Guide Info Card */}
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
              <View className="items-end">
                <Text className="font-display text-primary text-lg">रू {guide.price_per_day?.toLocaleString()}</Text>
                <Text className="text-text-secondary text-xs">per day</Text>
              </View>
            </View>
            {guide.languages_spoken?.length > 0 && (
              <Text className="text-text-muted text-xs">🌐 {guide.languages_spoken.join(', ')}</Text>
            )}
          </View>
        ) : null}

        {/* Duration */}
        <View className="mb-5">
          <Text className="font-semibold text-sm text-text mb-2">Duration (Days)</Text>
          <View className="flex-row items-center bg-white border border-border rounded-xl px-4">
            <Calendar size={18} color="#6B7280" />
            <TextInput
              value={days}
              onChangeText={setDays}
              keyboardType="numeric"
              className="flex-1 py-4 ml-3 text-base text-text"
              maxLength={2}
            />
          </View>
        </View>

        {/* Start Date */}
        <View className="mb-5">
          <Text className="font-semibold text-sm text-text mb-2">Start Date</Text>
          <View className="flex-row items-center bg-white border border-border rounded-xl px-4">
            <Calendar size={18} color="#6B7280" />
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              className="flex-1 py-4 ml-3 text-base text-text"
              keyboardType="numbers-and-punctuation"
            />
          </View>
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

        {/* Price breakdown */}
        <View className="bg-mint/20 border border-mint rounded-2xl p-5 mb-8">
          <Text className="font-semibold text-text mb-4">Price Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">रू {ratePerDay.toLocaleString()} × {days || 0} days × {travelers} pax</Text>
            <Text className="text-text font-medium text-sm">रू {subtotal.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-text-secondary text-sm">Platform fee (5%)</Text>
            <Text className="text-text font-medium text-sm">रू {serviceFee.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between border-t border-mint/50 pt-3">
            <Text className="font-bold text-text">Total</Text>
            <Text className="font-display text-primary text-xl">रू {total.toLocaleString()}</Text>
          </View>
        </View>

      </ScrollView>

      <View className="p-6 bg-white border-t border-border">
        <Button onPress={handleContinue} loading={loading} fullWidth size="lg">
          Continue to Payment
        </Button>
      </View>
    </SafeScreen>
  );
}
