import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { Calendar, MapPin, ChevronRight, Clock, CheckCircle, XCircle, Loader, Star } from 'lucide-react-native';

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

  const loadBookings = useCallback(async () => {
    if (!user) return;
    // @ts-ignore - bookings table inferred as never in stub types
    const { data } = await (supabase.from('bookings') as any)
      .select('*, guide_profiles(price_per_day, profiles(full_name, avatar_url))')
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
            <View className="items-center py-20">
              <Text className="text-[48px] mb-4">🏔️</Text>
              <Text className="font-displaySemiBold text-[18px] text-on-surface mb-2">No bookings yet</Text>
              <Text className="font-body text-[14px] text-on-surface-variant text-center px-8">
                {activeTab === 'All'
                  ? 'Start exploring guides and book your first Nepal adventure!'
                  : `No ${activeTab.toLowerCase()} bookings found.`}
              </Text>
              {activeTab === 'All' && (
                <Pressable
                  onPress={() => router.push('/guides' as any)}
                  className="mt-6 bg-primary px-6 py-3 rounded-full"
                >
                  <Text className="text-white font-bodySemibold">Find a Guide</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filtered.map(booking => {
              const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.requested;
              const StatusIcon = cfg.Icon;
              const guideName = (booking.guide_profiles?.profiles as any)?.full_name || 'Guide';
              const guideInitial = guideName[0].toUpperCase();

              return (
                <Pressable
                  key={booking.id}
                  onPress={() => router.push(`/booking/${booking.id}` as any)}
                  className="bg-white rounded-[16px] border border-outline-variant mb-4 overflow-hidden"
                  style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 }}
                >
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

                  {/* Content */}
                  <View className="p-4">
                    <View className="flex-row items-center mb-3">
                      {/* Guide avatar */}
                      <View className="w-11 h-11 bg-primary/10 rounded-full items-center justify-center mr-3">
                        <Text className="font-bold text-primary text-base">{guideInitial}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-displaySemiBold text-[16px] text-on-surface">{guideName}</Text>
                        <Text className="font-body text-[12px] text-on-surface-variant">Licensed Mountain Guide</Text>
                      </View>
                      <ChevronRight size={18} color="#717973" />
                    </View>

                    {/* Trip info */}
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

                    {/* Footer */}
                    <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-outline-variant">
                      <View>
                        <Text className="font-body text-[11px] text-on-surface-variant">Total Paid</Text>
                        <Text className="font-displaySemiBold text-[18px] text-primary">
                          रू {booking.total_amount_npr?.toLocaleString() || '—'}
                        </Text>
                      </View>

                      {booking.status === 'requested' && (
                        <View className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                          <Text className="font-bodySemibold text-[12px] text-amber-700">Awaiting Guide</Text>
                        </View>
                      )}
                      {booking.status === 'accepted' && (
                        <Pressable
                          onPress={() => router.push(`/chat/${booking.id}` as any)}
                          className="bg-primary px-4 py-2 rounded-full flex-row items-center"
                        >
                          <Text className="text-white font-bodySemibold text-[13px]">Message Guide</Text>
                        </Pressable>
                      )}
                      {booking.status === 'completed' && (
                        <Pressable
                          onPress={() => Alert.alert('Leave a Review', `Rate your experience with ${(booking.guide_profiles?.profiles as any)?.full_name || 'your guide'}?`, [
                            { text: 'Not Now', style: 'cancel' },
                            { text: 'Write Review', onPress: () => router.push(`/booking/${booking.id}` as any) },
                          ])}
                          className="bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-full"
                        >
                          <Text className="font-bodySemibold text-[12px] text-primary">Leave Review</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}
