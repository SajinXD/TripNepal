import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Star, Coffee, Wifi } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface LodgeCardProps {
  lodge: {
    id: string;
    name: string;
    type: string;
    location_district: string;
    image_url: string;
    price_per_night_npr: number;
    rating?: number;
    amenities?: string[];
  };
}

export function LodgeCard({ lodge }: LodgeCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => router.push(`/stays/${lodge.id}`)}
      className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm mb-6"
    >
      <View className="h-56 relative">
        <Image 
          source={{ uri: lodge.image_url }} 
          className="w-full h-full"
          contentFit="cover"
          transition={300}
        />
        <View className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full">
          <Text className="font-semibold text-xs text-primary">{lodge.type}</Text>
        </View>
        <View className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex-row items-center">
          <Star size={12} color="#F59E0B" fill="#F59E0B" />
          <Text className="font-bold text-xs text-text ml-1">{lodge.rating || 'New'}</Text>
        </View>
      </View>

      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 pr-4">
            <Text className="font-display text-xl text-text mb-1" numberOfLines={1}>{lodge.name}</Text>
            <View className="flex-row items-center">
              <MapPin size={14} color="#6B7280" />
              <Text className="font-sans text-sm text-text-secondary ml-1">{lodge.location_district}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="font-display text-lg text-primary">रू {lodge.price_per_night_npr.toLocaleString()}</Text>
            <Text className="font-sans text-xs text-text-secondary">/ night</Text>
          </View>
        </View>

        <View className="flex-row items-center mt-3 pt-3 border-t border-border">
          <View className="flex-row items-center mr-4">
            <Wifi size={14} color="#9CA3AF" />
            <Text className="text-xs text-text-secondary ml-1">Free WiFi</Text>
          </View>
          <View className="flex-row items-center">
            <Coffee size={14} color="#9CA3AF" />
            <Text className="text-xs text-text-secondary ml-1">Breakfast Included</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
