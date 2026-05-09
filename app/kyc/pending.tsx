import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { Clock } from 'lucide-react-native';

export default function KYCPending() {
  const router = useRouter();

  return (
    <SafeScreen edges={['top', 'bottom']} bg="#F7F7F4">
      <View className="flex-1 items-center justify-center px-6">
        <View className="bg-white p-6 rounded-full mb-6 border-4 border-warning/20">
          <Clock size={48} color="#F59E0B" />
        </View>
        
        <Text className="font-display text-3xl text-text text-center mb-3">Under Review</Text>
        <Text className="font-sans text-base text-text-secondary text-center mb-8">
          Your documents have been securely submitted. Our team will verify your NTB license within 24-48 hours.
        </Text>

        <View className="bg-white rounded-2xl p-5 w-full border border-border shadow-sm mb-8">
          <View className="flex-row items-center justify-between mb-3 border-b border-border pb-3">
            <Text className="font-semibold text-text">Status</Text>
            <View className="bg-warning/20 px-3 py-1 rounded-full">
              <Text className="text-warning font-bold text-xs">PENDING</Text>
            </View>
          </View>
          <Text className="text-sm text-text-secondary">We will send you a push notification once your profile is approved and live.</Text>
        </View>

        <Button onPress={() => router.replace('/(guide)/dashboard')} fullWidth variant="outline">
          Go to Dashboard
        </Button>
      </View>
    </SafeScreen>
  );
}
