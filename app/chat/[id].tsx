import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send, Image as ImageIcon, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load thread header
  useEffect(() => {
    if (!id || !user) return;
    (supabase.from('chat_threads') as any)
      .select('id, tourist_id, guide_id, tourist:profiles!tourist_id(full_name, avatar_url), guide:profiles!guide_id(full_name, avatar_url)')
      .eq('id', id)
      .single()
      .then(({ data }: any) => setThread(data));
  }, [id, user]);

  const markRead = useCallback(async () => {
    if (!id || !user) return;
    await (supabase.from('chat_messages') as any)
      .update({ is_read: true })
      .eq('thread_id', id)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  }, [id, user]);

  // Load messages and subscribe
  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);

    (supabase.from('chat_messages') as any)
      .select('*')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
      .then(({ data }: any) => {
        setMessages(data || []);
        setLoading(false);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
        markRead();
      });

    const channel = supabase.channel(`chat_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages(prev => [...prev, msg]);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
          if (msg.sender_id !== user.id) {
            (supabase.from('chat_messages') as any)
              .update({ is_read: true })
              .eq('id', msg.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user, markRead]);

  const isGuide = thread?.guide_id === user?.id;
  const partner = thread ? (isGuide ? (thread.tourist as any) : (thread.guide as any)) : null;
  const partnerInitial = partner?.full_name?.[0]?.toUpperCase() || '?';
  const partnerName = partner?.full_name || (thread ? 'Unknown' : '...');

  async function sendMessage() {
    if (!input.trim() || !user || !id) return;
    const text = input.trim();
    setInput('');

    await (supabase.from('chat_messages') as any).insert({
      thread_id: id,
      sender_id: user.id,
      message: text,
    });

    await (supabase.from('chat_threads') as any)
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', id);
  }

  return (
    <SafeScreen edges={['top', 'bottom']} bg="#F7F7F4">
      {/* Header */}
      <View className="px-4 py-3 flex-row justify-between items-center bg-white border-b border-border">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="p-2 mr-1">
            <ChevronLeft size={24} color="#0A0A0A" />
          </TouchableOpacity>
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
            <Text className="font-bold text-primary">{partnerInitial}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-text text-base" numberOfLines={1}>{partnerName}</Text>
            <Text className="text-xs text-primary font-medium">
              {isGuide ? 'Tourist' : 'Guide'}
            </Text>
          </View>
        </View>
        <TouchableOpacity className="p-2">
          <MoreVertical size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 pt-4"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color="#8B1A1A" />
            </View>
          ) : messages.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Text className="text-text-secondary text-sm">No messages yet. Say hello! 👋</Text>
            </View>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              return (
                <View key={msg.id} className={`mb-4 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
                  <View className={`px-4 py-3 rounded-2xl ${isMe ? 'bg-primary rounded-tr-sm' : 'bg-white border border-border shadow-sm rounded-tl-sm'}`}>
                    <Text className={`text-base ${isMe ? 'text-white' : 'text-text'}`}>{msg.message}</Text>
                  </View>
                  <Text className={`text-[10px] text-text-muted mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      <Text className="text-[10px] text-text-muted"> · {msg.is_read ? 'Read' : 'Sent'}</Text>
                    )}
                  </Text>
                </View>
              );
            })
          )}
          <View className="h-4" />
        </ScrollView>

        {/* Input */}
        <View className="px-4 py-3 bg-white border-t border-border flex-row items-center">
          <TouchableOpacity className="p-2 mr-1">
            <ImageIcon size={22} color="#6B7280" />
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 bg-background border border-border rounded-full px-4 py-2.5 text-base text-text"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim()}
            className={`ml-2 p-3 rounded-full ${input.trim() ? 'bg-primary' : 'bg-background border border-border'}`}
          >
            <Send size={18} color={input.trim() ? '#FFF' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
