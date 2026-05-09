import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Circle, ShieldCheck, ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const PAYMENT_METHODS = [
  { id: 'esewa', name: 'eSewa', icon: 'e', color: '#60BB46' },
  { id: 'khalti', name: 'Khalti', icon: 'K', color: '#5C2D8C' },
  { id: 'imepay', name: 'IME Pay', icon: 'I', color: '#E42025' },
];

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    bookingId: string;
    guideId: string;
    amount: string;
    guideName: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const [selected, setSelected] = useState('esewa');
  const [loading, setLoading] = useState(false);

  const amount = parseFloat(params.amount || '0');

  async function handlePay() {
    if (!user || !params.bookingId) return;
    setLoading(true);

    try {
      // Simulate payment gateway call, then update booking + create transaction
      await new Promise(r => setTimeout(r, 1800)); // Simulate gateway delay

      // @ts-ignore - Supabase type inference for bookings/transactions results in never
      const { error: bError } = await (supabase
        .from('bookings') as any)
        .update({
          payment_status: 'held',
          payment_method: selected,
          payment_transaction_id: `${selected.toUpperCase()}-${Date.now()}`,
        })
        .eq('id', params.bookingId);

      if (bError) throw bError;

      // @ts-ignore
      const { error: tError } = await (supabase
        .from('transactions') as any)
        .insert({
          booking_id: params.bookingId,
          user_id: user.id,
          amount_npr: amount,
          type: 'payment',
          status: 'held',
          gateway: selected,
          gateway_transaction_id: `${selected.toUpperCase()}-${Date.now()}`,
        });

      if (tError) throw tError;

      router.replace({
        pathname: '/booking/confirm',
        params: { bookingId: params.bookingId }
      });
    } catch (err: any) {
      console.error('Payment error:', err);
      Alert.alert('Payment Failed', err.message || 'Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeScreen edges={['top', 'bottom']} bg="#F7F7F4">
      <View className="px-6 py-4 flex-row items-center border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <ChevronLeft size={24} color="#0A0A0A" />
        </TouchableOpacity>
        <Text className="font-display text-xl text-text">Payment</Text>
      </View>

      <View className="flex-1 px-6 pt-6">
        {/* Amount Card */}
        <View className="bg-primary rounded-2xl p-6 mb-8 items-center shadow-sm">
          <Text className="text-mint/80 font-semibold uppercase tracking-wider text-xs mb-1">Total to Pay</Text>
          <Text className="font-display text-white text-4xl">रू {amount.toLocaleString()}</Text>
          {params.guideName && (
            <Text className="text-white/70 text-sm mt-1">Booking with {params.guideName}</Text>
          )}
          <View className="flex-row items-center mt-3 bg-white/20 px-3 py-1.5 rounded-full border border-white/20">
            <ShieldCheck size={14} color="#DDF1E1" />
            <Text className="text-mint text-xs font-medium ml-1">Funds held in secure escrow</Text>
          </View>
        </View>

        <Text className="font-semibold text-text mb-4">Select Payment Method</Text>

        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            activeOpacity={0.7}
            onPress={() => setSelected(method.id)}
            className={`flex-row items-center p-4 rounded-xl mb-3 border ${selected === method.id ? 'bg-primary/5 border-primary' : 'bg-white border-border'}`}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: method.color + '20' }}
            >
              <Text className="font-bold text-base" style={{ color: method.color }}>{method.icon}</Text>
            </View>
            <Text className="flex-1 font-semibold text-text text-base">{method.name}</Text>
            {selected === method.id
              ? <CheckCircle2 size={24} color="#8B1A1A" />
              : <Circle size={24} color="#D1D5DB" />}
          </TouchableOpacity>
        ))}

        <View className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Text className="text-amber-700 text-xs text-center">
            💡 Payment is held in escrow and only released to the guide after your trip is completed successfully.
          </Text>
        </View>
      </View>

      <View className="p-6 bg-white border-t border-border">
        <Button onPress={handlePay} loading={loading} fullWidth size="lg">
          Pay रू {amount.toLocaleString()} via {PAYMENT_METHODS.find(m => m.id === selected)?.name}
        </Button>
      </View>
    </SafeScreen>
  );
}
