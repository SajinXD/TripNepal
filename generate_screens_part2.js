const fs = require('fs');
const path = require('path');

const writeIfDifferent = (filePath, content) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Wrote screen:', filePath);
};

writeIfDifferent(path.join(__dirname, 'app/(tourist)/home.tsx'), `import React from 'react';
import { View, Text, ScrollView, ImageBackground, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, DollarSign, Home as HomeIcon, ChevronRight, Bookmark } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { RatingPill } from '../../src/components/ui/RatingPill';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader showTripNow />
      </View>
      
      <ScrollView className="flex-1 px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        {/* Featured Trek Hero */}
        <Card noPadding className="w-full h-[200px] mb-5 overflow-hidden">
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }}
            className="w-full h-full justify-end p-4"
          >
            <LinearGradient
              colors={['transparent', 'rgba(10,20,30,0.8)']}
              className="absolute inset-0 w-full h-full"
            />
            <Text className="text-white/80 font-bodyBold text-[12px] uppercase tracking-wider mb-1 z-10">FEATURED TREK</Text>
            <Text className="text-white font-displayBold text-[24px] z-10">Annapurna Circuit</Text>
            <Text className="text-white/80 font-body text-[14px] mt-1 z-10">Experience the spiritual heart of the Himalayas through ancient villages and high passes.</Text>
          </ImageBackground>
        </Card>

        {/* Utilities Row */}
        <View className="flex-row justify-between mb-8">
          <Pressable 
            className="flex-1 mr-1.5"
            onPress={() => router.push('/converter')}
          >
            <Card className="bg-[#E6F4EA] h-[110px] justify-between relative">
              <View className="flex-row items-start justify-between">
                <DollarSign size={20} color="#1B4332" />
                <View className="bg-white/50 px-2 py-0.5 rounded-full flex-row items-center">
                  <View className="w-1.5 h-1.5 bg-primary rounded-full mr-1" />
                  <Text className="text-primary font-bodyBold text-[10px]">LIVE RATE</Text>
                </View>
              </View>
              <View>
                <Text className="font-displaySemiBold text-[16px] text-primary">NPR to USD</Text>
                <Text className="font-displayBold text-[24px] text-primary mt-1">134.12</Text>
                <Text className="font-body text-[12px] text-on-surface-variant mt-0.5">Tap for converter</Text>
              </View>
            </Card>
          </Pressable>

          <Pressable 
            className="flex-1 ml-1.5"
            onPress={() => router.push('/stays')}
          >
            <Card className="bg-[#E1F0FF] h-[110px] justify-between">
              <View className="flex-row items-start justify-between">
                <HomeIcon size={20} color="#0077B6" />
                <HomeIcon size={16} color="#0077B6" className="opacity-50" />
              </View>
              <View>
                <Text className="font-displaySemiBold text-[16px] text-secondary">Lodges</Text>
                <Text className="font-displayBold text-[24px] text-secondary mt-1">428</Text>
                <Text className="font-body text-[12px] text-on-surface-variant mt-0.5">Vacation Rentals & Stays</Text>
              </View>
            </Card>
          </Pressable>
        </View>

        {/* Popular Destinations */}
        <View className="flex-row justify-between items-end mb-4">
          <Text className="font-displaySemiBold text-[20px] text-on-surface">Popular Destinations</Text>
          <Pressable><Text className="font-bodySemibold text-[14px] text-primary">View All &gt;</Text></Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
          <Card noPadding className="w-[220px] mr-4">
            <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }} className="w-full h-[140px] justify-start items-end p-2 rounded-t-[16px] overflow-hidden">
               <RatingPill rating="4.9" />
            </ImageBackground>
            <View className="p-3 relative">
              <Text className="font-displaySemiBold text-[16px] text-on-surface">Everest Base Camp</Text>
              <View className="flex-row items-center mt-1">
                <MapPin size={12} color="#414844" />
                <Text className="font-body text-[12px] text-on-surface-variant ml-1">Khumbu, Nepal</Text>
              </View>
              <Text className="font-displaySemiBold text-[16px] text-primary mt-2">$120/day</Text>
              <Pressable className="absolute right-3 bottom-3"><Bookmark size={20} color="#717973" /></Pressable>
            </View>
          </Card>
          {/* add more cards as needed */}
        </ScrollView>

        {/* Personalized For You */}
        <View className="mb-8">
           <View className="flex-row justify-between items-end mb-4">
              <Text className="font-displaySemiBold text-[20px] text-on-surface">Personalized For You</Text>
              <Text className="font-body text-[12px] text-on-surface-variant">Based on your activity</Text>
           </View>
           
           <Card className="bg-[#FFE4D6] mb-3">
             <View className="flex-row">
                <View className="bg-white w-10 h-10 rounded-[8px] items-center justify-center mr-3">
                   <HomeIcon size={20} color="#BC6C25" /> 
                </View>
                <View className="flex-1">
                   <Text className="font-displaySemiBold text-[16px] text-on-surface">Chitwan Safari</Text>
                   <Text className="font-body text-[14px] text-on-surface-variant mt-1">Explore the dense jungles and wildlife.</Text>
                   <Pressable className="mt-2"><Text className="font-bodySemibold text-[14px] text-tertiary">Explore Deals &rarr;</Text></Pressable>
                </View>
             </View>
           </Card>

           <Card className="bg-[#DDF1E1]">
             <View className="flex-row">
                <View className="bg-white w-10 h-10 rounded-[8px] items-center justify-center mr-3">
                   <HomeIcon size={20} color="#1B4332" /> 
                </View>
                <View className="flex-1">
                   <Text className="font-displaySemiBold text-[16px] text-on-surface">Kathmandu Culture</Text>
                   <Text className="font-body text-[14px] text-on-surface-variant mt-1">Discover ancient temples and heritage.</Text>
                   <Pressable className="mt-2"><Text className="font-bodySemibold text-[14px] text-primary">Plan It Now &rarr;</Text></Pressable>
                </View>
             </View>
           </Card>
        </View>

        {/* Recent Expeditions */}
        <View className="mb-8">
           <Text className="font-displaySemiBold text-[20px] text-on-surface mb-4">Recent Expeditions</Text>
           <View className="flex-row items-center bg-white p-3 rounded-[16px]">
              <View className="w-[60px] h-[60px] rounded-[8px] bg-gray-200 mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Langtang Valley</Text>
                 <Text className="font-body text-[12px] text-on-surface-variant mt-0.5">Completed • 5 Days</Text>
              </View>
              <Text className="font-body text-[12px] text-on-surface-variant mr-2">Oct 2023</Text>
              <ChevronRight size={16} color="#717973" />
           </View>
        </View>
        
      </ScrollView>
    </View>
  );
}
`);

writeIfDifferent(path.join(__dirname, 'app/converter.tsx'), `import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ArrowUpDown, RefreshCcw, Info, Clock } from 'lucide-react-native';
import { ScreenHeader } from '../src/components/layout/ScreenHeader';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ConverterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [amount, setAmount] = useState('100.00');
  const [isNprActive, setIsNprActive] = useState(true);
  
  const handleKeypad = (key: string) => {
    // Basic mock implementation for visuals
    if (key === 'back') {
      setAmount(amount.length > 1 ? amount.slice(0, -1) : '0');
    } else {
      setAmount(amount === '0' ? key : amount + key);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader onMenuPress={() => router.back()} />
      </View>
      
      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        
        <Card className="mb-5">
          <View className="flex-row justify-between items-start mb-3">
             <View>
               <Text className="font-bodyBold text-[12px] text-on-surface-variant uppercase tracking-wider">CURRENT EXCHANGE RATE</Text>
             </View>
             <Badge label="Updated Just Now" variant="mint" icon={<RefreshCcw size={10} color="#1B4332" />} />
          </View>
          <Text className="font-displaySemiBold text-[20px] text-on-surface mb-1">1 USD = 133.45 NPR</Text>
          <Text className="font-body text-[14px] text-on-surface-variant">Market mid-point rate. May vary by provider.</Text>
        </Card>

        {/* Inputs */}
        <View className="relative mb-8">
           {/* NPR Input */}
           <Card className="border border-primary mb-2 p-5" noPadding>
              <View className="flex-row justify-between items-center mb-1">
                 <Text className="font-bodyBold text-[12px] text-primary uppercase tracking-wider">NEPALESE RUPEE</Text>
                 <Text className="font-body text-[14px] text-on-surface">🇳🇵 NPR</Text>
              </View>
              <View className="flex-row justify-between items-center">
                 <Text className="font-displayBold text-[30px] text-primary">13,345.00</Text>
                 <Text className="font-body text-[16px] text-on-surface-variant">Rs</Text>
              </View>
           </Card>

           {/* Swap Button */}
           <View className="absolute top-[45%] w-full items-center z-10">
              <Pressable 
                className="w-12 h-12 rounded-full bg-primary items-center justify-center border-4 border-surface"
                onPress={() => setIsNprActive(!isNprActive)}
              >
                 <ArrowUpDown size={20} color="#FFF" />
              </Pressable>
           </View>

           {/* USD Input */}
           <Card className="bg-surface-container-low mb-2 p-5" noPadding>
              <View className="flex-row justify-between items-center mb-1">
                 <Text className="font-bodyBold text-[12px] text-on-surface-variant uppercase tracking-wider">US DOLLAR</Text>
                 <Text className="font-body text-[14px] text-on-surface">🇺🇸 USD</Text>
              </View>
              <View className="flex-row justify-between items-center">
                 <Text className="font-displayBold text-[30px] text-outline">100.00</Text>
                 <Text className="font-body text-[16px] text-on-surface-variant">$</Text>
              </View>
           </Card>
        </View>

        {/* Keypad */}
        <View className="mb-8">
           {[['1','2','3'],['4','5','6'],['7','8','9'],['.','0','back']].map((row, i) => (
             <View key={i} className="flex-row justify-between mb-3">
               {row.map((key) => (
                 <Pressable 
                   key={key} 
                   className={\`flex-1 h-[70px] rounded-[16px] items-center justify-center mx-1.5 \${key === 'back' ? 'bg-mint' : 'bg-white'}\`}
                   style={{ shadowColor: '#1B4332', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}
                   onPress={() => handleKeypad(key)}
                 >
                   {key === 'back' ? (
                     <Text className="font-displayBold text-[24px] text-primary">⌫</Text>
                   ) : (
                     <Text className="font-displayBold text-[28px] text-primary">{key}</Text>
                   )}
                 </Pressable>
               ))}
             </View>
           ))}
        </View>

        {/* History */}
        <View className="mb-8">
           <View className="flex-row justify-between items-end mb-4">
              <Text className="font-displaySemiBold text-[20px] text-on-surface">Recent History</Text>
              <Pressable><Text className="font-bodySemibold text-[14px] text-secondary">Clear All</Text></Pressable>
           </View>
           <Card className="flex-row items-center justify-between p-4 mb-3">
              <View className="flex-row items-center">
                 <View className="w-10 h-10 bg-mint rounded-full items-center justify-center mr-3">
                    <Clock size={18} color="#1B4332" />
                 </View>
                 <View>
                    <Text className="font-displaySemiBold text-[16px] text-on-surface">50.00 USD &rarr; NPR</Text>
                    <Text className="font-body text-[14px] text-on-surface-variant">Today, 10:45 AM</Text>
                 </View>
              </View>
              <Text className="font-displaySemiBold text-[16px] text-on-surface">Rs 6,672.50</Text>
           </Card>
        </View>

        {/* Tipping Guide */}
        <Card className="bg-tertiary-container mb-12 p-5 relative overflow-hidden">
           <Text className="font-displaySemiBold text-[16px] text-on-tertiary-container mb-2 relative z-10">Tipping Guide</Text>
           <Text className="font-body text-[14px] text-white/90 leading-[20px] relative z-10">
             Standard tipping for guides in Nepal is roughly 10-15% of the total cost. Porters usually appreciate Rs 500-1000 per day.
           </Text>
           <Info size={120} color="#FFF" className="absolute right-[-20] top-[-10] opacity-10" />
        </Card>

      </ScrollView>
    </View>
  );
}
`);
