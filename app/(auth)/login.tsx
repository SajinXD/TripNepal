import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Mail, Lock, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Card } from '../../src/components/ui/Card';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { supabase } from '../../src/lib/supabase';
import { cn } from '../../src/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const [roleIndex, setRoleIndex] = useState(0); // 0 = Customer, 1 = Guide
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;

      // Only check role mismatch — navigation is handled by _layout.tsx
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const expectedRole = roleIndex === 0 ? 'tourist' : 'guide';
      const actualRole = (profileData as any)?.role;

      if (actualRole && actualRole !== expectedRole) {
        await supabase.auth.signOut();
        setError(`This account is a ${actualRole} account. Please select "${actualRole === 'guide' ? 'Guide' : 'Customer'}" above.`);
        setLoading(false);
        return;
      }
      // _layout.tsx will detect user+profile and navigate automatically
    } catch (err: any) {
      const msg: string = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email first. Check your inbox for a confirmation link from Supabase.');
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(msg || 'Login failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <LinearGradient
        colors={['#E1F0FF', '#F3F4F5']}
        className="flex-1 justify-center items-center px-4"
      >
        <Card className="w-[85%] max-w-[400px] p-8 !shadow-2xl" style={{ shadowColor: '#8B1A1A', shadowOpacity: 0.1, shadowRadius: 24, elevation: 10 }}>
          <Text className="font-displayBold text-[30px] text-primary mb-2 text-center">Welcome Back</Text>
          <Text className="font-body text-base text-on-surface-variant text-center mb-8">
            Continue your journey across the peaks.
          </Text>

          <View className="mb-6">
            <SegmentedControl 
              options={['Customer', 'Guide']} 
              selectedIndex={roleIndex} 
              onChange={setRoleIndex} 
            />
          </View>

          <View className="space-y-4 mb-2">
            <Input
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color="#717973" />}
            />
            
            <View className="relative">
              <Pressable className="absolute right-0 top-[-24px] z-10">
                <Text className="text-secondary font-bodySemibold text-sm">Forgot?</Text>
              </Pressable>
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon={<Lock size={20} color="#717973" />}
              />
            </View>
          </View>

          {error ? (
            <Text className="text-error font-body text-sm mt-1 mb-3">{error}</Text>
          ) : (
             <View className="h-4" />
          )}

          <Pressable 
            className="flex-row items-center mb-6" 
            onPress={() => setKeepSignedIn(!keepSignedIn)}
          >
            <View className={cn('w-[18px] h-[18px] border items-center justify-center rounded-[4px] mr-2', keepSignedIn ? 'bg-secondary border-secondary' : 'border-outline-variant')}>
              {keepSignedIn && <Check size={12} color="#FFF" />}
            </View>
            <Text className="text-on-surface font-body text-sm">Keep me signed in</Text>
          </Pressable>

          <Button 
            variant="primary" 
            onPress={handleLogin} 
            loading={loading}
            className="mb-6 h-[48px]"
            textClassName="text-[16px] font-displaySemiBold"
          >
            Log In
          </Button>

          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-[1px] bg-outline-variant" />
            <Text className="mx-4 text-outline font-bodyBold text-[12px] uppercase tracking-wider">OR CONTINUE WITH</Text>
            <View className="flex-1 h-[1px] bg-outline-variant" />
          </View>

          <View className="flex-row justify-between mb-8">
            <Button variant="secondary" className="flex-1 mr-2 bg-white" textClassName="text-on-surface">
              Google
            </Button>
            <Button variant="secondary" className="flex-1 ml-2 bg-white" textClassName="text-on-surface">
              Apple
            </Button>
          </View>

          <Pressable className="items-center" onPress={() => router.push('/(auth)/signup')}>
            <Text className="font-body text-on-surface-variant text-sm">
              New to the mountains? <Text className="text-primary font-bodyBold">Start your registration</Text>
            </Text>
          </Pressable>
        </Card>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
