import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Star, CalendarDays, ChevronRight, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/lib/supabase';

type Booking = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_days: number;
  travelers_count: number;
  total_amount_npr: number;
  trip_category: string;
  district: string;
  tourist: { full_name: string; avatar_url: string | null } | null;
};

export default function GuideDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [gpRes, pendingRes, weekRes] = await Promise.all([
        (supabase.from('guide_profiles') as any)
          .select('average_rating, total_reviews, total_trips_completed')
          .eq('id', user.id)
          .single(),
        (supabase.from('bookings') as any)
          .select('id', { count: 'exact', head: true })
          .eq('guide_id', user.id)
          .eq('status', 'requested'),
        (supabase.from('bookings') as any)
          .select('total_amount_npr')
          .eq('guide_id', user.id)
          .eq('status', 'completed')
          .gte('updated_at', sevenDaysAgo),
      ]);
      const weekEarnings = (weekRes.data || []).reduce(
        (sum: number, b: any) => sum + (b.total_amount_npr || 0), 0
      );
      setStats({
        avg_rating: gpRes.data?.average_rating ?? null,
        total_reviews: gpRes.data?.total_reviews ?? 0,
        completed_trips: gpRes.data?.total_trips_completed ?? 0,
        pending_requests: pendingRes.count ?? 0,
        week_earnings_npr: weekEarnings,
      });
    } catch (e) {
      console.warn('Stats load error', e);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    // @ts-ignore
    const { data } = await (supabase.from('bookings') as any)
      .select('*, tourist:profiles!tourist_id(full_name, avatar_url)')
      .eq('guide_id', user.id)
      .in('status', ['requested', 'accepted', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(20);

    const all: Booking[] = data || [];
    setPendingBookings(all.filter(b => b.status === 'requested'));
    setActiveBookings(all.filter(b => ['accepted', 'in_progress'].includes(b.status)));
    setLoadingBookings(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    loadStats();
    loadBookings();
  }, [loadStats, loadBookings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadBookings()]);
    setRefreshing(false);
  }, [loadStats, loadBookings]);

  async function respondToBooking(bookingId: string, accept: boolean) {
    setRespondingId(bookingId);
    try {
      const newStatus = accept ? 'accepted' : 'rejected';
      // @ts-ignore
      const { error } = await (supabase.from('bookings') as any)
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      if (accept) {
        // Create chat thread so tourist can message guide
        // @ts-ignore
        await (supabase.from('chat_threads') as any).upsert(
          { booking_id: bookingId },
          { onConflict: 'booking_id', ignoreDuplicates: true }
        );
      }

      await loadBookings();
      await loadStats();
      Alert.alert(accept ? 'Accepted!' : 'Declined', accept ? 'Booking accepted. The tourist has been notified.' : 'Booking declined.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to respond. Please try again.');
    }
    setRespondingId(null);
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Guide';
  const pending = stats?.pending_requests ?? pendingBookings.length;

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />}
      >
        {/* Hero */}
        <View className="bg-primary rounded-[16px] p-5 mb-5">
          <Text className="font-displayBold text-[24px] text-white mb-1">Namaste, {firstName}</Text>
          <Text className="font-body text-[14px] text-white/80 leading-[20px] pr-10">
            {loadingStats
              ? 'Loading your dashboard...'
              : pending > 0
                ? `You have ${pending} new trek request${pending > 1 ? 's' : ''} waiting.`
                : 'No pending requests. You\'re all caught up!'}
          </Text>
        </View>

        {/* Stats cards */}
        {loadingStats ? (
          <View className="mb-8 h-[200px] items-center justify-center">
            <ActivityIndicator size="large" color="#8B1A1A" />
          </View>
        ) : (
          <View className="flex-row mb-8 gap-3">
            <Card className="flex-1 items-center py-5">
              <View className="w-10 h-10 bg-sand/20 rounded-full items-center justify-center mb-2">
                <Star size={20} color="#F4A261" fill="#F4A261" />
              </View>
              <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">RATING</Text>
              <Text className="font-displayBold text-[28px] text-on-surface">
                {stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : '—'}
              </Text>
              <Text className="font-body text-[11px] text-[#22C55E]">{stats?.total_reviews || 0} reviews</Text>
            </Card>

            <Card className="flex-1 items-center py-5">
              <View className="w-10 h-10 bg-mint/50 rounded-full items-center justify-center mb-2">
                <Text className="text-primary font-bold text-xs">रू</Text>
              </View>
              <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">THIS WEEK</Text>
              <Text className="font-displayBold text-[28px] text-on-surface">
                {stats?.week_earnings_npr
                  ? `${(stats.week_earnings_npr / 1000).toFixed(1)}k`
                  : '0'}
              </Text>
              <Text className="font-body text-[11px] text-on-surface-variant">NPR earned</Text>
            </Card>
          </View>
        )}

        {/* New Requests */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Text className="font-displaySemiBold text-[20px] text-on-surface mr-3">New Requests</Text>
            <Badge label={`${pendingBookings.length} Pending`} variant="terracotta" />
          </View>
          <Pressable onPress={() => router.push('/(guide)/inbox' as any)}>
            <Text className="font-bodySemibold text-[14px] text-primary">View All</Text>
          </Pressable>
        </View>

        {loadingBookings ? (
          <View className="items-center py-8 mb-8">
            <ActivityIndicator color="#8B1A1A" />
          </View>
        ) : pendingBookings.length === 0 ? (
          <Card className="mb-8 items-center py-8">
            <Text className="text-3xl mb-3">🏔️</Text>
            <Text className="font-semibold text-on-surface text-base mb-1">No pending requests</Text>
            <Text className="text-on-surface-variant text-sm text-center">
              Make sure your profile is verified and you're set to online.
            </Text>
          </Card>
        ) : (
          <View className="mb-8">
            {pendingBookings.slice(0, 3).map(booking => {
              const tourist = booking.tourist as any;
              const name = tourist?.full_name || 'Tourist';
              const startDate = new Date(booking.start_date);
              const isResponding = respondingId === booking.id;

              return (
                <Card key={booking.id} noPadding className="mb-3 p-4">
                  {/* Tourist + date row */}
                  <Pressable
                    className="flex-row items-center mb-3"
                    onPress={() => router.push(`/booking/${booking.id}` as any)}
                  >
                    <View className="w-12 h-12 bg-mint rounded-full items-center justify-center mr-3">
                      <Text className="font-bold text-primary text-base">{name[0].toUpperCase()}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-displaySemiBold text-[15px] text-on-surface">{name}</Text>
                      <View className="flex-row items-center mt-0.5">
                        <CalendarDays size={12} color="#717973" />
                        <Text className="font-body text-[12px] text-on-surface-variant ml-1">
                          {booking.start_date} → {booking.end_date} ({booking.total_days} days)
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </Pressable>

                  {/* Trip details row */}
                  <View className="flex-row items-center mb-3">
                    <Users size={12} color="#717973" />
                    <Text className="font-body text-[12px] text-on-surface-variant ml-1 flex-1">
                      {booking.travelers_count} traveler{booking.travelers_count > 1 ? 's' : ''} · {booking.trip_category?.replace('_', ' ')} · {booking.district}
                    </Text>
                    <Text className="font-displaySemiBold text-[15px] text-primary">
                      रू {booking.total_amount_npr?.toLocaleString()}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="flex-row">
                    <Button
                      variant="primary"
                      className="flex-1 mr-2 h-[40px]"
                      loading={isResponding}
                      onPress={() => respondToBooking(booking.id, true)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-[90px] h-[40px] bg-white border-outline-variant"
                      textClassName="text-on-surface-variant"
                      loading={isResponding}
                      onPress={() => respondToBooking(booking.id, false)}
                    >
                      Decline
                    </Button>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Active / Upcoming */}
        {activeBookings.length > 0 && (
          <>
            <Text className="font-displaySemiBold text-[20px] text-on-surface mb-4">Active Bookings</Text>
            <View className="mb-8">
              {activeBookings.map(booking => {
                const tourist = booking.tourist as any;
                const name = tourist?.full_name || 'Tourist';
                const d = new Date(booking.start_date);
                const day = d.getDate();
                const mon = d.toLocaleString('default', { month: 'short' }).toUpperCase();

                return (
                  <Pressable
                    key={booking.id}
                    onPress={() => router.push(`/booking/${booking.id}` as any)}
                  >
                    <Card className="mb-3 flex-row items-center">
                      <View className="w-12 items-center mr-3">
                        <Text className="font-displaySemiBold text-[22px] text-on-surface">{day}</Text>
                        <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider">{mon}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-displaySemiBold text-[15px] text-on-surface">{name}</Text>
                        <Text className="font-body text-[12px] text-on-surface-variant mt-0.5">
                          {booking.total_days} days · {booking.travelers_count} pax · रू {booking.total_amount_npr?.toLocaleString()}
                        </Text>
                      </View>
                      <View className="bg-[#DDF1E1] px-2 py-1 rounded-[6px]">
                        <Text className="font-bodyBold text-[10px] text-primary uppercase tracking-wider">
                          {booking.status === 'in_progress' ? 'ACTIVE' : 'UPCOMING'}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Performance */}
        <Text className="font-displaySemiBold text-[16px] text-on-surface mb-4">Guide Performance</Text>
        <Card className="mb-8">
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider">TRIPS COMPLETED</Text>
              <Text className="font-bodyBold text-[12px] text-primary">{stats?.completed_trips ?? '—'}</Text>
            </View>
            <View className="w-full h-1.5 bg-surface-container-highest rounded-full">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min(100, ((stats?.completed_trips ?? 0) / 50) * 100)}%` }}
              />
            </View>
          </View>
          <View>
            <View className="flex-row justify-between items-center mb-1">
              <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider">TOTAL REVIEWS</Text>
              <Text className="font-bodyBold text-[12px] text-primary">{stats?.total_reviews ?? '—'}</Text>
            </View>
            <View className="w-full h-1.5 bg-surface-container-highest rounded-full">
              <View
                className="h-full bg-[#22C55E] rounded-full"
                style={{ width: `${Math.min(100, ((stats?.total_reviews ?? 0) / 100) * 100)}%` }}
              />
            </View>
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}
