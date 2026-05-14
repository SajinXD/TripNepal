import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import Groq from 'groq-sdk';
import { Bot, Send, Trash2, Navigation, Utensils, Mountain, Compass, TreePine, Camera } from 'lucide-react-native';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/lib/supabase';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  { text: "Plan a 5-day Pokhara & Annapurna trip", icon: Navigation, color: "#BC6C25" },
  { text: "EBC trek — cost, permits & itinerary", icon: Mountain, color: "#8B1A1A" },
  { text: "Best food spots in Kathmandu Thamel", icon: Utensils, color: "#0077B6" },
  { text: "Chitwan jungle safari guide", icon: TreePine, color: "#2D6A4F" },
  { text: "Poon Hill sunrise trek from Pokhara", icon: Compass, color: "#BC6C25" },
  { text: "Top photography spots in Nepal", icon: Camera, color: "#5C2D8C" },
];

const FOLLOW_UPS = [
  "What permits do I need?",
  "Recommend a local guide",
  "Best time to visit?",
  "Budget breakdown",
  "What to pack?",
  "Nearest airport?",
  "Altitude sickness tips",
  "Budget vs luxury options",
];

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SYSTEM_PROMPT = `You are a trip planning assistant.
When a user asks about a trip, always provide:
1. Day by day itinerary
2. Cost breakdown (flights, hotel, food, transport, activities)
3. Budget saving tips
4. Best time to visit
Keep answers practical and friendly.`;

// Simple markdown renderer for React Native
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      elements.push(<View key={key++} style={{ height: 6 }} />);
      continue;
    }

    // Heading (## or #)
    if (line.startsWith('## ') || line.startsWith('# ')) {
      const txt = line.replace(/^#+\s*/, '');
      elements.push(
        <Text key={key++} style={{ fontWeight: '700', fontSize: 15, color: '#1A1C1E', marginTop: 6, marginBottom: 2 }}>
          {renderInline(txt)}
        </Text>
      );
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <View key={key++} style={{ flexDirection: 'row', marginBottom: 3, paddingLeft: 4 }}>
          <Text style={{ fontSize: 14, color: '#8B1A1A', fontWeight: '700', width: 20 }}>{numberedMatch[1]}.</Text>
          <Text style={{ fontSize: 14, color: '#1A1C1E', lineHeight: 21, flex: 1 }}>{renderInline(numberedMatch[2])}</Text>
        </View>
      );
      continue;
    }

    // Bullet point
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const txt = line.replace(/^[-•]\s+/, '');
      elements.push(
        <View key={key++} style={{ flexDirection: 'row', marginBottom: 3, paddingLeft: 4 }}>
          <Text style={{ fontSize: 14, color: '#8B1A1A', fontWeight: '700', width: 16, marginTop: 1 }}>·</Text>
          <Text style={{ fontSize: 14, color: '#1A1C1E', lineHeight: 21, flex: 1 }}>{renderInline(txt)}</Text>
        </View>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={key++} style={{ fontSize: 15, color: '#1A1C1E', lineHeight: 23, marginBottom: 2 }}>
        {renderInline(line)}
      </Text>
    );
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={{ fontWeight: '700', color: '#1A1C1E' }}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
    }
    return part;
  });
}

function buildAppContext(destinations: any[], guides: any[]): string {
  if (!destinations.length && !guides.length) return '';

  let ctx = '\n\n## TRIP NEPAL APP — BOOKABLE CONTENT\nThese are the ACTUAL destinations and guides available in the Trip Nepal app right now. Always refer to these when making recommendations — users can book guides directly in the app.\n';

  if (destinations.length > 0) {
    ctx += '\n### DESTINATIONS IN THE APP\n';
    destinations.forEach(d => {
      const parts = [
        `**${d.name}**`,
        d.district ? `${d.district} district` : null,
        d.difficulty_level ? `difficulty: ${d.difficulty_level}` : null,
        d.altitude_m ? `${d.altitude_m}m elevation` : null,
        d.estimated_duration_hours ? `~${d.estimated_duration_hours}hrs` : null,
        d.entry_fee_npr ? `entry: NPR ${d.entry_fee_npr}` : null,
        d.best_season?.length ? `best in: ${d.best_season.join(', ')}` : null,
        d.category?.length ? `type: ${d.category.join('/')}` : null,
      ].filter(Boolean);
      ctx += `- ${parts.join(' | ')}\n`;
      if (d.short_description) ctx += `  ${d.short_description}\n`;
    });
  }

  if (guides.length > 0) {
    ctx += '\n### CERTIFIED GUIDES AVAILABLE TO BOOK\n';
    guides.forEach(g => {
      const name = g.profiles?.full_name || 'Guide';
      const parts = [
        `**${name}**`,
        g.years_of_experience ? `${g.years_of_experience} yrs exp` : null,
        g.specializations?.length ? `specializes: ${g.specializations.join(', ')}` : null,
        g.service_areas?.length ? `covers: ${g.service_areas.join(', ')}` : null,
        g.languages_spoken?.length ? `speaks: ${g.languages_spoken.join(', ')}` : null,
      ].filter(Boolean);
      ctx += `- ${parts.join(' | ')}\n`;
    });
    ctx += '\nWhen recommending a guide, tell users to tap "Guides" in the app to browse and book them directly.\n';
  }

  return ctx;
}

export default function AiPlanScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: `Namaste${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}! 🙏 I'm your **AI Sherpa** — your expert Nepal travel guide. I know every trail, teahouse, and temple in the Himalayas.\n\nTell me where you want to go, how many days you have, and your budget — I'll craft the perfect itinerary for you!`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [appContext, setAppContext] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function fetchAppData() {
      try {
        const [destResult, guideResult] = await Promise.all([
          supabase
            .from('destinations')
            .select('name, district, difficulty_level, altitude_m, estimated_duration_hours, entry_fee_npr, best_season, category, short_description')
            .eq('is_active', true)
            .limit(40),
          (supabase.from('guide_profiles') as any)
            .select('years_of_experience, specializations, service_areas, languages_spoken, profiles(full_name)')
            .eq('is_verified', true)
            .order('average_rating', { ascending: false })
            .limit(20),
        ]);

        const destinations = destResult.data || [];
        const guides = guideResult.data || [];
        setAppContext(buildAppContext(destinations, guides));
      } catch {
        // silently fail — base prompt still works
      }
    }
    fetchAppData();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setShowFollowUps(false);
    scrollToBottom();

    try {
      const groq = new Groq({
        apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const apiMessages = updated
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const chat = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT + appContext }, ...apiMessages],
        max_tokens: 1024,
      });

      const replyText: string = chat.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: replyText }]);
      setShowFollowUps(true);
    } catch (e: any) {
      console.error('[AI Sherpa] Groq error:', e?.message ?? e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "My connection to the mountains is a bit fuzzy right now 🏔️ Please try again in a moment!",
      }]);
    }

    setLoading(false);
    scrollToBottom();
  }

  function clearChat() {
    Alert.alert('Clear Chat', 'Start a new conversation with AI Sherpa?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: () => {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Namaste${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}! 🙏 I'm ready for a new adventure. Where would you like to explore in Nepal?`,
          }]);
          setShowFollowUps(false);
          setInput('');
        },
      },
    ]);
  }

  const isFirstMessage = messages.length === 1;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader />
      </View>

      {/* Header bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
        <View style={{ width: 36, height: 36, backgroundColor: '#C8E6C9', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <Bot size={20} color="#8B1A1A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: '#1A1C1E' }}>AI Sherpa</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 5 }} />
            <Text style={{ fontSize: 12, color: '#717973' }}>Powered by Groq · Llama 3.3</Text>
          </View>
        </View>
        {messages.length > 1 && (
          <Pressable onPress={clearChat} style={{ padding: 8 }}>
            <Trash2 size={18} color="#717973" />
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {/* Quick suggestion grid — shown only before first user message */}
        {isFirstMessage && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, color: '#717973', marginBottom: 12, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5 }}>
              TRY ASKING SHERPA
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <Pressable
                    key={i}
                    onPress={() => sendMessage(s.text)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
                      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
                    }}
                  >
                    <Icon size={14} color={s.color} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, color: '#1A1C1E', fontWeight: '500' }}>{s.text}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <View
            key={msg.id}
            style={{
              marginBottom: 16,
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              flexDirection: msg.role === 'assistant' ? 'row' : undefined,
              paddingRight: msg.role === 'assistant' ? 40 : 0,
            }}
          >
            {msg.role === 'assistant' && (
              <View style={{ width: 30, height: 30, backgroundColor: '#C8E6C9', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4, flexShrink: 0 }}>
                <Bot size={15} color="#8B1A1A" />
              </View>
            )}
            {msg.role === 'user' ? (
              <View style={{ backgroundColor: '#8B1A1A', borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '78%' }}>
                <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0', flex: 1 }}>
                {renderMarkdown(msg.content)}
              </View>
            )}
          </View>
        ))}

        {/* Typing indicator */}
        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, paddingRight: 40 }}>
            <View style={{ width: 30, height: 30, backgroundColor: '#C8E6C9', borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <Bot size={15} color="#8B1A1A" />
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#8B1A1A" />
              <Text style={{ marginLeft: 8, color: '#717973', fontSize: 13 }}>Sherpa is thinking...</Text>
            </View>
          </View>
        )}

        {/* Follow-up chips — shown after last AI message */}
        {showFollowUps && !loading && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8, marginLeft: 38, fontWeight: '600' }}>QUICK FOLLOW-UPS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 38 }}>
              {FOLLOW_UPS.map((f, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendMessage(f)}
                  style={{ backgroundColor: '#FFF0ED', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 }}
                >
                  <Text style={{ fontSize: 13, color: '#8B1A1A', fontWeight: '600' }}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Input bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, paddingBottom: insets.bottom + 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, minHeight: 50 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            style={{ flex: 1, fontSize: 15, color: '#1A1C1E', maxHeight: 100, marginRight: 8, paddingTop: 4 }}
            placeholder="Ask about treks, culture, food, budget..."
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            editable={!loading}
            multiline
          />
          {input.trim() ? (
            <Pressable
              style={{ width: 36, height: 36, backgroundColor: loading ? '#E5E7EB' : '#8B1A1A', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => sendMessage(input)}
              disabled={loading}
            >
              <Send size={17} color={loading ? '#717973' : '#fff'} />
            </Pressable>
          ) : null}
        </View>
        <Text style={{ fontSize: 10, color: '#C1C8C2', textAlign: 'center', marginTop: 6 }}>
          AI Sherpa uses Groq · Llama 3.3 — responses may vary
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
