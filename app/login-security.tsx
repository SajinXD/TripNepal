import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';

export default function LoginSecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to update password.');
    } else {
      Alert.alert('Success', 'Your password has been changed successfully!', [
        {
          text: 'OK', onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            router.back();
          }
        }
      ]);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is permanent and cannot be undone. All your data, bookings, and trip plans will be deleted.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'To delete your account, please contact us at:\nsupport@tripnepal.com');
          },
        },
      ]
    );
  };

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
        <Text className="font-displayBold text-[20px] text-on-surface">Login & Security</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>

        {/* Change Password Section */}
        <Text className="font-bodyBold text-[12px] text-on-surface-variant uppercase tracking-wider mb-4">
          CHANGE PASSWORD
        </Text>

        <View className="bg-surface-container-low border border-outline-variant rounded-[12px] p-4 mb-6">
          <View className="mb-4">
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 8 characters"
              isPassword
              leftIcon={<Lock size={18} color="#717973" />}
            />
          </View>
          <View className="mb-4">
            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              isPassword
              leftIcon={<Lock size={18} color="#717973" />}
            />
          </View>

          {/* Password strength hint */}
          {newPassword.length > 0 && (
            <View className="mb-4">
              <Text className="font-body text-[12px] text-on-surface-variant mb-1">Password strength:</Text>
              <View className="flex-row gap-1">
                {[1, 2, 3, 4].map((i) => {
                  const strength = 
                    newPassword.length >= 12 ? 4 :
                    newPassword.length >= 10 ? 3 :
                    newPassword.length >= 8 ? 2 : 1;
                  const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E'];
                  return (
                    <View
                      key={i}
                      className="flex-1 h-1.5 rounded-full"
                      style={{ backgroundColor: i <= strength ? colors[strength - 1] : '#E5E7EB' }}
                    />
                  );
                })}
              </View>
              <Text className="font-body text-[11px] text-on-surface-variant mt-1">
                {newPassword.length >= 12 ? '✅ Strong' :
                 newPassword.length >= 10 ? '🟡 Good' :
                 newPassword.length >= 8 ? '🟠 Fair' : '🔴 Too short'}
              </Text>
            </View>
          )}

          <Button onPress={handleChangePassword} loading={loading}>
            Update Password
          </Button>
        </View>

        {/* Security Info */}
        <Text className="font-bodyBold text-[12px] text-on-surface-variant uppercase tracking-wider mb-4">
          SECURITY INFO
        </Text>

        <View className="bg-surface-container-low border border-outline-variant rounded-[12px] mb-6">
          <View className="p-4 border-b border-outline-variant">
            <Text className="font-displaySemiBold text-[15px] text-on-surface">Two-Factor Authentication</Text>
            <Text className="font-body text-[13px] text-on-surface-variant mt-1">2FA adds an extra layer of security. Coming soon.</Text>
          </View>
          <View className="p-4 border-b border-outline-variant">
            <Text className="font-displaySemiBold text-[15px] text-on-surface">Biometrics</Text>
            <Text className="font-body text-[13px] text-on-surface-variant mt-1">Log in with Face ID or fingerprint. Coming soon.</Text>
          </View>
          <View className="p-4">
            <Text className="font-displaySemiBold text-[15px] text-on-surface">Active Sessions</Text>
            <Text className="font-body text-[13px] text-on-surface-variant mt-1">You are logged in on this device.</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <Text className="font-bodyBold text-[12px] text-error uppercase tracking-wider mb-4">
          DANGER ZONE
        </Text>
        <Pressable
          onPress={handleDeleteAccount}
          className="bg-error-container border border-error rounded-[12px] p-4 mb-10 items-center"
        >
          <Text className="font-displaySemiBold text-[15px] text-error">Delete Account</Text>
          <Text className="font-body text-[12px] text-error opacity-70 mt-1">This action is irreversible</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
