import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { ArrowLeft, User, Phone, Globe } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';

export default function PersonalInformationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const setAuth = useAuthStore((s: any) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoadingData(true);
    // @ts-ignore - The Supabase generated Database types for 'profiles' are failing to infer the Select and Update types properly, resulting in 'never'
    const { data } = await (supabase.from('profiles') as any)
      .select('full_name, phone, country, bio, gender')
      .eq('id', user!.id)
      .single();

    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setCountry(data.country || '');
      setBio(data.bio || '');
      setGender(data.gender || '');
    }
    setLoadingData(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required.');
      return;
    }
    setLoading(true);
    
    // @ts-ignore - The Supabase generated Database types for 'profiles' are failing to infer the Update type properly, resulting in 'never'
    const { error } = await (supabase.from('profiles') as any)
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        bio: bio.trim() || null,
        gender: gender || null,
      })
      .eq('id', user!.id);

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } else {
      // Update auth store with new name
      if (profile) {
        setAuth(user, { ...profile, full_name: fullName.trim() });
      }
      Alert.alert('Success', 'Your profile has been updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const genderOptions = ['male', 'female', 'other', 'prefer_not_to_say'];
  const genderLabels: Record<string, string> = {
    male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say'
  };

  if (loadingData) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#8B1A1A" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-4 border-b border-outline-variant flex-row items-center">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color="#8B1A1A" />
        </Pressable>
        <Text className="font-displayBold text-[20px] text-on-surface">Personal Information</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Full Name */}
        <View className="mb-5">
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            leftIcon={<User size={18} color="#717973" />}
            autoCapitalize="words"
          />
        </View>

        {/* Email - read only */}
        <View className="mb-5">
          <Text className="font-semibold text-[14px] text-on-surface mb-2 font-bodySemibold">Email</Text>
          <View className="flex-row items-center bg-surface-container border border-surface-container-highest rounded-[8px] px-3 h-12">
            <Text className="flex-1 text-base text-on-surface-variant font-body">{user?.email}</Text>
            <Text className="text-xs text-on-surface-variant font-body">Read-only</Text>
          </View>
        </View>

        {/* Phone */}
        <View className="mb-5">
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+977 98XXXXXXXX"
            leftIcon={<Phone size={18} color="#717973" />}
            keyboardType="phone-pad"
          />
        </View>

        {/* Country */}
        <View className="mb-5">
          <Input
            label="Country"
            value={country}
            onChangeText={setCountry}
            placeholder="e.g. Nepal, USA, India..."
            leftIcon={<Globe size={18} color="#717973" />}
            autoCapitalize="words"
          />
        </View>

        {/* Gender */}
        <View className="mb-5">
          <Text className="font-semibold text-[14px] text-on-surface mb-2 font-bodySemibold">Gender</Text>
          <View className="flex-row flex-wrap gap-2">
            {genderOptions.map((g) => (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                className={`px-4 py-2 rounded-full border ${
                  gender === g
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-outline-variant'
                }`}
              >
                <Text className={`font-body text-[14px] ${gender === g ? 'text-white' : 'text-on-surface'}`}>
                  {genderLabels[g]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Bio */}
        <View className="mb-8">
          <Text className="font-semibold text-[14px] text-on-surface mb-2 font-bodySemibold">Bio</Text>
          <View className="bg-surface-container-low border border-surface-container-highest rounded-[8px] px-3 py-3">
            <TextInput
              className="text-base text-on-surface font-body"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>
        </View>

        <Button onPress={handleSave} loading={loading} className="mb-10">
          Save Changes
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
