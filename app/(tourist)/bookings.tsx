import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Avatar } from '../../src/components/ui/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { Calendar, MapPin, ChevronRight, Clock, CheckCircle, XCircle, Loader, Star, Users } from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  requested:    { label: 'Pending',     color: '#D97706', bg: '#FEF3C7', Icon: Clock },
  accepted:     { label: 'Accepted',    color: '#059669', bg: '#D1FAE5', Icon: CheckCircle },
  rejected:     { label: 'Declined',    color: '#DC2626', bg: '#FEE2E2', Icon: XCircle },
  in_progress:  { label: 'In Progress', color: '#2563EB', bg: '#DBEAFE', Icon: Loader },
  completed:    { label: 'Completed',   color: '#8B1A1A', bg: '#D1FAE5', Icon: Star },
  cancelled:    { label: 'Cancelled',   color: '#6B7280', bg: '#F3F4F6', Icon: XCircle },
};

const FILTER_TABS = ['All', 'Pending', 'Upcoming', 'Completed'];

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    // @ts-ignore
    const { data } = await (supabase.from('bookings') as any)
      .select('*, guide_profiles(profiles(full_name, avatar_url))')
      .eq('tourist_id', user.id)
      .order('created_at', { ascending: false });
    setBookings(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const filtered = bookings.filter(b => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return b.status === 'requested';
    if (activeTab === 'Upcoming') return ['accepted', 'in_progress'].includes(b.status);
    if (activeTab === 'Completed') return ['completed', 'cancelled', 'rejected'].includes(b.status);
    return true;
  });

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

  async function handleMarkComplete(booking: any) {
    const guideName = (booking.guide_profiles?.profiles as any)?.full_name || 'your guide';
    Alert.alert(
      'Mark Trip as Completed?',
      `Confirm that you have completed your trip with ${guideName}. This will update their performance record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            try {
              const { error } = await (supabase.from('bookings') as any)
                .update({ status: 'completed' })
                .eq('id', booking.id);
              if (error) throw error;
              // DB trigger handle_booking_completed auto-increments guide's trip counter
              await loadBookings();
              setReviewBooking(booking);
              setReviewRating(5);
              setReviewText('');
              setReviewModalVisible(true);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not update trip status.');
            }
          },
        },
      ]
    );
  }

  async function submitReview() {
    if (!user || !reviewBooking) return;
    setReviewSubmitting(true);
    try {
      const { error } = await (supabase.from('reviews') as any).insert({
        reviewer_id: user.id,
        reviewee_id: reviewBooking.guide_id,
        rating: reviewRating,
        comment: reviewText.trim() || null,
        booking_id: reviewBooking.id,
        is_guide_review: true,
      });
      if (error) {
        Alert.alert('Could not save review', error.message);
      } else {
        setReviewModalVisible(false);
        Alert.alert('Thank you!', 'Your review has been submitted and will appear on the guide\'s profile.');
      }
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-surface dark:bg-gray-900">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>

      <View className="px-5 pt-5 pb-2">
        <Text className="font-displayBold text-[24px] text-on-surface mb-4">My Bookings</Text>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
          {FILTER_TABS.map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`mr-2 px-4 py-2 rounded-full border ${activeTab === tab ? 'bg-primary border-primary' : 'bg-white border-outline-variant'}`}
            >
              <Text className={`font-bodySemibold text-[13px] ${activeTab === tab ? 'text-white' : 'text-on-surface-variant'}`}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8B1A1A" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBookings(); }} tintColor="#8B1A1A" />}
        >
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-[48px] mb-4">🏔️</Text>
              <Text className="font-displaySemiBold text-[18px] text-on-surface mb-2">No bookings yet</Text>
              <Text className="font-body text-[14px] text-on-surface-variant text-center px-8">
                {activeTab === 'All'
                  ? 'Start exploring guides and book your first Nepal adventure!'
                  : `No ${activeTab.toLowerCase()} bookings found.`}
              </Text>
            </View>
          ) : (
            filtered.map(booking => {
              const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.requested;
              const StatusIcon = cfg.Icon;
              const guideName = (booking.guide_profiles?.profiles as any)?.full_name || 'Guide';
              const guideAvatarUrl = (booking.guide_profiles?.profiles as any)?.avatar_url || undefined;

              return (
                <View
                  key={booking.id}
                  className="bg-white rounded-[16px] border border-outline-variant mb-4 overflow-hidden"
                  style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 }}
                >
                  {/* Tappable area — navigates to booking detail */}
                  <Pressable onPress={() => router.push(`/booking/${booking.id}` as any)}>
                    {/* Status bar */}
                    <View style={{ backgroundColor: cfg.bg }} className="px-4 py-2 flex-row items-center">
                      <StatusIcon size={13} color={cfg.color} />
                      <Text style={{ color: cfg.color }} className="font-bodyBold text-[11px] uppercase tracking-wider ml-1.5">
                        {cfg.label}
                      </Text>
                      <Text className="font-body text-[11px] text-on-surface-variant ml-auto">
                        #{booking.id.slice(-6).toUpperCase()}
                      </Text>
                    </View>

                    {/* Guide info + trip info */}
                    <View className="px-4 pt-4 pb-3">
                      <View className="flex-row items-center mb-3">
                        <Avatar src={guideAvatarUrl} size={44} />
                        <View className="flex-1 ml-3">
                          <Text className="font-displaySemiBold text-[16px] text-on-surface">{guideName}</Text>
                          <Text className="font-body text-[12px] text-on-surface-variant">Licensed Mountain Guide</Text>
                        </View>
                        <ChevronRight size={18} color="#717973" />
                      </View>

                      <View className="bg-surface rounded-[10px] p-3 gap-2">
                        <View className="flex-row items-center">
                          <Calendar size={13} color="#717973" />
                          <Text className="font-body text-[13px] text-on-surface-variant ml-2">
                            {booking.start_date} → {booking.end_date}
                            <Text className="text-on-surface"> · {booking.total_days} days</Text>
                          </Text>
                        </View>
                        {booking.pickup_location && (
                          <View className="flex-row items-center">
                            <MapPin size={13} color="#717973" />
                            <Text className="font-body text-[13px] text-on-surface-variant ml-2" numberOfLines={1}>
                              {booking.pickup_location}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>

                  {/* Footer — outside nav Pressable so action buttons work on web */}
                  <View className="flex-row items-center justify-between px-4 pb-4 pt-3 border-t border-outline-variant">
                    <View>
                      <Text className="font-body text-[11px] text-on-surface-variant">Total Amount</Text>
                      <Text className="font-displaySemiBold text-[18px] text-primary">
                        रू {booking.total_amount_npr?.toLocaleString() || '—'}
                      </Text>
                    </View>

                    <View className="flex-row gap-2 items-center">
                      {/* Message Guide — always available for direct chat */}
                      <Pressable
                        onPress={() => handleMessageGuide(booking.guide_id)}
                        className="bg-primary px-3 py-2 rounded-full flex-row items-center"
                      >
                        <Text className="text-white font-bodySemibold text-[12px]">Message</Text>
                      </Pressable>

                      {booking.status === 'requested' && (
                        <View className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                          <Text className="font-bodySemibold text-[12px] text-amber-700">Awaiting</Text>
                        </View>
                      )}
                      {booking.status === 'accepted' && (
                        <Pressable
                          onPress={() => handleMarkComplete(booking)}
                          className="bg-green-50 border border-green-300 px-3 py-2 rounded-full"
                        >
                          <Text className="font-bodySemibold text-[12px] text-green-700">Trip Done</Text>
                        </Pressable>
                      )}
                      {booking.status === 'completed' && (
                        <Pressable
                          onPress={() => {
                            setReviewBooking(booking);
                            setReviewRating(5);
                            setReviewText('');
                            setReviewModalVisible(true);
                          }}
                          className="bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full"
                        >
                          <Text className="font-bodySemibold text-[12px] text-primary">Review</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Always-visible Find a Guide button */}
          <Pressable
            onPress={() => router.push('/guides' as any)}
            className="mt-2 mb-6 bg-white border border-outline-variant rounded-[16px] py-4 items-center flex-row justify-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 }}
          >
            <Users size={18} color="#8B1A1A" />
            <Text className="font-bodySemibold text-[14px] text-primary ml-2">Find a Guide</Text>
          </Pressable>

          <View className="h-6" />
        </ScrollView>
      )}

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="slide" onRequestClose={() => setReviewModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={reviewStyles.overlay} onPress={() => setReviewModalVisible(false)} />
        <View style={reviewStyles.sheet}>
          <Text style={reviewStyles.title}>
            Rate {(reviewBooking?.guide_profiles?.profiles as any)?.full_name?.split(' ')[0] || 'your guide'}
          </Text>
          <Text style={reviewStyles.subtitle}>Trip completed! Share your experience.</Text>

          {/* Stars */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 16 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setReviewRating(n)} style={{ padding: 6 }}>
                <Star size={34} color="#F4A261" fill={n <= reviewRating ? '#F4A261' : 'none'} />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Share your experience (optional)..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            style={reviewStyles.input}
          />

          <TouchableOpacity
            onPress={submitReview}
            disabled={reviewSubmitting}
            style={[reviewStyles.submitBtn, reviewSubmitting && { opacity: 0.6 }]}
            activeOpacity={0.8}
          >
            {reviewSubmitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={reviewStyles.submitText}>Submit Review</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  title: { fontWeight: '700', fontSize: 20, color: '#1A1C1E', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#717973', textAlign: 'center', marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1A1C1E', minHeight: 100,
    textAlignVertical: 'top', marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#8B1A1A', borderRadius: 12, alignItems: 'center', paddingVertical: 14,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
