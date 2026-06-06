import { useState } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Phone, CheckCircle2, Circle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [role, setRole] = useState<'tourist' | 'guide'>('tourist');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !fullName) {
      Alert.alert('Missing fields', 'Please enter name, email, and password');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: role,
        }
      }
    });

    if (error) {
      Alert.alert('Signup failed', error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      
      await (supabase.from('profiles') as any)
        .update({ full_name: fullName.trim(), role, ...(phone ? { phone: phone.trim() } : {}) })
        .eq('id', data.user.id);
    }

    setLoading(false);

    
    if (!data.session) {
      Alert.alert(
        'Check your email',
        'A confirmation link has been sent to ' + email.trim().toLowerCase() + '. Click it to verify your account, then come back to log in.',
        [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
      );
    } else {
      Alert.alert('Account created!', 'You can now log in.', [
        { text: 'Log in', onPress: () => router.replace('/(auth)/login') }
      ]);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Trip Nepal and start your journey.</Text>

          <Text style={styles.sectionLabel}>I want to join as a:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setRole('tourist')}
              style={[styles.roleButton, role === 'tourist' && styles.roleButtonActive]}
            >
              {role === 'tourist' ? <CheckCircle2 size={20} color="#8B1A1A" /> : <Circle size={20} color="#9CA3AF" />}
              <Text style={[styles.roleText, role === 'tourist' && styles.roleTextActive]}>Tourist</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setRole('guide')}
              style={[styles.roleButton, role === 'guide' && styles.roleButtonActive]}
            >
              {role === 'guide' ? <CheckCircle2 size={20} color="#8B1A1A" /> : <Circle size={20} color="#9CA3AF" />}
              <Text style={[styles.roleText, role === 'guide' && styles.roleTextActive]}>Guide</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputRow}>
            <User size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputRow}>
            <Mail size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>Phone Number (Optional)</Text>
          <View style={styles.inputRow}>
            <Phone size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+977 9800000000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Lock size={18} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F7F7F4' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: '#0A0A0A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#0A0A0A', marginBottom: 12 },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  roleButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  roleButtonActive: { borderColor: '#8B1A1A', backgroundColor: 'rgba(27, 77, 62, 0.05)' },
  roleText: { marginLeft: 8, fontWeight: '600', color: '#6B7280' },
  roleTextActive: { color: '#8B1A1A' },
  label: { fontSize: 14, fontWeight: '600', color: '#0A0A0A', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, marginBottom: 16,
  },
  input: { flex: 1, paddingVertical: 16, paddingLeft: 12, fontSize: 16, color: '#0A0A0A' },
  button: {
    marginTop: 24, backgroundColor: '#8B1A1A', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14, color: '#6B7280' },
  link: { fontSize: 14, color: '#8B1A1A', fontWeight: '700' },
});
