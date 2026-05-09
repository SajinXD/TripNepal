const fs = require('fs');
const path = require('path');

const writeIfDifferent = (filePath, content) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Wrote screen:', filePath);
};

// 8. Find a Guide
writeIfDifferent(path.join(__dirname, 'app/guides/index.tsx'), `import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Search, MapPin, MessageSquare, Phone, Plus } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { RatingPill } from '../../src/components/ui/RatingPill';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FindGuideScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface relative">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>
      
      <ScrollView className="flex-1 px-5 pt-5 pb-20" showsVerticalScrollIndicator={false}>
        <View className="bg-white h-12 border border-outline-variant rounded-[8px] flex-row items-center px-4 mb-4">
          <Search size={20} color="#717973" />
          <TextInput 
             className="flex-1 font-body text-[16px] text-on-surface ml-3"
             placeholder="Search guides by name or region..."
             placeholderTextColor="#9CA3AF"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-5 px-5">
           <Chip selected label="All Guides" icon={<View className="w-4 h-4" />} className="mr-2" />
           <Chip label="Annapurna" icon={<MapPin size={14} color="#717973" />} className="mr-2" />
           <Chip label="Top Rated" icon={<View className="w-4 h-4" />} className="mr-2" />
        </ScrollView>

        <View className="flex-row justify-between items-end mb-4">
           <Text className="font-displaySemiBold text-[24px] text-on-surface">Certified Guides</Text>
           <Text className="font-body text-[14px] text-on-surface-variant">142 Available</Text>
        </View>

        {/* Guide Card 1 */}
        <Card className="mb-3">
           <View className="flex-row justify-between items-start mb-3">
              <View className="flex-row">
                 <Avatar src="https://images.unsplash.com/photo-1544735716-392fe2489ffa" size={56} status="online" className="mr-3" />
                 <View>
                    <Text className="font-displaySemiBold text-[20px] text-on-surface">Pemba Dorje</Text>
                    <View className="flex-row items-center mt-1">
                       <View className="w-3 h-3 bg-tertiary rounded-full items-center justify-center mr-1">
                          {/* Fake verified icon */}
                          <View className="w-1.5 h-1.5 bg-white rounded-full" />
                       </View>
                       <Text className="font-bodyMedium text-[14px] text-tertiary">Senior Lead Guide</Text>
                    </View>
                 </View>
              </View>
              <RatingPill rating="4.9" />
           </View>
           
           <View className="flex-row mb-3">
              <View className="bg-surface-container px-2 py-1 rounded-[6px] mr-2">
                 <Text className="font-bodyBold text-[10px] text-on-surface uppercase tracking-wider">EVEREST REGION</Text>
              </View>
              <View className="bg-surface-container px-2 py-1 rounded-[6px]">
                 <Text className="font-bodyBold text-[10px] text-on-surface uppercase tracking-wider">PHOTOGRAPHY</Text>
              </View>
           </View>

           <Text className="font-body text-[14px] text-on-surface-variant leading-[20px] mb-4" numberOfLines={2}>
             Specialist in High Altitude Expedition Planning and Everest Base Camp treks with 15+ years experience.
           </Text>

           <View className="flex-row justify-between">
              <Button variant="primary" className="flex-1 mr-1.5 h-[44px]" leftIcon={<MessageSquare size={18} color="#FFF" />}>
                 Chat
              </Button>
              <Button variant="secondary" className="flex-1 ml-1.5 h-[44px]" leftIcon={<Phone size={18} color="#0077B6" />}>
                 Call
              </Button>
           </View>
        </Card>

        {/* Load More */}
        <View className="items-center mt-6 mb-8">
           <Button variant="secondary" fullWidth={false} className="w-[200px] mb-2 bg-white">
             Load More Guides
           </Button>
           <Text className="font-body text-[12px] text-on-surface-variant">Showing 4 of 142 guides</Text>
        </View>
      </ScrollView>

      {/* FAB */}
      <View className="absolute bottom-6 right-5 z-10">
         <Pressable className="bg-primary w-14 h-14 rounded-[16px] items-center justify-center shadow-lg" style={{ shadowColor: '#1B4332', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 }}>
            <Plus size={24} color="#FFF" />
         </Pressable>
      </View>
    </View>
  );
}
`);

// 9. Guide Dashboard
writeIfDifferent(path.join(__dirname, 'app/(guide)/dashboard.tsx'), `import React from 'react';
import { View, Text, ScrollView, ImageBackground, Pressable } from 'react-native';
import { Star, Calendar as CalendarIcon, MessageSquare, CloudRain } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Avatar } from '../../src/components/ui/Avatar';
import { Button } from '../../src/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GuideDashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>
      
      <ScrollView className="flex-1 px-5 pt-5 pb-10" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="bg-primary rounded-[16px] p-5 mb-5 relative overflow-hidden">
           <Text className="font-displayBold text-[24px] text-white mb-1">Namaste, Tashi</Text>
           <Text className="font-body text-[14px] text-white/80 leading-[20px] pr-10 mb-5">
             The Annapurna circuit is clear today. You have 3 new trek requests waiting.
           </Text>
           <Pressable className="bg-white rounded-[8px] px-4 py-2 self-start">
              <Text className="font-bodySemibold text-[14px] text-primary">Go Offline</Text>
           </Pressable>
        </View>

        {/* Stats */}
        <Card className="mb-3 items-center py-6">
           <View className="w-12 h-12 bg-sand/20 rounded-full items-center justify-center mb-2">
              <Star size={24} color="#F4A261" fill="#F4A261" />
           </View>
           <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">RATING</Text>
           <Text className="font-displayBold text-[36px] text-on-surface">4.98</Text>
           <Text className="font-bodyMedium text-[12px] text-[#22C55E]">+0.02 this month</Text>
        </Card>
        
        <Card className="mb-8 items-center py-6">
           <View className="w-12 h-12 bg-mint/50 rounded-full items-center justify-center mb-2">
              <View className="w-5 h-5 bg-primary rounded-[4px]" />
           </View>
           <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">EARNINGS</Text>
           <Text className="font-displayBold text-[36px] text-on-surface">₹84.2k</Text>
           <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 bg-[#22C55E] rounded-full mr-1" />
              <Text className="font-bodyMedium text-[12px] text-on-surface-variant">Verified Payout</Text>
           </View>
        </Card>

        {/* Requests */}
        <View className="flex-row justify-between items-center mb-4">
           <View className="flex-row items-center">
              <Text className="font-displaySemiBold text-[20px] text-on-surface mr-3">New Requests</Text>
              <Badge label="3 Pending" variant="terracotta" />
           </View>
           <Pressable><Text className="font-bodySemibold text-[14px] text-primary">View All</Text></Pressable>
        </View>

        <Card noPadding className="mb-8 p-4">
           <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }} className="w-full h-[120px] rounded-[16px] overflow-hidden mb-3" />
           
           <View className="flex-row justify-between items-start mb-1">
              <Text className="font-displaySemiBold text-[16px] text-on-surface flex-1">Annapurna Base Camp</Text>
              <Text className="font-displaySemiBold text-[16px] text-primary">₹45k</Text>
           </View>

           <View className="flex-row items-center mb-2">
              <CalendarIcon size={12} color="#717973" />
              <Text className="font-body text-[12px] text-on-surface-variant ml-1">Oct 12 - Oct 22 (10 Days)</Text>
           </View>
           
           <View className="flex-row items-center mb-4">
              <Avatar size={20} src="https://images.unsplash.com/photo-1544735716-392fe2489ffa" />
              <Avatar size={20} src="https://images.unsplash.com/photo-1544735716-392fe2489ffa" className="-ml-2" />
              <Text className="font-body text-[12px] text-on-surface-variant ml-2">2 Travelers • Group Trek</Text>
           </View>

           <View className="flex-row justify-between">
              <Button variant="primary" className="flex-1 mr-1.5 h-[44px]">Accept Request</Button>
              <Button variant="secondary" className="w-[100px] ml-1.5 h-[44px] bg-white border-outline-variant" textClassName="text-on-surface-variant">Decline</Button>
           </View>
        </Card>

        {/* Schedule */}
        <Text className="font-displaySemiBold text-[20px] text-on-surface mb-4">Upcoming Schedule</Text>
        <Card className="mb-8">
           <View className="flex-row justify-between items-center mb-4">
              <Text className="font-body text-[14px] text-on-surface">September 2024</Text>
              <View className="flex-row">
                 <Text className="mr-3 font-bodyBold text-on-surface-variant">&lt;</Text>
                 <Text className="font-bodyBold text-on-surface-variant">&gt;</Text>
              </View>
           </View>
           
           <View className="flex-row mb-6">
              <View className="w-[50px] items-center mr-2">
                 <Text className="font-displaySemiBold text-[24px] text-on-surface">18</Text>
                 <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider">SEP</Text>
              </View>
              <View className="flex-1">
                 <Text className="font-displaySemiBold text-[16px] text-on-surface mb-0.5">Everest Base Camp - Private</Text>
                 <Text className="font-body text-[12px] text-on-surface-variant">14 Days Expedition • 4 Clients</Text>
              </View>
              <View className="bg-[#DDF1E1] px-2 py-1 rounded-[6px] self-start mt-1">
                 <Text className="font-bodyBold text-[10px] text-primary uppercase tracking-wider">ACTIVE</Text>
              </View>
           </View>
        </Card>

        {/* Performance */}
        <Text className="font-displaySemiBold text-[16px] text-on-surface mb-4">Guide Performance</Text>
        <View className="mb-4">
           <View className="flex-row justify-between items-center mb-1">
              <Text className="font-bodyBold text-[10px] text-on-surface-variant uppercase tracking-wider">RESPONSE RATE</Text>
              <Text className="font-bodyBold text-[12px] text-primary">98%</Text>
           </View>
           <View className="w-full h-1.5 bg-surface-container-highest rounded-full">
              <View className="w-[98%] h-full bg-primary rounded-full" />
           </View>
        </View>

      </ScrollView>
    </View>
  );
}
`);

// 10. Stays / Find Lodge
writeIfDifferent(path.join(__dirname, 'app/stays/index.tsx'), `import React from 'react';
import { View, Text, ScrollView, ImageBackground, Pressable, TextInput } from 'react-native';
import { Search, Heart, Wifi, Coffee, Flame } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Chip } from '../../src/components/ui/Chip';
import { Button } from '../../src/components/ui/Button';
import { RatingPill } from '../../src/components/ui/RatingPill';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StaysScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader showBell />
      </View>
      
      <ScrollView className="flex-1 px-5 pt-5 pb-10" showsVerticalScrollIndicator={false}>
        <View className="bg-white h-12 border border-outline-variant rounded-[8px] flex-row items-center px-4 mb-4">
          <Search size={20} color="#717973" />
          <TextInput 
             className="flex-1 font-body text-[16px] text-on-surface ml-3"
             placeholder="Search mountain lodges, cabins..."
             placeholderTextColor="#9CA3AF"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-5 px-5">
           <Chip selected label="Filters" className="mr-2" />
           <Chip label="Lodge" className="mr-2" />
           <Chip label="Luxury Villa" className="mr-2" />
        </ScrollView>

        <Card noPadding className="w-full h-[200px] mb-4 overflow-hidden">
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }}
            className="w-full h-full justify-end p-4"
          >
            <LinearGradient colors={['transparent', 'rgba(10,20,30,0.8)']} className="absolute inset-0 w-full h-full" />
            <View className="bg-white/20 self-start px-2 py-1 rounded-[6px] mb-2 z-10">
               <Text className="text-white font-bodyBold text-[10px] uppercase tracking-wider">FEATURED PROPERTY</Text>
            </View>
            <Text className="text-white font-displayBold text-[24px] z-10">Annapurna Serenity Villa</Text>
            <Text className="text-white/80 font-body text-[14px] mt-1 z-10">Sarangkot, Pokhara</Text>
          </ImageBackground>
        </Card>

        {/* Rental Insight */}
        <Card className="bg-primary mb-4 p-5">
           <Text className="font-displaySemiBold text-[16px] text-mint mb-1">Rental Insight</Text>
           <Text className="font-body text-[14px] text-white leading-[20px] mb-3">
             Rental demand for mountain lodges in Pokhara is up 15% this season. Plan your stay early for the best rates. Explore seasonal rental trends.
           </Text>
           <Pressable><Text className="font-bodySemibold text-[14px] text-mint">View Report &rarr;</Text></Pressable>
        </Card>

        <View className="flex-row justify-between items-end mb-4">
           <Text className="font-displaySemiBold text-[24px] text-on-surface">Find your perfect stay</Text>
           <Pressable><Text className="font-bodySemibold text-[14px] text-primary">View All</Text></Pressable>
        </View>

        <Card noPadding className="mb-8 p-4">
           <View className="relative mb-3">
              <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa' }} className="w-full h-[180px] rounded-[16px] overflow-hidden justify-between p-3">
                 <View className="items-end">
                    <View className="w-8 h-8 bg-white/80 rounded-full items-center justify-center">
                       <Heart size={16} color="#717973" />
                    </View>
                 </View>
                 <View className="flex-row justify-between items-end">
                    <View className="bg-mint px-2 py-1 rounded-[6px]">
                       <Text className="font-bodyBold text-[10px] text-primary uppercase tracking-wider">VERIFIED</Text>
                    </View>
                    <RatingPill rating="4.9" />
                 </View>
              </ImageBackground>
           </View>
           
           <View className="flex-row justify-between items-start mb-1">
              <Text className="font-displaySemiBold text-[16px] text-on-surface flex-1">Highlander Lodge</Text>
              <View className="items-end">
                 <Text className="font-displaySemiBold text-[16px] text-secondary">NPR 14,500</Text>
                 <Text className="font-body text-[12px] text-on-surface-variant">$110 / night</Text>
              </View>
           </View>

           <Text className="font-body text-[14px] text-on-surface-variant mb-3">Pokhara, Nepal</Text>
           
           <View className="flex-row items-center mb-4 border-t border-outline-variant pt-3">
              <View className="flex-row items-center mr-4">
                 <Wifi size={14} color="#717973" />
                 <Text className="font-body text-[12px] text-on-surface-variant ml-1">WiFi</Text>
              </View>
              <View className="w-[1px] h-[12px] bg-outline-variant mr-4" />
              <View className="flex-row items-center mr-4">
                 <Coffee size={14} color="#717973" />
                 <Text className="font-body text-[12px] text-on-surface-variant ml-1">Breakfast</Text>
              </View>
              <View className="w-[1px] h-[12px] bg-outline-variant mr-4" />
              <View className="flex-row items-center">
                 <Flame size={14} color="#717973" />
                 <Text className="font-body text-[12px] text-on-surface-variant ml-1">Heating</Text>
              </View>
           </View>

           <Button variant="primary" className="w-full">Check Availability</Button>
        </Card>

      </ScrollView>
    </View>
  );
}
`);
