import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Ticket, MessageSquare } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BookingConfirmScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    // @ts-ignore
    (supabase.from('bookings') as any)
      .select('id, status, start_date, end_date, total_days, total_amount_npr, guide_id, tourist_id, guide_profiles(profiles(full_name))')
      .eq('id', bookingId)
      .single()
      .then(({ data }: any) => { setBooking(data); setLoading(false); });
  }, [bookingId]);

  async function handleMessageGuide() {
    if (!booking) return;
    setChatLoading(true);
    try {
      // Find existing direct thread for this tourist-guide pair
      const { data: existing } = await (supabase.from('chat_threads') as any)
        .select('id')
        .eq('tourist_id', booking.tourist_id)
        .eq('guide_id', booking.guide_id)
        .is('booking_id', null)
        .maybeSingle();

      if (existing) {
        router.push(`/chat/${existing.id}` as any);
        return;
      }

      // Create a new direct thread
      const { data: newThread, error } = await (supabase.from('chat_threads') as any)
        .insert({ tourist_id: booking.tourist_id, guide_id: booking.guide_id })
        .select('id')
        .single();

      if (error) throw error;
      if (newThread) router.push(`/chat/${newThread.id}` as any);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not open chat.');
    } finally {
      setChatLoading(false);
    }
  }

  const shortId = bookingId ? `TRP-${bookingId.slice(-6).toUpperCase()}` : 'TRP-XXXXX';
  const guideName = ((booking?.guide_profiles as any)?.profiles as any)?.full_name || 'Your Guide';

  return (
    <SafeScreen edges={['top', 'bottom']} bg="#F7F7F4">
      <View className="flex-1 items-center justify-center px-6">
        <View className="bg-white p-6 rounded-full mb-6 border-4 border-success/20">
          <CheckCircle2 size={48} color="#16A34A" />
        </View>

        <Text className="font-display text-3xl text-text text-center mb-3">Booking Requested!</Text>
        <Text className="font-sans text-base text-text-secondary text-center mb-8">
          Your booking request has been sent.{loading ? '' : ' ' + guideName + ' has'} been notified and has 24 hours to accept.
        </Text>

        {loading ? (
          <View className="bg-white rounded-2xl p-5 w-full border border-border shadow-sm mb-8 items-center">
            <ActivityIndicator color="#8B1A1A" />
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-5 w-full border border-border shadow-sm mb-8">
            <View className="flex-row items-center mb-4">
              <View className="bg-primary/10 p-3 rounded-xl mr-4">
                <Ticket size={24} color="#8B1A1A" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-text">Booking #{shortId}</Text>
                <Text className="text-text-secondary text-xs mt-0.5">Status: Pending Guide Approval</Text>
              </View>
            </View>
            {booking && (
              <>
                <View className="flex-row justify-between border-t border-border pt-3 mb-2">
                  <Text className="text-text-secondary text-sm">Guide</Text>
                  <Text className="font-medium text-text text-sm">{guideName}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-text-secondary text-sm">Dates</Text>
                  <Text className="font-medium text-text text-sm">{booking.start_date} → {booking.end_date}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-text-secondary text-sm">Total Amount</Text>
                  <Text className="font-display text-primary text-base">रू {booking.total_amount_npr?.toLocaleString()}</Text>
                </View>
              </>
            )}
          </View>
        )}

        <View className="flex-row w-full gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => router.replace('/(tourist)/home')}
          >
            Home
          </Button>
          <Button
            className="flex-1"
            onPress={handleMessageGuide}
            loading={chatLoading}
          >
            <View className="flex-row items-center">
              <MessageSquare size={16} color="#fff" />
              <Text className="text-white font-semibold ml-2">Message Guide</Text>
            </View>
          </Button>
        </View>
      </View>
    </SafeScreen>
  );
}
