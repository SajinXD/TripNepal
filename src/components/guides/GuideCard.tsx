

import { Image } from 'expo-image';
import { View, Text, Pressable } from 'react-native';
import { Star, MessageSquare, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Button } from '../ui/Button';

export interface GuideCardData {
  id: string;
  fullName: string;
  avatarUrl: string;
  rating: number;
  status: 'online' | 'busy' | 'offline';
  roleTag: string; 
  specializations: string[]; 
  bio: string;
}

interface GuideCardProps {
  guide: GuideCardData;
  onChat?: (id: string) => void;
  onCall?: (id: string) => void;
}

const statusColor = {
  online: 'bg-guide-online',
  busy: 'bg-guide-busy',
  offline: 'bg-guide-offline',
};

const statusLabel = {
  online: 'Available',
  busy: 'On a Trip',
  offline: 'Offline',
};

export function GuideCard({ guide, onChat, onCall }: GuideCardProps) {
  const router = useRouter();

  const openProfile = () => {
    Haptics.selectionAsync();
    router.push(`/guides/${guide.id}`);
  };

  return (
    <Pressable
      onPress={openProfile}
      className="bg-card rounded-xl p-4 mb-3"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {}
      <View className="flex-row items-start mb-3">
        <View className="relative">
          <Image
            source={{ uri: guide.avatarUrl }}
            style={{ width: 60, height: 60, borderRadius: 30 }}
            contentFit="cover"
          />
          {}
          <View
            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${statusColor[guide.status]}`}
          />
        </View>

        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-lg text-text">{guide.fullName}</Text>
            <View className="flex-row items-center bg-mint px-2 py-0.5 rounded-md">
              <Star size={12} color="#8B1A1A" fill="#8B1A1A" />
              <Text className="font-semibold text-xs text-primary ml-1">
                {guide.rating.toFixed(1)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mt-0.5">
            <View className={`w-1.5 h-1.5 rounded-full ${statusColor[guide.status]} mr-1.5`} />
            <Text className="font-medium text-xs text-text-secondary">{guide.roleTag}</Text>
          </View>
        </View>
      </View>

      {}
      <View className="flex-row flex-wrap gap-1.5 mb-2">
        {guide.specializations.map((tag) => (
          <View key={tag} className="bg-divider px-2.5 py-1 rounded-md">
            <Text className="font-semibold text-[10px] text-text-secondary tracking-wider">
              {tag}
            </Text>
          </View>
        ))}
      </View>

      {}
      <Text className="font-sans text-sm text-text-secondary leading-5 mb-3" numberOfLines={2}>
        {guide.bio}
      </Text>

      {}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            variant="primary"
            size="md"
            leftIcon={<MessageSquare size={16} color="#fff" />}
            onPress={() => onChat?.(guide.id)}
          >
            Chat
          </Button>
        </View>
        <View className="flex-1">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Phone size={16} color="#8B1A1A" />}
            onPress={() => onCall?.(guide.id)}
          >
            Call
          </Button>
        </View>
      </View>
    </Pressable>
  );
}
