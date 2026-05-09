import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowUpDown, RefreshCcw, Info, Clock } from 'lucide-react-native';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type HistoryEntry = { from: string; to: string; result: string; time: string };

export default function ConverterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [rate, setRate] = useState<number | null>(null);
  const [rateUpdated, setRateUpdated] = useState<string | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [amount, setAmount] = useState('100');
  const [isNprToUsd, setIsNprToUsd] = useState(false); // false = USD → NPR
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetchRate();
  }, []);

  async function fetchRate() {
    setLoadingRate(true);
    try {
      const key = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;
      const url = key
        ? `https://v6.exchangerate-api.com/v6/${key}/latest/USD`
        : 'https://open.er-api.com/v6/latest/USD';
      const res = await fetch(url);
      const json = await res.json();
      const npr = json?.conversion_rates?.NPR ?? json?.rates?.NPR;
      if (npr) {
        setRate(Number(npr));
        setRateUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      setRate(133.45); // fallback
    }
    setLoadingRate(false);
  }

  function handleKeypad(key: string) {
    if (key === 'back') {
      setAmount(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (key === '.') {
      if (!amount.includes('.')) setAmount(prev => prev + '.');
    } else {
      setAmount(prev => (prev === '0' ? key : prev + key));
    }
  }

  function handleSwap() {
    if (!rate) return;
    // Push current conversion to history before swapping
    const converted = getConverted();
    if (converted && amount !== '0' && amount !== '') {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setHistory(prev => [
        { from: `${amount} ${isNprToUsd ? 'NPR' : 'USD'}`, to: isNprToUsd ? 'USD' : 'NPR', result: converted, time: now },
        ...prev.slice(0, 4),
      ]);
    }
    setIsNprToUsd(prev => !prev);
  }

  function getConverted(): string {
    if (!rate) return '...';
    const val = parseFloat(amount) || 0;
    if (isNprToUsd) {
      return (val / rate).toFixed(2);
    } else {
      return (val * rate).toFixed(2);
    }
  }

  const converted = getConverted();
  const topLabel = isNprToUsd ? 'NEPALESE RUPEE' : 'US DOLLAR';
  const topFlag = isNprToUsd ? '🇳🇵 NPR' : '🇺🇸 USD';
  const topSymbol = isNprToUsd ? 'Rs' : '$';
  const bottomLabel = isNprToUsd ? 'US DOLLAR' : 'NEPALESE RUPEE';
  const bottomFlag = isNprToUsd ? '🇺🇸 USD' : '🇳🇵 NPR';
  const bottomSymbol = isNprToUsd ? '$' : 'Rs';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader onMenuPress={() => router.back()} />
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} showsVerticalScrollIndicator={false}>

        {/* Rate card */}
        <Card className="mb-5">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#717973', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              CURRENT EXCHANGE RATE
            </Text>
            <Pressable onPress={fetchRate}>
              <Badge label={rateUpdated ? `Updated ${rateUpdated}` : 'Tap to refresh'} variant="mint" icon={<RefreshCcw size={10} color="#8B1A1A" />} />
            </Pressable>
          </View>
          {loadingRate ? (
            <ActivityIndicator color="#8B1A1A" />
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1C1E', marginBottom: 4 }}>
                1 USD = {rate?.toFixed(2)} NPR
              </Text>
              <Text style={{ fontSize: 13, color: '#717973' }}>Market mid-point rate. May vary by provider.</Text>
            </>
          )}
        </Card>

        {/* Converter */}
        <View style={{ marginBottom: 24 }}>
          {/* Top (input) */}
          <Card className="border border-primary mb-2 p-5" noPadding>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: 0.5 }}>{topLabel}</Text>
              <Text style={{ fontSize: 14, color: '#1A1C1E' }}>{topFlag}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#8B1A1A' }}>
                {parseFloat(amount || '0').toLocaleString()}
              </Text>
              <Text style={{ fontSize: 16, color: '#717973' }}>{topSymbol}</Text>
            </View>
          </Card>

          {/* Swap button */}
          <View style={{ alignItems: 'center', zIndex: 10, marginVertical: -2 }}>
            <Pressable
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B1A1A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#F8F9FA' }}
              onPress={handleSwap}
            >
              <ArrowUpDown size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Bottom (output) */}
          <Card className="bg-surface-container-low mb-2 p-5" noPadding>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#717973', textTransform: 'uppercase', letterSpacing: 0.5 }}>{bottomLabel}</Text>
              <Text style={{ fontSize: 14, color: '#1A1C1E' }}>{bottomFlag}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#414844' }}>
                {loadingRate ? '...' : parseFloat(converted).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 16, color: '#717973' }}>{bottomSymbol}</Text>
            </View>
          </Card>
        </View>

        {/* Keypad */}
        <View style={{ marginBottom: 24 }}>
          {[['1','2','3'],['4','5','6'],['7','8','9'],['.','0','back']].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              {row.map(key => (
                <Pressable
                  key={key}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 68,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginHorizontal: 5,
                    backgroundColor: key === 'back' ? '#C8E6C9' : '#fff',
                    opacity: pressed ? 0.7 : 1,
                    shadowColor: '#8B1A1A',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.06,
                    shadowRadius: 10,
                    elevation: 2,
                  })}
                  onPress={() => handleKeypad(key)}
                >
                  {key === 'back' ? (
                    <Text style={{ fontSize: 22, color: '#8B1A1A' }}>⌫</Text>
                  ) : (
                    <Text style={{ fontSize: 26, fontWeight: '700', color: '#8B1A1A' }}>{key}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {/* History */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1C1E' }}>Recent History</Text>
            {history.length > 0 && (
              <Pressable onPress={() => setHistory([])}>
                <Text style={{ fontSize: 13, color: '#0077B6', fontWeight: '600' }}>Clear All</Text>
              </Pressable>
            )}
          </View>

          {history.length === 0 ? (
            <Card>
              <Text style={{ fontSize: 13, color: '#717973', textAlign: 'center' }}>
                Swap currencies to save a conversion here.
              </Text>
            </Card>
          ) : (
            history.map((h, i) => (
              <Card key={i} className="flex-row items-center justify-between p-4 mb-3">
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, backgroundColor: '#C8E6C9', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Clock size={18} color="#8B1A1A" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1C1E' }}>{h.from} → {h.to}</Text>
                    <Text style={{ fontSize: 13, color: '#717973' }}>Today, {h.time}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1C1E' }}>{h.result}</Text>
              </Card>
            ))
          )}
        </View>

        {/* Tipping guide */}
        <Card className="bg-tertiary-container mb-12 p-5 relative overflow-hidden">
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 }}>Tipping Guide 🙏</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20 }}>
            Standard tip for Nepal guides: 10–15% of total cost.{'\n'}
            Porters: रू 500–1,000 per day.{'\n'}
            Hotel staff: रू 100–200 per stay.
          </Text>
          <Info size={100} color="#fff" style={{ position: 'absolute', right: -16, top: -8, opacity: 0.08 }} />
        </Card>

      </ScrollView>
    </View>
  );
}
