import React from 'react';
import { View, Text, ScrollView, ImageBackground, Pressable, Linking, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Heart, Star, Wifi, Coffee, Flame, MapPin, Calendar, Users, Shield, Phone, Mail, Navigation } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LODGE_DATA: Record<string, any> = {
  'lodge-1': {
    name: 'Annapurna Serenity Villa',
    location: 'Sarangkot, Pokhara',
    price_npr: 14500,
    price_usd: 110,
    rating: 4.9,
    reviews: 84,
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    gallery: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
      'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=400',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400',
    ],
    amenities: ['wifi', 'breakfast', 'heating'],
    description: 'Perched at 1,600m with panoramic views of the Annapurna range, this luxury villa blends traditional Newari architecture with contemporary comfort. Wake up to unobstructed Himalayan sunrise views from your private balcony.',
    host: 'Deepak Shrestha',
    type: 'Villa',
    guests: 6,
    bedrooms: 3,
    phone: '+977-61-465839',
    email: 'info@annapurnaserenity.com',
    address: 'Sarangkot Hill, Pokhara-16',
    lat: 28.2319,
    lng: 83.9625,
  },
  'lodge-2': {
    name: 'Himalayan Teahouse Retreat',
    location: 'Namche Bazaar, Solukhumbu',
    price_npr: 4800,
    price_usd: 36,
    rating: 4.7,
    reviews: 213,
    image_url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800',
    gallery: [],
    amenities: ['breakfast', 'heating'],
    description: 'A classic Sherpa teahouse in the heart of Namche Bazaar at 3,440m. Ideal base camp for your Everest trek with cosy yak-wool blankets, hot dal bhat, and stunning views of Thamserku peak.',
    host: 'Lakpa Sherpa',
    type: 'Teahouse',
    guests: 2,
    bedrooms: 1,
    phone: '+977-38-540043',
    email: 'stay@himalayanteahouse.com',
    address: 'Namche Bazaar, Solukhumbu',
    lat: 27.8069,
    lng: 86.7140,
  },
  'lodge-3': {
    name: 'Lakeside Heritage Inn',
    location: 'Lakeside, Pokhara',
    price_npr: 8200,
    price_usd: 62,
    rating: 4.8,
    reviews: 156,
    image_url: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    gallery: [],
    amenities: ['wifi', 'breakfast'],
    description: 'Steps from the shores of Phewa Lake with views of the Machhapuchhre peak. A beautifully restored 1970s heritage building with antique furnishings, garden terraces, and homemade Newari breakfasts.',
    host: 'Sita Gurung',
    type: 'Boutique Hotel',
    guests: 4,
    bedrooms: 2,
    phone: '+977-61-462930',
    email: 'hello@lakesideheritage.com',
    address: 'Lakeside, Pokhara-6',
    lat: 28.2096,
    lng: 83.9570,
  },
  'lodge-4': {
    name: 'Jungle Canopy Lodge',
    location: 'Sauraha, Chitwan',
    price_npr: 11000,
    price_usd: 83,
    rating: 4.6,
    reviews: 67,
    image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    gallery: [],
    amenities: ['wifi', 'breakfast', 'heating'],
    description: 'Immersed in the buffer zone of Chitwan National Park. Fall asleep to jungle sounds, wake to birdsong. Includes jeep safari, elephant breeding center visit, and authentic Tharu cultural dinner.',
    host: 'Ram Chaudhary',
    type: 'Eco Lodge',
    guests: 4,
    bedrooms: 2,
    phone: '+977-56-580113',
    email: 'jungle@canopylodge.com',
    address: 'Sauraha, Chitwan-10',
    lat: 27.5791,
    lng: 84.4930,
  },
};

const AMENITY_ICONS: Record<string, any> = {
  wifi: { icon: Wifi, label: 'Free WiFi' },
  breakfast: { icon: Coffee, label: 'Breakfast Included' },
  heating: { icon: Flame, label: 'Room Heating' },
};

export default function StayDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lodge = LODGE_DATA[id as string];

  if (!lodge) {
    return (
      <SafeScreen edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display text-xl text-text mb-4">Stay not found</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeScreen>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Hero */}
      <View className="w-full h-[300px] relative">
        <ImageBackground source={{ uri: lodge.image_url }} className="w-full h-full">
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent']} className="w-full h-full" />
        </ImageBackground>

        {/* Back & Wishlist buttons */}
        <Pressable
          onPress={() => router.back()}
          className="absolute top-12 left-5 w-10 h-10 bg-white/90 rounded-full items-center justify-center"
          style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 }}
        >
          <ChevronLeft size={22} color="#0A0A0A" />
        </Pressable>
        <Pressable
          className="absolute top-12 right-5 w-10 h-10 bg-white/90 rounded-full items-center justify-center"
          style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 }}
        >
          <Heart size={20} color="#0A0A0A" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-5 pb-4">
          {/* Title row */}
          <View className="flex-row justify-between items-start mb-2">
            <Text className="font-display text-2xl text-text flex-1 mr-2">{lodge.name}</Text>
            <View className="items-end">
              <Text className="font-display text-primary text-xl">NPR {lodge.price_npr.toLocaleString()}</Text>
              <Text className="text-text-secondary text-xs">${lodge.price_usd} / night</Text>
            </View>
          </View>

          {/* Location + Rating */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <MapPin size={14} color="#6B7280" />
              <Text className="text-text-secondary text-sm ml-1">{lodge.location}</Text>
            </View>
            <View className="flex-row items-center">
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text className="font-semibold text-text text-sm ml-1">{lodge.rating}</Text>
              <Text className="text-text-muted text-sm ml-1">({lodge.reviews} reviews)</Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row bg-surface/60 rounded-xl p-4 mb-5 border border-border">
            <View className="flex-1 items-center">
              <Users size={18} color="#8B1A1A" />
              <Text className="font-semibold text-text text-sm mt-1">{lodge.guests}</Text>
              <Text className="text-text-muted text-xs">Guests</Text>
            </View>
            <View className="w-[1px] bg-border mx-2" />
            <View className="flex-1 items-center">
              <Calendar size={18} color="#8B1A1A" />
              <Text className="font-semibold text-text text-sm mt-1">{lodge.bedrooms}</Text>
              <Text className="text-text-muted text-xs">Bedrooms</Text>
            </View>
            <View className="w-[1px] bg-border mx-2" />
            <View className="flex-1 items-center">
              <Shield size={18} color="#8B1A1A" />
              <Text className="font-semibold text-text text-sm mt-1">Verified</Text>
              <Text className="text-text-muted text-xs">Host</Text>
            </View>
          </View>

          {/* Description */}
          <Text className="font-semibold text-text text-base mb-2">About this stay</Text>
          <Text className="font-sans text-text-secondary text-sm leading-relaxed mb-5">{lodge.description}</Text>

          {/* Amenities */}
          <Text className="font-semibold text-text text-base mb-3">What's included</Text>
          <View className="flex-row flex-wrap mb-6">
            {lodge.amenities.map((a: string) => {
              const meta = AMENITY_ICONS[a];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <View key={a} className="flex-row items-center bg-surface border border-border rounded-lg px-3 py-2 mr-3 mb-3">
                  <Icon size={16} color="#8B1A1A" />
                  <Text className="font-medium text-text text-sm ml-2">{meta.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Host */}
          <View className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8">
            <Text className="font-semibold text-text mb-1">Hosted by {lodge.host}</Text>
            <Text className="text-text-secondary text-sm">Superhost · Responds within 1 hour</Text>
          </View>
        </View>
      </ScrollView>

      {/* Contact Info Card */}
      <View className="px-6 pb-6 bg-white border-t border-border">
        <Text className="font-semibold text-text text-base mt-5 mb-3">Contact & Directions</Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => Linking.openURL(`tel:${lodge.phone}`)}
          className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-3 mb-3"
        >
          <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
            <Phone size={16} color="#8B1A1A" />
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-xs mb-0.5">Phone</Text>
            <Text className="font-semibold text-primary text-sm">{lodge.phone}</Text>
          </View>
          <Text className="text-primary text-xs font-semibold">Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => Linking.openURL(`mailto:${lodge.email}`)}
          className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-3 mb-3"
        >
          <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
            <Mail size={16} color="#8B1A1A" />
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-xs mb-0.5">Email</Text>
            <Text className="font-semibold text-primary text-sm">{lodge.email}</Text>
          </View>
          <Text className="text-primary text-xs font-semibold">Send</Text>
        </TouchableOpacity>

        <View className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-3 mb-4">
          <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
            <MapPin size={16} color="#8B1A1A" />
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-xs mb-0.5">Address</Text>
            <Text className="font-semibold text-text text-sm">{lodge.address}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lodge.lat},${lodge.lng}`)}
          style={{ backgroundColor: '#8B1A1A', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 }}
        >
          <Navigation size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Get Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
