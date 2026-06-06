const fs = require('fs');
const path = require('path');

const writeIfDifferent = (filePath, content) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Wrote screen:', filePath);
};

writeIfDifferent(path.join(__dirname, 'app/welcome.tsx'), `import React from 'react';
import { View, Text, ImageBackground, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { Button } from '../src/components/ui/Button';
import { Avatar } from '../src/components/ui/Avatar';
import { Badge } from '../src/components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1000&auto=format&fit=crop' }}
        className="flex-1 w-full h-full justify-between"
      >
        <LinearGradient
          colors={['rgba(20,40,60,0.4)', 'rgba(10,20,30,0.7)']}
          className="absolute inset-0 w-full h-full"
        />
        
        <View style={{ paddingTop: insets.top + 20 }} className="px-6 flex-row justify-between items-start">
          <View>
            <Text className="text-white/70 font-bodyBold text-[12px] uppercase tracking-wider mb-1">
              HIGHLANDS & HORIZONS
            </Text>
            <Text className="font-displayBold text-[24px] text-white">Trip Nepal</Text>
          </View>
          <Avatar src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=150" size={40} borderMint />
        </View>

        <View className="px-6 pb-12" style={{ paddingBottom: insets.bottom + 40 }}>
          <View className="bg-white/20 border border-white/20 self-start px-3 py-1.5 rounded-[8px] flex-row items-center mb-6">
            <ShieldCheck size={14} color="#A5D0B9" />
            <Text className="text-white font-bodyBold text-[12px] ml-1.5 tracking-wider uppercase">READY FOR EXPEDITION</Text>
          </View>

          <Text className="font-displayBold text-[48px] text-white leading-[52px] tracking-tight mb-4">
            The mountains are calling, and I must go.
          </Text>
          
          <Text className="text-white/70 font-body text-[16px] mb-6">
            — John Muir
          </Text>

          <Text className="text-white font-body text-[16px] leading-[24px] mb-8 pr-4">
            Navigate the rugged beauty of the Himalayas with expert-led expeditions and real-time mountain intelligence.
          </Text>

          <Button
            variant="primary"
            fullWidth={false}
            className="w-[180px] mb-12"
            rightIcon={<ArrowRight size={18} color="#FFF" />}
            onPress={() => router.push('/(auth)/login')}
          >
            Trip Now
          </Button>

          <View className="flex-row items-center justify-between border-t border-white/20 pt-6">
            <View>
              <Text className="text-white font-displaySemiBold text-[20px]">8,848m</Text>
              <Text className="text-white/70 font-bodyMedium text-[11px] uppercase tracking-wider">MAX ELEVATION</Text>
            </View>
            <View>
              <Text className="text-white font-displaySemiBold text-[20px]">24/7</Text>
              <Text className="text-white/70 font-bodyMedium text-[11px] uppercase tracking-wider">SUPPORT</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
`);

writeIfDifferent(path.join(__dirname, 'app/(auth)/login.tsx'), `import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Mail, Lock, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Card } from '../../src/components/ui/Card';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { useAuth } from '../../src/hooks/useAuth';
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
      
      // Fetch profile to verify role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
        
      const expectedRole = roleIndex === 0 ? 'tourist' : 'guide';
      
      if (profile && profile.role !== expectedRole) {
        await supabase.auth.signOut();
        setError(\`This account is registered as a \${profile.role}. Please switch to \${profile.role} login.\`);
        return;
      }
      
      if (expectedRole === 'guide') {
        router.replace('/(guide)/dashboard');
      } else {
        router.replace('/(tourist)/home');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials');
    } finally {
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
        <Card className="w-[85%] max-w-[400px] p-8 !shadow-2xl" style={{ shadowColor: '#1B4332', shadowOpacity: 0.1, shadowRadius: 24, elevation: 10 }}>
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

          <Pressable className="items-center">
            <Text className="font-body text-on-surface-variant text-sm">
              New to the mountains? <Text className="text-primary font-bodyBold">Start your registration</Text>
            </Text>
          </Pressable>
        </Card>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
`);
