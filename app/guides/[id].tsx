import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Alert,
  ActivityIndicator, TouchableOpacity, Modal, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, Star, MapPin, Languages, Briefcase, MessageSquare,
  TrendingUp, Award, Calendar, X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { Avatar } from '../../src/components/ui/Avatar';
import { useAuth } from '../../src/hooks/useAuth';

type Guide = {
  id: string;
  bio_long?: string;
  bio_guide?: string;
  years_of_experience?: number;
  price_negotiable?: boolean;
  is_licensed?: boolean;
  specializations?: string[];
  service_areas?: string[];
  languages_spoken?: string[];
  average_rating?: number;
  total_reviews?: number;
  total_trips?: number;
  total_trips_completed?: number;
  is_verified?: boolean;
  profiles?: { full_name: string; avatar_url: string | null; email: string | null };
};

type Review = {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  profiles?: { full_name: string };
};

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size} color="#F4A261" fill={n <= Math.round(rating) ? '#F4A261' : 'none'} style={{ marginRight: 2 }} />
      ))}
    </View>
  );
}

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [perfStats, setPerfStats] = useState({ responseRate: 100, completionRate: 100 });

  const [reviewModal, setReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: g }, { data: r }] = await Promise.all([
        (supabase.from('guide_profiles') as any)
          .select('*, profiles(full_name, avatar_url, email)')
          .eq('id', id)
          .single(),
        (supabase.from('reviews') as any)
          .select('*, profiles!reviewer_id(full_name)')
          .eq('reviewee_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (g) setGuide(g);
      if (r) setReviews(r);

      
      const [{ data: bkReqs }, { data: bkAll }] = await Promise.all([
        (supabase.from('bookings') as any)
          .select('status')
          .eq('guide_id', id)
          .in('status', ['requested', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled']),
        (supabase.from('bookings') as any)
          .select('status')
          .eq('guide_id', id)
          .in('status', ['accepted', 'in_progress', 'completed']),
      ]);
      const totalReqs = bkReqs?.length ?? 0;
      const responded = (bkReqs || []).filter((b: any) => b.status !== 'requested').length;
      const responseRate = totalReqs > 0 ? Math.round((responded / totalReqs) * 100) : 100;
      const totalActive = bkAll?.length ?? 0;
      const completedCount = (bkAll || []).filter((b: any) => b.status === 'completed').length;
      const completionRate = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 100;
      setPerfStats({ responseRate, completionRate });

      setLoading(false);
    }
    if (id) load();
  }, [id, user]);

  async function openDirectChat() {
    if (!user) { Alert.alert('Sign in required', 'Please sign in to message this guide.'); return; }
    setMessageLoading(true);
    try {
      const { data: threadId, error } = await (supabase.rpc as any)('find_or_create_chat_thread', {
        p_tourist_id: user.id,
        p_guide_id: id,
      });

      if (error) throw error;
      router.push(`/chat/${threadId}` as any);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not open chat.');
    } finally {
      setMessageLoading(false);
    }
  }

  async function submitReview() {
    if (!user) { Alert.alert('Sign in required'); return; }
    setSubmitting(true);
    try {
      const { data: completedBooking } = await (supabase.from('bookings') as any)
        .select('id')
        .eq('tourist_id', user.id)
        .eq('guide_id', id)
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle();

      if (!completedBooking) {
        Alert.alert('Trip Required', 'You can only leave a review after completing a trip with this guide.');
        setSubmitting(false);
        return;
      }

      const { error } = await (supabase.from('reviews') as any).insert({
        reviewer_id: user.id,
        reviewee_id: id,
        rating: reviewRating,
        comment: reviewText.trim() || null,
        booking_id: completedBooking.id,
        is_guide_review: true,
      });

      if (error) {
        Alert.alert('Could not save review', error.message);
      } else {
        setReviewModal(false);
        setReviewText('');
        setReviewRating(5);
        const [{ data: r }, { data: freshGuide }] = await Promise.all([
          (supabase.from('reviews') as any)
            .select('*, profiles!reviewer_id(full_name)')
            .eq('reviewee_id', id)
            .order('created_at', { ascending: false })
            .limit(10),
          (supabase.from('guide_profiles') as any)
            .select('*, profiles(full_name, avatar_url, email)')
            .eq('id', id)
            .single(),
        ]);
        if (r) setReviews(r);
        if (freshGuide) setGuide(freshGuide);
        Alert.alert('Thank you!', 'Your review has been submitted.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#8B1A1A" />
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA', padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1C1E', marginBottom: 8 }}>Guide not found</Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: '#8B1A1A', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const name = guide.profiles?.full_name || 'Guide';
  const rating = guide.average_rating ?? 0;
  const totalReviews = guide.total_reviews ?? reviews.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {}
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ChevronLeft size={22} color="#1A1C1E" />
          </Pressable>

          <View style={styles.avatarWrapper}>
            <Avatar src={guide.profiles?.avatar_url || undefined} size={90} borderMint />
          </View>

          <Text style={styles.guideName}>{name}</Text>

          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {guide.is_verified && (
              <View style={styles.verifiedBadge}>
                <Award size={12} color="#8B1A1A" />
                <Text style={styles.verifiedText}>VERIFIED GUIDE</Text>
              </View>
            )}
            {guide.is_licensed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Award size={12} color="#065F46" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#065F46', letterSpacing: 0.5 }}>NTB LICENSED</Text>
              </View>
            )}
          </View>

          {rating > 0 ? (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <StarRow rating={rating} />
              <Text style={{ fontSize: 13, color: '#717973', marginTop: 4 }}>
                {rating.toFixed(1)} · {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: '#717973', marginTop: 8 }}>New Guide</Text>
          )}
        </View>

        <View style={{ paddingHorizontal: 20 }}>

          {}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Calendar size={18} color="#8B1A1A" />
              <Text style={styles.statVal}>{guide.years_of_experience ?? '—'}</Text>
              <Text style={styles.statLbl}>Years Exp</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <TrendingUp size={18} color="#8B1A1A" />
              <Text style={styles.statVal}>{guide.total_trips ?? '—'}</Text>
              <Text style={styles.statLbl}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Briefcase size={18} color="#8B1A1A" />
              <Text style={styles.statVal}>{guide.service_areas?.length ?? '—'}</Text>
              <Text style={styles.statLbl}>Areas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <View style={{
                backgroundColor: guide.price_negotiable ? '#FEF3C7' : '#F3F4F6',
                borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
              }}>
                <Text style={{
                  fontSize: 9, fontWeight: '700',
                  color: guide.price_negotiable ? '#D97706' : '#6B7280',
                }}>
                  {guide.price_negotiable ? 'NEGOTIABLE' : 'FIXED PRICE'}
                </Text>
              </View>
              <Text style={styles.statLbl}>Pricing</Text>
            </View>
          </View>

          {}
          {(guide.specializations?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specializations</Text>
              <View style={styles.chipRow}>
                {guide.specializations!.map(s => (
                  <View key={s} style={styles.chip}>
                    <Text style={styles.chipText}>{s.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {}
          {(guide.service_areas?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Areas</Text>
              <View style={styles.chipRow}>
                {guide.service_areas!.map(a => (
                  <View key={a} style={[styles.chip, { backgroundColor: '#E1F0FF' }]}>
                    <MapPin size={11} color="#0077B6" style={{ marginRight: 4 }} />
                    <Text style={[styles.chipText, { color: '#0077B6' }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {}
          {(guide.languages_spoken?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Languages size={15} color="#717973" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Languages</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#414844' }}>
                {guide.languages_spoken!.join(' · ')}
              </Text>
            </View>
          )}

          {}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={{ fontSize: 14, color: '#414844', lineHeight: 22 }}>
              {guide.bio_long || guide.bio_guide || `Certified Nepal guide with ${guide.years_of_experience ?? 'several'} years of experience leading trekking and cultural tours across Nepal.`}
            </Text>
          </View>

          {}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.perfCard, { flex: 1 }]}>
                <Text style={styles.perfVal}>{guide.total_trips_completed ?? 0}</Text>
                <Text style={styles.perfLbl}>Trips Done</Text>
              </View>
              <View style={[styles.perfCard, { flex: 1 }]}>
                <Text style={styles.perfVal}>{perfStats.responseRate}%</Text>
                <Text style={styles.perfLbl}>Response Rate</Text>
              </View>
              <View style={[styles.perfCard, { flex: 1 }]}>
                <Text style={styles.perfVal}>{perfStats.completionRate}%</Text>
                <Text style={styles.perfLbl}>Completion</Text>
              </View>
            </View>
          </View>

          {}
          <View style={styles.section}>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Reviews ({totalReviews})</Text>
            </View>

            {reviews.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 }}>
                No reviews yet. Be the first!
              </Text>
            ) : (
              reviews.slice(0, 5).map(rev => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: '#1A1C1E' }}>
                      {(rev.profiles as any)?.full_name || 'Anonymous'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {new Date(rev.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <StarRow rating={rev.rating} size={13} />
                  {rev.comment ? (
                    <Text style={{ fontSize: 13, color: '#414844', marginTop: 6, lineHeight: 19 }}>{rev.comment}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

        </View>
      </ScrollView>

      {}
      <View style={[styles.cta, { paddingBottom: insets.bottom + 12 }]}>
        {user?.id !== id && (
          <View style={{ width: '100%' }}>
            {}
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: '#8B1A1A', marginRight: 8 }]}
                activeOpacity={0.8}
                onPress={() => router.push(`/booking/new?guideId=${id}` as any)}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Send Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: '#E1F0FF', flex: 0.6, opacity: messageLoading ? 0.6 : 1 }]}
                activeOpacity={0.8}
                onPress={openDirectChat}
                disabled={messageLoading}
              >
                {messageLoading
                  ? <ActivityIndicator size="small" color="#0077B6" />
                  : <>
                      <MessageSquare size={16} color="#0077B6" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#0077B6', fontWeight: '700', fontSize: 15 }}>Message</Text>
                    </>
                }
              </TouchableOpacity>
            </View>

            {}
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }]}
              activeOpacity={0.8}
              onPress={() => router.push('/guides' as any)}
            >
              <Text style={{ color: '#414844', fontWeight: '700', fontSize: 14 }}>Find Another Guide</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {}
      <Modal visible={reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setReviewModal(false)} />
        <View style={styles.modalSheet}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontWeight: '700', fontSize: 18, color: '#1A1C1E' }}>Rate {name.split(' ')[0]}</Text>
            <Pressable onPress={() => setReviewModal(false)} hitSlop={8}>
              <X size={22} color="#717973" />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setReviewRating(n)} style={{ padding: 4 }}>
                <Star size={32} color="#F4A261" fill={n <= reviewRating ? '#F4A261' : 'none'} />
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
            style={styles.reviewInput}
          />

          <TouchableOpacity
            onPress={submitReview}
            disabled={submitting}
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            activeOpacity={0.8}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Submit Review</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: { marginBottom: 12 },
  guideName: { fontWeight: '700', fontSize: 22, color: '#1A1C1E', textAlign: 'center' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
    backgroundColor: '#C8E6C9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#8B1A1A', marginLeft: 4, letterSpacing: 0.6 },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#F3F4F6', marginHorizontal: 4 },
  statVal: { fontWeight: '700', fontSize: 13, color: '#1A1C1E', marginTop: 4 },
  statLbl: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontWeight: '700', fontSize: 16, color: '#1A1C1E', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0ED', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 8, marginBottom: 6,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#8B1A1A', textTransform: 'capitalize' },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  ctaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  reviewInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1A1C1E', minHeight: 100,
    textAlignVertical: 'top', marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#8B1A1A', borderRadius: 12, alignItems: 'center', paddingVertical: 14,
  },
  perfCard: {
    backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, alignItems: 'center',
  },
  perfVal: {
    fontSize: 20, fontWeight: '700', color: '#8B1A1A', marginBottom: 2,
  },
  perfLbl: {
    fontSize: 11, color: '#717973', textAlign: 'center',
  },
});
