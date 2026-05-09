import { useEffect, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { ArrowRightLeft, DollarSign } from 'lucide-react-native';

export function CurrencyConverter() {
  const [rate, setRate] = useState<number | null>(null);
  const [usdAmount, setUsdAmount] = useState('100');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        setRate(data.rates.NPR);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Exchange rate error:', err);
        setLoading(false);
      });
  }, []);

  const nprValue = rate && usdAmount ? (parseFloat(usdAmount) * rate).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '...';

  return (
    <View className="bg-card rounded-2xl p-4 border border-border shadow-sm flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="font-semibold text-xs text-text-secondary uppercase tracking-wider mb-1">Currency Calc</Text>
        <View className="flex-row items-center border-b border-border/50 pb-1 w-20">
          <DollarSign size={16} color="#0A0A0A" />
          <TextInput
            value={usdAmount}
            onChangeText={setUsdAmount}
            keyboardType="numeric"
            className="font-display text-xl text-text p-0 m-0 w-full"
            placeholder="100"
          />
        </View>
      </View>
      
      <View className="bg-primary/10 p-2 rounded-full mx-4">
        <ArrowRightLeft size={20} color="#8B1A1A" />
      </View>

      <View className="flex-1 items-end">
        <Text className="font-semibold text-xs text-text-secondary uppercase tracking-wider mb-1">Nepali Rupee</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#8B1A1A" />
        ) : (
          <Text className="font-display text-xl text-primary">रू {nprValue}</Text>
        )}
      </View>
    </View>
  );
}
