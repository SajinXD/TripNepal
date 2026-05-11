import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { Upload, FileCheck, ChevronLeft, User, Shield, Briefcase } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { pickAndUploadImage } from '@/lib/image-picker';

const STEPS = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Documents', icon: Shield },
  { id: 3, label: 'Services', icon: Briefcase },
];

export default function KYCWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Personal details
  const [fullNameLegal, setFullNameLegal] = useState('');
  const [citizenshipNumber, setCitizenshipNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');

  // Step 2 — Documents (real upload integration)
  const [citizenshipPath, setCitizenshipPath] = useState<string | null>(null);
  const [licensePath, setLicensePath] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  async function handleDocUpload(type: 'citizenship' | 'license') {
    if (!user) return;
    setUploadingDoc(type);
    
    // Upload to kyc-documents bucket
    const path = await pickAndUploadImage('kyc-documents', user.id);
    
    if (path) {
      if (type === 'citizenship') setCitizenshipPath(path);
      else setLicensePath(path);
      Alert.alert('Success', 'Document uploaded successfully!');
    }
    setUploadingDoc(null);
  }

  // Step 3 — Service setup
  const [dailyRate, setDailyRate] = useState('');
  const [languages, setLanguages] = useState('English, Nepali');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const SPECIALIZATIONS = [
    { key: 'trekking', label: '🥾 Trekking', rate: '4,000–6,000' },
    { key: 'cultural', label: '🏛️ Cultural', rate: '2,500–3,500' },
    { key: 'adventure', label: '🪂 Adventure', rate: '4,000–7,000' },
    { key: 'wildlife', label: '🐘 Wildlife', rate: '3,000–5,000' },
    { key: 'spiritual', label: '🙏 Spiritual', rate: '2,500–3,500' },
    { key: 'photography', label: '📷 Photography', rate: '3,500–5,000' },
    { key: 'sightseeing', label: '🗺️ Sightseeing', rate: '2,000–3,500' },
    { key: 'food', label: '🍜 Food Tour', rate: '2,000–3,000' },
  ];

  const SERVICE_AREAS = [
    'Kathmandu', 'Pokhara', 'Chitwan', 'Solukhumbu (Everest)',
    'Kaski (Annapurna)', 'Mustang', 'Langtang', 'Manaslu',
    'Ilam', 'Bardiya', 'Lumbini', 'Bandipur',
  ];

  function toggleSpecialization(key: string) {
    setSelectedSpecializations(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  }

  function toggleArea(area: string) {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  }

  function suggestedRate(): string {
    if (selectedSpecializations.includes('trekking') && selectedAreas.some(a => a.includes('Everest') || a.includes('Manaslu'))) return '5,000–7,000';
    if (selectedSpecializations.includes('trekking') || selectedSpecializations.includes('adventure')) return '4,000–6,000';
    if (selectedSpecializations.includes('wildlife')) return '3,000–5,000';
    if (selectedSpecializations.includes('cultural') || selectedSpecializations.includes('spiritual')) return '2,500–3,500';
    if (selectedSpecializations.includes('sightseeing') || selectedSpecializations.includes('food')) return '2,000–3,000';
    return '3,000–5,000';
  }

  function validateStep(): boolean {
    if (step === 1) {
      if (!fullNameLegal.trim() || !citizenshipNumber.trim() || !dateOfBirth.trim() || !permanentAddress.trim()) {
        Alert.alert('Required Fields', 'Please fill in all required fields.');
        return false;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        Alert.alert('Invalid Date', 'Date of birth must be in YYYY-MM-DD format.');
        return false;
      }
      if (phone.trim() && !/^(\+977)?[0-9]{9,10}$/.test(phone.replace(/\s/g, ''))) {
        Alert.alert('Invalid Phone', 'Please enter a valid Nepal phone number.');
        return false;
      }
    }
    if (step === 2) {
      if (!citizenshipPath || !licensePath) {
        Alert.alert('Upload Required', 'Please upload both required documents.');
        return false;
      }
    }
    if (step === 3) {
      if (!dailyRate || isNaN(Number(dailyRate)) || Number(dailyRate) <= 0) {
        Alert.alert('Invalid Rate', 'Please enter a valid daily rate in NPR.');
        return false;
      }
      if (selectedSpecializations.length === 0) {
        Alert.alert('Select Specializations', 'Please select at least one service type.');
        return false;
      }
      if (selectedAreas.length === 0) {
        Alert.alert('Select Service Areas', 'Please select at least one area you serve.');
        return false;
      }
    }
    return true;
  }

  async function submitKYC() {
    if (!user) return;
    setLoading(true);

    // Best-effort: save what we can, then always navigate to pending screen.
    try {
      await (supabase.from('guide_profiles') as any)
        .upsert({
          id: user.id,
          price_per_day: dailyRate ? parseFloat(dailyRate) : undefined,
          languages_spoken: languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean),
          guide_license_number: licenseNumber.trim() || null,
          bio_long: bio.trim() || null,
          specializations: selectedSpecializations.length ? selectedSpecializations : undefined,
          service_areas: selectedAreas.length ? selectedAreas.map(a => a.toLowerCase().split(' ')[0]) : undefined,
        }, { onConflict: 'id' });

      await (supabase.from('kyc_verifications') as any)
        .upsert({
          user_id: user.id,
          status: 'pending',
          full_name_legal: fullNameLegal.trim() || 'Unknown',
          date_of_birth: dateOfBirth || '1990-01-01',
          permanent_address: permanentAddress.trim() || 'Nepal',
          citizenship_number: citizenshipNumber.trim() || null,
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (phone.trim()) {
        await (supabase.from('profiles') as any).update({ phone: phone.trim() }).eq('id', user.id);
      }
    } catch (e) {
      console.warn('KYC profile save error (non-fatal):', e);
    }

    // Always go to pending — you approve manually in the DB (is_verified = true)
    router.replace('/kyc/pending');
  }

  function handleNext() {
    if (!validateStep()) return;
    if (step < 3) {
      setStep(step + 1);
    } else {
      submitKYC();
    }
  }

  return (
    <SafeScreen edges={['top', 'bottom']} bg="#F7F7F4">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-border">
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} className="p-1">
          <ChevronLeft size={24} color="#0A0A0A" />
        </TouchableOpacity>
        <Text className="font-display text-lg text-text">Guide Verification</Text>
        <Text className="font-semibold text-text-secondary text-sm">{step}/3</Text>
      </View>

      {/* Step indicator */}
      <View className="flex-row px-6 py-4 bg-white border-b border-border">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <View key={s.id} className="flex-1 items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${isDone ? 'bg-primary' : isActive ? 'bg-primary/10 border-2 border-primary' : 'bg-border'}`}>
                {isDone
                  ? <FileCheck size={18} color="#fff" />
                  : <Icon size={18} color={isActive ? '#8B1A1A' : '#9CA3AF'} />}
              </View>
              <Text className={`text-xs font-semibold ${isActive ? 'text-primary' : isDone ? 'text-text' : 'text-text-muted'}`}>{s.label}</Text>
              {i < STEPS.length - 1 && (
                <View className={`absolute right-0 top-5 w-full h-[2px] ${isDone ? 'bg-primary' : 'bg-border'}`} style={{ left: '50%' }} />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── STEP 1: Personal Details ── */}
        {step === 1 && (
          <View>
            <Text className="font-display text-2xl text-text mb-1">Personal Details</Text>
            <Text className="text-text-secondary text-sm mb-6">Enter your details exactly as they appear on your Citizenship card.</Text>

            <Text className="font-semibold text-sm text-text mb-2">Full Legal Name *</Text>
            <TextInput
              value={fullNameLegal}
              onChangeText={setFullNameLegal}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
              placeholder="As on citizenship card"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="font-semibold text-sm text-text mb-2">Citizenship Number *</Text>
            <TextInput
              value={citizenshipNumber}
              onChangeText={setCitizenshipNumber}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
              placeholder="e.g. 12-34-56-78901"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="font-semibold text-sm text-text mb-2">Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
              placeholder="e.g. 9801234567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text className="font-semibold text-sm text-text mb-2">Date of Birth *</Text>
            <TextInput
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />

            <Text className="font-semibold text-sm text-text mb-2">Permanent Address *</Text>
            <TextInput
              value={permanentAddress}
              onChangeText={setPermanentAddress}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-8 text-text"
              placeholder="e.g. Lakeside-6, Pokhara, Kaski"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>
        )}

        {/* ── STEP 2: Upload Documents ── */}
        {step === 2 && (
          <View>
            <Text className="font-display text-2xl text-text mb-1">Upload Documents</Text>
            <Text className="text-text-secondary text-sm mb-6">
              We need your Citizenship card (front & back) and your Nepal Tourism Board License.
            </Text>
            <TouchableOpacity
              onPress={() => handleDocUpload('citizenship')}
              disabled={uploadingDoc !== null}
              className={`border-2 border-dashed rounded-2xl p-6 items-center mb-4 ${citizenshipPath ? 'bg-primary/5 border-primary' : 'bg-white border-primary/30'}`}
            >
              {uploadingDoc === 'citizenship' ? (
                <ActivityIndicator color="#8B1A1A" size="large" />
              ) : citizenshipPath ? (
                <FileCheck size={32} color="#8B1A1A" />
              ) : (
                <Upload size={32} color="#8B1A1A" />
              )}
              <Text className={`font-semibold mt-2 ${citizenshipPath ? 'text-primary' : 'text-primary/70'}`}>
                {citizenshipPath ? 'Citizenship Uploaded ✓' : 'Upload Citizenship (Front/Back)'}
              </Text>
              {!citizenshipPath && (
                <Text className="text-text-muted text-xs mt-1">JPG, PNG or PDF · Max 5MB</Text>
              )}
            </TouchableOpacity>
 
            <TouchableOpacity
              onPress={() => handleDocUpload('license')}
              disabled={uploadingDoc !== null}
              className={`border-2 border-dashed rounded-2xl p-6 items-center mb-8 ${licensePath ? 'bg-primary/5 border-primary' : 'bg-white border-primary/30'}`}
            >
              {uploadingDoc === 'license' ? (
                <ActivityIndicator color="#8B1A1A" size="large" />
              ) : licensePath ? (
                <FileCheck size={32} color="#8B1A1A" />
              ) : (
                <Upload size={32} color="#8B1A1A" />
              )}
              <Text className={`font-semibold mt-2 ${licensePath ? 'text-primary' : 'text-primary/70'}`}>
                {licensePath ? 'NTB License Uploaded ✓' : 'Upload NTB Guide License'}
              </Text>
              {!licensePath && (
                <Text className="text-text-muted text-xs mt-1">JPG, PNG or PDF · Max 5MB</Text>
              )}
            </TouchableOpacity>

            <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex-row">
              <Text className="text-amber-700 text-sm flex-1">
                📋 Documents are encrypted and stored securely. They are only used for identity verification and will not be shared publicly.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 3: Service Setup ── */}
        {step === 3 && (
          <View>
            <Text className="font-display text-2xl text-text mb-1">Service Setup</Text>
            <Text className="text-text-secondary text-sm mb-6">Help tourists discover and book you by setting up your guide profile.</Text>

            {/* Specializations */}
            <Text className="font-semibold text-sm text-text mb-3">Your Specializations * <Text className="text-text-muted font-normal">(select all that apply)</Text></Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {SPECIALIZATIONS.map(s => {
                const active = selectedSpecializations.includes(s.key);
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => toggleSpecialization(s.key)}
                    className={`px-3 py-2 rounded-xl border ${active ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                  >
                    <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-text'}`}>{s.label}</Text>
                    <Text className={`text-[10px] mt-0.5 ${active ? 'text-white/80' : 'text-text-muted'}`}>NPR {s.rate}/day</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Service Areas */}
            <Text className="font-semibold text-sm text-text mb-3">Areas You Serve * <Text className="text-text-muted font-normal">(select all districts)</Text></Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {SERVICE_AREAS.map(area => {
                const active = selectedAreas.includes(area);
                return (
                  <TouchableOpacity
                    key={area}
                    onPress={() => toggleArea(area)}
                    className={`px-3 py-2 rounded-full border ${active ? 'bg-primary/10 border-primary' : 'bg-white border-border'}`}
                  >
                    <Text className={`text-sm font-medium ${active ? 'text-primary' : 'text-text'}`}>{area}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Smart rate suggestion */}
            {selectedSpecializations.length > 0 && (
              <View className="bg-mint/30 border border-mint rounded-xl p-4 mb-4">
                <Text className="font-semibold text-text text-sm mb-1">💡 Suggested Rate for Your Profile</Text>
                <Text className="text-primary font-bold text-xl">NPR {suggestedRate()}/day</Text>
                <Text className="text-text-secondary text-xs mt-1">Based on your specializations and service areas. You can adjust below.</Text>
              </View>
            )}

            <Text className="font-semibold text-sm text-text mb-2">Your Daily Rate (NPR) *</Text>
            <TextInput
              value={dailyRate}
              onChangeText={setDailyRate}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
              placeholder={selectedSpecializations.length > 0 ? `Suggested: ${suggestedRate().split('–')[0].trim()}` : "e.g. 3500"}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="font-semibold text-sm text-text mb-2">Languages Spoken *</Text>
            <TextInput
              value={languages}
              onChangeText={setLanguages}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
              placeholder="English, Nepali, Hindi"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="font-semibold text-sm text-text mb-2">NTB License Number (Optional)</Text>
            <TextInput
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
              placeholder="e.g. NTB-2024-12345"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="font-semibold text-sm text-text mb-2">Guide Bio (Optional)</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              className="bg-white border border-border rounded-xl px-4 py-3 mb-8 text-text"
              placeholder="Share your trekking experience, specializations, and why tourists should choose you..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>
        )}

      </ScrollView>

      <View className="p-6 bg-white border-t border-border">
        <Button onPress={handleNext} loading={loading} fullWidth size="lg">
          {step < 3 ? 'Continue' : 'Submit for Verification'}
        </Button>
      </View>
    </SafeScreen>
  );
}
