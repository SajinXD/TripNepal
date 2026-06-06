const fs = require('fs');
const path = require('path');

const writeIfDifferent = (filePath, content) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Wrote screen:', filePath);
};

writeIfDifferent(path.join(__dirname, 'app/(tourist)/explore.tsx'), `import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Search, SlidersHorizontal, Plus, Navigation, Share2, Bookmark, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../src/components/ui/Card';
import { RatingPill } from '../../src/components/ui/RatingPill';
import { DifficultyMeter } from '../../src/components/ui/DifficultyMeter';
import { Button } from '../../src/components/ui/Button';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 28.2380,
          longitude: 83.9956,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        mapType="terrain"
      >
        <Marker coordinate={{ latitude: 28.2380, longitude: 83.9956 }} />
      </MapView>

      <View style={{ paddingTop: insets.top + 10 }} className="px-5 w-full absolute top-0 z-10">
        <View className="bg-white h-12 rounded-[16px] flex-row items-center px-4 shadow-sm" style={{ shadowColor: '#1B4332', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}>
          <Search size={20} color="#717973" />
          <Text className="flex-1 font-body text-[16px] text-on-surface-variant ml-3">Search destinations, landmarks...</Text>
          <SlidersHorizontal size={20} color="#1B4332" />
        </View>
      </View>

      <View className="absolute bottom-4 left-5 right-5 z-10 flex-col items-end">
         <Pressable className="bg-white w-12 h-12 rounded-[12px] items-center justify-center mb-4" style={{ shadowColor: '#1B4332', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
            <Plus size={24} color="#191C1D" />
         </Pressable>

         <Card noPadding className="w-full rounded-t-[16px] rounded-b-[16px] overflow-hidden p-4">
            <View className="w-8 h-1 bg-outline-variant rounded-full self-center mb-4" />
            
            <View className="relative mb-4">
               <Image source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }} className="w-full h-[180px] rounded-[16px]" />
               <View className="absolute top-3 left-3">
                  <RatingPill rating="4.9" />
               </View>
            </View>

            <View className="flex-row justify-between items-start mb-4">
               <View>
                  <Text className="font-displayBold text-[24px] text-on-surface">Phewa Lake</Text>
                  <View className="flex-row items-center mt-1">
                     <MapPin size={14} color="#717973" />
                     <Text className="font-body text-[14px] text-on-surface-variant ml-1">Pokhara, Nepal</Text>
                  </View>
               </View>
               <Pressable><Bookmark size={24} color="#717973" /></Pressable>
            </View>

            <View className="flex-row mb-6">
               <View className="flex-1 border-r border-outline-variant pr-4">
                  <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">TREK DIFFICULTY</Text>
                  <DifficultyMeter level={1} label="Easy Walk" />
               </View>
               <View className="flex-1 pl-4">
                  <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">ELEVATION</Text>
                  <View className="flex-row items-baseline">
                     <Text className="font-displaySemiBold text-[20px] text-on-surface">822m</Text>
                     <Text className="font-body text-[12px] text-on-surface-variant ml-1">ASL</Text>
                  </View>
               </View>
            </View>

            <View className="flex-row">
               <Button variant="primary" className="flex-1 mr-3" leftIcon={<Navigation size={18} color="#FFF" />}>
                 Navigate
               </Button>
               <Pressable className="w-14 h-14 bg-[#E1F0FF] rounded-[12px] items-center justify-center">
                  <Share2 size={24} color="#0077B6" />
               </Pressable>
            </View>
         </Card>
      </View>
    </View>
  );
}
`);

writeIfDifferent(path.join(__dirname, 'app/(tourist)/ai-plan.tsx'), `import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Bot, Plus, Mic, Send, Navigation, Info, Utensils, Mountain } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/ui/Avatar';

export default function AiPlanScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>
      
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-8">
           <View className="w-16 h-16 bg-mint rounded-full items-center justify-center mb-4">
              <Bot size={32} color="#1B4332" />
           </View>
           <Text className="font-displayBold text-[30px] text-primary text-center mb-2">Namaste, I'm your AI Sherpa</Text>
           <Text className="font-body text-[16px] text-on-surface-variant text-center px-4">
             Ready to craft your perfect Himalayan expedition? Ask me anything about Nepal.
           </Text>
        </View>

        {/* Prompts */}
        <View className="flex-row mb-3">
           <Card className="flex-1 mr-1.5 p-4 justify-between h-[110px]">
              <Navigation size={24} color="#BC6C25" className="mb-2" />
              <View>
                 <Text className="font-displaySemiBold text-[16px] text-on-surface leading-[20px]">3-day trip to Pokhara</Text>
                 <Text className="font-body text-[12px] text-on-surface-variant mt-1">Adventure & Relaxation</Text>
              </View>
           </Card>
           <Card className="flex-1 ml-1.5 p-4 justify-between h-[110px]">
              <Info size={24} color="#0077B6" className="mb-2" />
              <View>
                 <Text className="font-displaySemiBold text-[16px] text-on-surface leading-[20px]">Heritage Walk Kathmandu</Text>
                 <Text className="font-body text-[12px] text-on-surface-variant mt-1">Culture & Spirituality</Text>
              </View>
           </Card>
        </View>

        <View className="flex-row mb-8">
           <Card className="flex-1 mr-1.5 p-4 justify-between h-[110px]">
              <Utensils size={24} color="#BC6C25" className="mb-2" />
              <View>
                 <Text className="font-displaySemiBold text-[16px] text-on-surface leading-[20px]">Best Momos in Thamel</Text>
                 <Text className="font-body text-[12px] text-on-surface-variant mt-1">Foodie Guide</Text>
              </View>
           </Card>
           <Card className="flex-1 ml-1.5 p-4 justify-between h-[110px]">
              <Mountain size={24} color="#191C1D" className="mb-2" />
              <View>
                 <Text className="font-displaySemiBold text-[16px] text-on-surface leading-[20px]">EBC Gear Checklist</Text>
                 <Text className="font-body text-[12px] text-on-surface-variant mt-1">Preparation Guide</Text>
              </View>
           </Card>
        </View>

        {/* Chat thread mock */}
        <View className="mb-6">
           <View className="items-end mb-4">
              <View className="bg-primary rounded-[16px] rounded-br-[4px] px-4 py-3 max-w-[75%]">
                 <Text className="text-white font-body text-[16px]">What is the best time to visit Annapurna Base Camp?</Text>
              </View>
           </View>
           
           <View className="flex-row items-end mb-4 pr-12">
              <View className="w-8 h-8 bg-mint rounded-full items-center justify-center mr-2 mb-1">
                 <Bot size={16} color="#1B4332" />
              </View>
              <View className="bg-surface-container rounded-[16px] rounded-bl-[4px] px-4 py-3">
                 <Text className="text-on-surface font-body text-[16px] leading-[22px]">
                   The best times are during the pre-monsoon (spring) from March to May and post-monsoon (autumn) from September to November. The weather is clear and views are spectacular!
                 </Text>
              </View>
           </View>
        </View>

      </ScrollView>

      {/* Input area */}
      <View className="px-5 py-3 bg-white border-t border-surface-container-highest">
         <View className="flex-row items-center bg-white border border-outline-variant rounded-full px-2 py-1.5 h-[52px]">
            <Pressable className="w-10 h-10 bg-mint rounded-full items-center justify-center">
               <Plus size={20} color="#1B4332" />
            </Pressable>
            <TextInput 
               className="flex-1 font-body text-[16px] text-on-surface mx-3"
               placeholder="Ask your AI Sherpa..."
               placeholderTextColor="#9CA3AF"
            />
            <Pressable className="w-10 h-10 bg-mint rounded-full items-center justify-center mr-2">
               <Mic size={20} color="#1B4332" />
            </Pressable>
            <Pressable className="w-10 h-10 bg-primary rounded-full items-center justify-center">
               <Send size={18} color="#FFF" style={{ marginLeft: -2, marginTop: 2 }} />
            </Pressable>
         </View>
      </View>
    </View>
  );
}
`);

writeIfDifferent(path.join(__dirname, 'app/(tourist)/settings.tsx'), `import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Pencil, User, Shield, Moon, Bell, DollarSign, Globe, HelpCircle, FileText, LogOut, ChevronRight } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Avatar } from '../../src/components/ui/Avatar';
import { IconTile } from '../../src/components/ui/IconTile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/welcome');
  };

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>
      
      <ScrollView className="flex-1 px-5 pt-5 pb-10" showsVerticalScrollIndicator={false}>
        <Card className="mb-8 p-5">
           <View className="flex-row items-center mb-5">
              <View className="relative mr-4">
                 <Avatar size={64} src="https://images.unsplash.com/photo-1544735716-392fe2489ffa" borderMint />
                 <View className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full items-center justify-center border border-outline-variant">
                    <Pencil size={12} color="#414844" />
                 </View>
              </View>
              <View className="flex-1">
                 <Text className="font-displayBold text-[24px] text-on-surface">Tashi Delek</Text>
                 <Text className="font-body text-[14px] text-on-surface-variant mb-2">tashi@example.com</Text>
                 <View className="self-start">
                    <Badge label="PREMIUM EXPLORER" variant="mint" />
                 </View>
              </View>
           </View>

           <View className="flex-row pt-4 border-t border-outline-variant">
              <View className="flex-1 items-center border-r border-outline-variant">
                 <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">EXPEDITIONS</Text>
                 <Text className="font-displaySemiBold text-[20px] text-on-surface">12</Text>
              </View>
              <View className="flex-1 items-center border-r border-outline-variant">
                 <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">GUIDES</Text>
                 <Text className="font-displaySemiBold text-[20px] text-on-surface">4.9</Text>
              </View>
              <View className="flex-1 items-center">
                 <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">POINTS</Text>
                 <Text className="font-displaySemiBold text-[20px] text-on-surface">2.4k</Text>
              </View>
           </View>
        </Card>

        {/* Account Settings */}
        <Text className="font-bodyBold text-[12px] text-on-surface-variant uppercase tracking-wider mb-3">ACCOUNT SETTINGS</Text>
        <Card noPadding className="mb-8">
           <Pressable className="flex-row items-center p-4 border-b border-outline-variant">
              <IconTile icon={<User size={20} color="#1B4332" />} variant="primary" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Personal Information</Text>
                 <Text className="font-body text-[14px] text-on-surface-variant">Name, Address, Citizenship</Text>
              </View>
              <ChevronRight size={20} color="#C1C8C2" />
           </Pressable>
           <Pressable className="flex-row items-center p-4">
              <IconTile icon={<Shield size={20} color="#1B4332" />} variant="primary" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Login & Security</Text>
                 <Text className="font-body text-[14px] text-on-surface-variant">Password, 2FA, Biometrics</Text>
              </View>
              <ChevronRight size={20} color="#C1C8C2" />
           </Pressable>
        </Card>

        {/* Preferences */}
        <Text className="font-bodyBold text-[12px] text-on-surface-variant uppercase tracking-wider mb-3">PREFERENCES</Text>
        <Card noPadding className="mb-8">
           <Pressable className="flex-row items-center p-4 border-b border-outline-variant">
              <IconTile icon={<Moon size={20} color="#0077B6" />} variant="preferences" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Dark Mode</Text>
                 <Text className="font-body text-[14px] text-on-surface-variant">Toggle light or dark theme</Text>
              </View>
              {/* Fake toggle switch */}
              <View className="w-12 h-6 bg-surface-container-highest rounded-full" />
           </Pressable>
           <Pressable className="flex-row items-center p-4 border-b border-outline-variant">
              <IconTile icon={<Bell size={20} color="#0077B6" />} variant="preferences" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Notifications</Text>
                 <Text className="font-body text-[14px] text-on-surface-variant">Expedition updates, Offers</Text>
              </View>
              <ChevronRight size={20} color="#C1C8C2" />
           </Pressable>
           <Pressable className="flex-row items-center p-4 border-b border-outline-variant">
              <IconTile icon={<DollarSign size={20} color="#0077B6" />} variant="preferences" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Currency</Text>
                 <Text className="font-body text-[14px] text-on-surface-variant">NPR - Nepalese Rupee</Text>
              </View>
              <ChevronRight size={20} color="#C1C8C2" />
           </Pressable>
           <Pressable className="flex-row items-center p-4">
              <IconTile icon={<Globe size={20} color="#0077B6" />} variant="preferences" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Language</Text>
                 <Text className="font-body text-[14px] text-on-surface-variant">English (US)</Text>
              </View>
              <ChevronRight size={20} color="#C1C8C2" />
           </Pressable>
        </Card>

        {/* App Info */}
        <Text className="font-bodyBold text-[12px] text-on-surface-variant uppercase tracking-wider mb-3">APP INFO</Text>
        <Card noPadding className="mb-6">
           <Pressable className="flex-row items-center p-4 border-b border-outline-variant">
              <IconTile icon={<HelpCircle size={20} color="#414844" />} variant="info" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Help & Support</Text>
              </View>
              <ChevronRight size={20} color="#C1C8C2" />
           </Pressable>
           <Pressable className="flex-row items-center p-4 border-b border-outline-variant">
              <IconTile icon={<FileText size={20} color="#414844" />} variant="info" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface">Terms of Service</Text>
              </View>
              <ChevronRight size={20} color="#C1C8C2" />
           </Pressable>
           <Pressable className="flex-row items-center p-4" onPress={handleLogout}>
              <IconTile icon={<LogOut size={20} color="#BA1A1A" />} variant="danger" className="mr-3" />
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-error">Logout</Text>
              </View>
           </Pressable>
        </Card>

        <Text className="text-center font-body text-[11px] text-on-surface-variant mb-4">Version 2.4.1 (Stable Build)</Text>
      </ScrollView>
    </View>
  );
}
`);
