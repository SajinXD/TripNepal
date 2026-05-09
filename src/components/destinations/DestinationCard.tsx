import { View, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

interface DestinationCardProps {
  destination: {
    id: string;
    name: string;
    location_district: string;
    image_url: string;
    best_season: string;
  };
  featured?: boolean;
}

export function DestinationCard({ destination, featured = false }: DestinationCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => router.push(`/destination/${destination.id}`)}
      className={`rounded-2xl overflow-hidden bg-card border border-border shadow-sm mr-4 ${featured ? 'w-72 h-80' : 'w-48 h-64'}`}
    >
      <Image 
        source={{ uri: destination.image_url }} 
        className="w-full h-full absolute"
        contentFit="cover"
        transition={300}
      />
      {/* Gradient Overlay for text readability */}
      <View className="absolute inset-0 bg-black/30" />
      
      <View className="flex-1 justify-end p-4">
        <Text className="font-display text-white text-xl mb-1" numberOfLines={2}>
          {destination.name}
        </Text>
        <View className="flex-row items-center">
          <MapPin size={14} color="#DDF1E1" />
          <Text className="font-sans text-mint text-sm ml-1">
            {destination.location_district}
          </Text>
        </View>
        <View className="mt-2 self-start bg-white/20 px-2 py-1 rounded-md backdrop-blur-md">
          <Text className="font-semibold text-xs text-white">Best: {destination.best_season}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
