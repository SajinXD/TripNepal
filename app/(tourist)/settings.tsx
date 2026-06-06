import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Pencil, User, Shield, DollarSign, Globe, HelpCircle, FileText, LogOut, ChevronRight } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Avatar } from '../../src/components/ui/Avatar';
import { IconTile } from '../../src/components/ui/IconTile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { pickAndUploadImage } from '../../src/lib/image-picker';
import { useThemeStore } from '../../src/stores/themeStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, updateProfile } = useAuthStore();
  const { isDark, loadTheme } = useThemeStore();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [language, setLanguage] = useState('English (US)');
  const [currency, setCurrency] = useState('NPR - Nepalese Rupee');
  const [stats, setStats] = useState({ expeditions: 0, points: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadTheme();
    if (user?.id) fetchStats();
  }, [user?.id]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tourist_id', user!.id)
        .eq('status', 'completed');
      setStats({ expeditions: count ?? 0, points: (count ?? 0) * 200 });
    } catch (e) {
      console.warn('Could not load stats', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          useAuthStore.getState().setAuth(null, null);
        },
      },
    ]);
  };

  const handleAvatarUpload = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const url = await pickAndUploadImage('avatars', user.id);
      if (url) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: url })
          .eq('id', user.id);
        
        if (error) throw error;
        updateProfile({ avatar_url: url });
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Could not update profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCurrency = () => {
    Alert.alert('Select Currency', 'Choose your preferred currency:', [
      { text: 'NPR - Nepalese Rupee', onPress: () => setCurrency('NPR - Nepalese Rupee') },
      { text: 'USD - US Dollar', onPress: () => setCurrency('USD - US Dollar') },
      { text: 'EUR - Euro', onPress: () => setCurrency('EUR - Euro') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLanguage = () => {
    Alert.alert('Select Language', 'Choose your preferred language:', [
      { text: 'English (US)', onPress: () => setLanguage('English (US)') },
      { text: 'Nepali (नेपाली)', onPress: () => setLanguage('Nepali (नेपाली)') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Traveller';
  const displayEmail = user?.email || '—';
  const avatarSrc = profile?.avatar_url || undefined;

  
  const bg = isDark ? '#111827' : '#F8F9FA';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1A1C1E';
  const subTextColor = isDark ? '#9CA3AF' : '#717973';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        
        {}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 20, marginBottom: 28, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ position: 'relative', marginRight: 16 }}>
              <Avatar size={64} src={avatarSrc} borderMint />
              <Pressable
                onPress={handleAvatarUpload}
                disabled={uploadingAvatar}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#8B1A1A" />
                ) : (
                  <Pencil size={12} color="#414844" />
                )}
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 22, color: textColor }}>{displayName}</Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginBottom: 8 }}>{displayEmail}</Text>
              <Badge label={profile?.role === 'guide' ? 'GUIDE' : 'EXPLORER'} variant="mint" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', paddingTop: 16, borderTopWidth: 1, borderTopColor: borderColor }}>
            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: borderColor }}>
              <Text style={{ fontSize: 10, color: subTextColor, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>EXPEDITIONS</Text>
              {loadingStats ? <ActivityIndicator size="small" /> : <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>{stats.expeditions}</Text>}
            </View>
            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: borderColor }}>
              <Text style={{ fontSize: 10, color: subTextColor, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>RATING</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>5.0</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: subTextColor, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>POINTS</Text>
              {loadingStats ? <ActivityIndicator size="small" /> : <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>{stats.points}</Text>}
            </View>
          </View>
        </View>

        {}
        <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, letterSpacing: 1.2, marginBottom: 12 }}>ACCOUNT SETTINGS</Text>
        <View style={{ backgroundColor: cardBg, borderRadius: 16, marginBottom: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}
            onPress={() => router.push('/personal-info')}
          >
            <IconTile icon={<User size={20} color="#8B1A1A" />} variant="primary" className="mr-3" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>Personal Information</Text>
              <Text style={{ fontSize: 13, color: subTextColor }}>Name, Address, Country</Text>
            </View>
            <ChevronRight size={20} color={subTextColor} />
          </Pressable>
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
            onPress={() => router.push('/login-security')}
          >
            <IconTile icon={<Shield size={20} color="#8B1A1A" />} variant="primary" className="mr-3" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>Login & Security</Text>
              <Text style={{ fontSize: 13, color: subTextColor }}>Password, 2FA, Biometrics</Text>
            </View>
            <ChevronRight size={20} color={subTextColor} />
          </Pressable>
        </View>

        {}
        <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, letterSpacing: 1.2, marginBottom: 12 }}>PREFERENCES</Text>
        <View style={{ backgroundColor: cardBg, borderRadius: 16, marginBottom: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          {}
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor }} onPress={handleCurrency}>
            <IconTile icon={<DollarSign size={20} color="#0077B6" />} variant="preferences" className="mr-3" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>Currency</Text>
              <Text style={{ fontSize: 13, color: subTextColor }}>{currency}</Text>
            </View>
            <ChevronRight size={20} color={subTextColor} />
          </Pressable>
          {}
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }} onPress={handleLanguage}>
            <IconTile icon={<Globe size={20} color="#0077B6" />} variant="preferences" className="mr-3" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>Language</Text>
              <Text style={{ fontSize: 13, color: subTextColor }}>{language}</Text>
            </View>
            <ChevronRight size={20} color={subTextColor} />
          </Pressable>
        </View>

        {}
        <Text style={{ fontSize: 11, fontWeight: '700', color: subTextColor, letterSpacing: 1.2, marginBottom: 12 }}>APP INFO</Text>
        <View style={{ backgroundColor: cardBg, borderRadius: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}
            onPress={() => Alert.alert('Help & Support', 'Email: tripnepal@gmail.com\nPhone: +977-9876543210\n\nWe respond within 24 hours.')}
          >
            <IconTile icon={<HelpCircle size={20} color="#414844" />} variant="info" className="mr-3" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>Help & Support</Text>
            </View>
            <ChevronRight size={20} color={subTextColor} />
          </Pressable>
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}
            onPress={() => router.push('/terms' as any)}
          >
            <IconTile icon={<FileText size={20} color="#414844" />} variant="info" className="mr-3" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>Terms of Service</Text>
            </View>
            <ChevronRight size={20} color={subTextColor} />
          </Pressable>
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }} onPress={handleLogout}>
            <IconTile icon={<LogOut size={20} color="#BA1A1A" />} variant="danger" className="mr-3" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#BA1A1A' }}>Logout</Text>
            </View>
          </Pressable>
        </View>

        <Text style={{ textAlign: 'center', fontSize: 11, color: subTextColor, marginBottom: 40 }}>
          Version 1.0.0 (Trip Nepal)
        </Text>
      </ScrollView>
    </View>
  );
}
