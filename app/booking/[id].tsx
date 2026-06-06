import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Calendar, MapPin, Users, Star, MessageSquare, Shield } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  requested:   { label: 'Pending Approval', color: '#D97706', bg: '#FEF3C7' },
  accepted:    { label: 'Accepted',         color: '#059669', bg: '#D1FAE5' },
  rejected:    { label: 'Declined',         color: '#DC2626', bg: '#FEE2E2' },
  in_progress: { label: 'In Progress',      color: '#2563EB', bg: '#DBEAFE' },
  completed:   { label: 'Completed',        color: '#8B1A1A', bg: '#D1FAE5' },
  cancelled:   { label: 'Cancelled',        color: '#6B7280', bg: '#F3F4F6' },
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    (supabase.from('bookings') as any)
      .select('*, tourist:profiles!tourist_id(full_name, phone), guide:guide_profiles!guide_id(profiles!id(full_name))')
      .eq('id', id)
      .single()
      .then(({ data }: any) => { setBooking(data); setLoading(false); });
  }, [id]);

  const isGuide = booking?.guide_id === user?.id;

  async function handleGuideAction(action: 'accepted' | 'rejected') {
    const prevBooking = { ...booking };
    setBooking((p: any) => ({ ...p, status: action }));
    setActionLoading(true);
    
    try {
      
      await (supabase.from('bookings') as any)
        .update({ status: action, responded_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (action === 'accepted') {
        
        await (supabase.from('chat_threads') as any).upsert(
          { tourist_id: booking.tourist_id, guide_id: booking.guide_id },
          { onConflict: 'tourist_id,guide_id', ignoreDuplicates: true }
        );
      }
      
      Alert.alert(action === 'accepted' ? '🎉 Accepted!' : 'Declined', action === 'accepted' ? 'Chat thread opened for the tourist.' : 'Tourist has been notified.');
    } catch (e: any) { 
      setBooking(prevBooking);
      Alert.alert('Error', e.message); 
    }
    setActionLoading(false);
  }

  async function openChat() {
    
    const { data } = await (supabase.from('chat_threads') as any)
      .select('id')
      .eq('tourist_id', booking.tourist_id)
      .eq('guide_id', booking.guide_id)
      .maybeSingle();
    if (data) router.push(`/chat/${data.id}` as any);
    else Alert.alert('Chat unavailable', 'Available after the guide accepts.');
  }

  if (loading) return <SafeScreen edges={['top', 'bottom']}><View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#8B1A1A" /></View></SafeScreen>;

  if (!booking) return <SafeScreen edges={['top', 'bottom']}><View className="flex-1 items-center justify-center px-6"><Text className="font-display text-xl text-text mb-4">Not found</Text><Button onPress={() => router.back()}>Go Back</Button></View></SafeScreen>;

  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.requested;
  const tourist = booking.tourist as any;
  const guideName = (booking.guide?.profiles as any)?.full_name || 'Guide';
  const touristName = tourist?.full_name || 'Tourist';
  const shortId = `TRP-${booking.id.slice(-6).toUpperCase()}`;

  return (
    <SafeScreen edges={['top', 'bottom']} bg="#F7F7F4">
      <View className="px-6 py-4 flex-row items-center border-b border-border bg-white">
        <Pressable onPress={() => router.back()} className="p-1 mr-3"><ChevronLeft size={24} color="#0A0A0A" /></Pressable>
        <Text className="font-display text-lg text-text flex-1">Booking {shortId}</Text>
        <View style={{ backgroundColor: cfg.bg }} className="px-3 py-1 rounded-full">
          <Text style={{ color: cfg.color }} className="font-bodyBold text-[11px]">{cfg.label}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-5" showsVerticalScrollIndicator={false}>
        {}
        <View className="bg-white rounded-2xl border border-border p-5 mb-4">
          <Text className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-3">{isGuide ? 'Tourist' : 'Your Guide'}</Text>
          <View className="flex-row items-center">
            <View className="w-14 h-14 bg-primary/10 rounded-full items-center justify-center mr-4">
              <Text className="font-bold text-primary text-xl">{(isGuide ? touristName : guideName)[0].toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-text text-lg">{isGuide ? touristName : guideName}</Text>
              {isGuide && tourist?.phone && <Text className="text-text-secondary text-sm mt-1">📞 {tourist.phone}</Text>}
              {!isGuide && <View className="flex-row items-center mt-1"><Star size={13} color="#F59E0B" fill="#F59E0B" /><Text className="text-text-secondary text-xs ml-1">Licensed Mountain Guide</Text></View>}
            </View>
          </View>
        </View>

        {}
        <View className="bg-white rounded-2xl border border-border p-5 mb-4">
          <Text className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-4">Trip Details</Text>
          <View className="gap-3">
            {!isGuide && (
              <View className="flex-row items-start">
                <Calendar size={16} color="#8B1A1A" />
                <View className="ml-3"><Text className="font-semibold text-text text-sm">Dates</Text><Text className="text-text-secondary text-sm">{booking.start_date} → {booking.end_date} · {booking.total_days} days</Text></View>
              </View>
            )}
            {booking.pickup_location && (
              <View className="flex-row items-start">
                <MapPin size={16} color="#8B1A1A" />
                <View className="ml-3"><Text className="font-semibold text-text text-sm">Pickup</Text><Text className="text-text-secondary text-sm">{booking.pickup_location}</Text></View>
              </View>
            )}
            <View className="flex-row items-start">
              <Users size={16} color="#8B1A1A" />
              <View className="ml-3"><Text className="font-semibold text-text text-sm">Travelers</Text><Text className="text-text-secondary text-sm">{booking.travelers_count} person{booking.travelers_count > 1 ? 's' : ''}</Text></View>
            </View>
            {booking.selected_areas?.length > 0 && (
              <View className="flex-row items-start">
                <MapPin size={16} color="#8B1A1A" />
                <View className="ml-3">
                  <Text className="font-semibold text-text text-sm">Areas</Text>
                  <Text className="text-text-secondary text-sm">{booking.selected_areas.join(', ')}</Text>
                </View>
              </View>
            )}
            {booking.special_notes && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-1">
                <Text className="font-semibold text-amber-800 text-xs mb-1">Special Notes</Text>
                <Text className="text-amber-700 text-sm">{booking.special_notes}</Text>
              </View>
            )}
          </View>
        </View>

        {}
        {!isGuide && (
          <View className="bg-white rounded-2xl border border-border p-5 mb-8">
            <Text className="font-semibold text-text-secondary text-xs uppercase tracking-wider mb-4">Payment</Text>
            <View className="gap-2">
              <View className="flex-row justify-between"><Text className="text-text-secondary text-sm">Subtotal</Text><Text className="text-text text-sm">रू {booking.subtotal_npr?.toLocaleString() || '—'}</Text></View>
              <View className="flex-row justify-between"><Text className="text-text-secondary text-sm">Platform Fee (5%)</Text><Text className="text-text text-sm">रू {booking.service_fee_npr?.toLocaleString() || '—'}</Text></View>
              <View className="flex-row justify-between border-t border-border pt-2 mt-1"><Text className="font-bold text-text">Total</Text><Text className="font-display text-primary text-lg">रू {booking.total_amount_npr?.toLocaleString() || '—'}</Text></View>
              <View className="flex-row items-center mt-2">
                <Shield size={13} color="#059669" />
                <Text className="text-text-secondary text-xs ml-2">Status: <Text className="font-semibold capitalize">{booking.payment_status?.replace('_', ' ') || 'pending'}</Text>{booking.payment_method && ` · ${booking.payment_method}`}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="px-6 py-5 bg-white border-t border-border gap-3">
        {isGuide && booking.status === 'requested' && (
          <View className="flex-row gap-3">
            <Button variant="outline" className="flex-1 border-red-300" textClassName="text-red-600"
              onPress={() => Alert.alert('Decline', 'Decline this booking?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Decline', style: 'destructive', onPress: () => handleGuideAction('rejected') }])}
              loading={actionLoading}>Decline</Button>
            <Button className="flex-1" onPress={() => handleGuideAction('accepted')} loading={actionLoading}>Accept</Button>
          </View>
        )}
        {['accepted', 'in_progress'].includes(booking.status) && (
          <Button fullWidth onPress={openChat}>
            <View className="flex-row items-center"><MessageSquare size={16} color="#fff" /><Text className="text-white font-semibold ml-2">Open Chat</Text></View>
          </Button>
        )}
        {!isGuide && booking.status === 'requested' && (
          <Button variant="outline" fullWidth textClassName="text-red-600" className="border-red-300"
            onPress={() => Alert.alert('Cancel', 'Cancel this booking?', [{ text: 'Keep', style: 'cancel' }, {
              text: 'Cancel', style: 'destructive', onPress: async () => {
                const prevBooking = { ...booking };
                setBooking((p: any) => ({ ...p, status: 'cancelled' }));
                setActionLoading(true);
                try {
                  
                  const { error } = await (supabase.from('bookings') as any).update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', booking.id);
                  if (error) throw error;
                } catch (e: any) {
                  setBooking(prevBooking);
                  Alert.alert('Error', e.message);
                }
                setActionLoading(false);
              }
            }])} loading={actionLoading}>Cancel Booking</Button>
        )}
      </View>
    </SafeScreen>
  );
}
