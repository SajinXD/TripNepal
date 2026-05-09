import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using Trip Nepal ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App. These terms apply to all users, including tourists and registered guides.',
  },
  {
    title: '2. Guide Booking Policy',
    body: 'All guide bookings made through Trip Nepal are subject to guide availability and confirmation. Trip Nepal acts as a platform connecting tourists with certified local guides. All guides listed on the platform are TAAN (Trekking Agencies\' Association of Nepal) certified. Trip Nepal does not directly employ guides and is not responsible for the conduct of individual guides beyond what is outlined in the platform\'s verification process.',
  },
  {
    title: '3. Payment Terms',
    body: 'Payments made through Trip Nepal are processed securely via integrated payment gateways (eSewa, Khalti). Prices are displayed in Nepalese Rupees (NPR) and USD for reference. Trip Nepal charges a platform fee of up to 10% on each booking. All prices are inclusive of applicable taxes unless otherwise stated.',
  },
  {
    title: '4. Cancellation Policy',
    body: 'Cancellations made 48+ hours before the booking date will receive a full refund. Cancellations made 24–48 hours before receive a 50% refund. Cancellations made less than 24 hours before, or no-shows, are non-refundable. Guides may cancel bookings in exceptional circumstances such as weather, illness, or force majeure. In such cases, a full refund will be issued.',
  },
  {
    title: '5. User Conduct',
    body: 'Users must treat guides and other users with respect. Any form of harassment, discrimination, or abuse will result in immediate account suspension. Users are responsible for their own safety during treks and tours. Trip Nepal strongly recommends purchasing travel insurance that includes helicopter evacuation coverage for high-altitude treks.',
  },
  {
    title: '6. Liability Disclaimer',
    body: 'Trip Nepal is a technology platform and is not liable for personal injury, loss of property, or any other damages arising from activities booked through the App. Trekking and outdoor activities involve inherent risks. Users participate at their own risk. Trip Nepal\'s liability is limited to the amount paid for the booking in question.',
  },
  {
    title: '7. Privacy',
    body: 'Trip Nepal collects personal information including name, email, phone number, and location data to provide services. We do not sell personal data to third parties. Your data is stored securely and used solely for the purpose of improving the App and facilitating bookings. For more details, see our Privacy Policy.',
  },
  {
    title: '8. Governing Law',
    body: 'These Terms of Service are governed by and construed in accordance with the laws of Nepal. Any disputes arising from the use of Trip Nepal shall be subject to the exclusive jurisdiction of the courts of Kathmandu, Nepal.',
  },
  {
    title: '9. Changes to Terms',
    body: 'Trip Nepal reserves the right to update these Terms of Service at any time. Users will be notified of significant changes via the App. Continued use of the App after changes constitutes acceptance of the new terms.',
  },
  {
    title: '10. Contact',
    body: 'For questions about these Terms of Service, contact us at:\nEmail: tripnepal@gmail.com\nPhone: +977-9876543210\nAddress: Thamel, Kathmandu, Nepal',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }} hitSlop={8}>
          <ChevronLeft size={24} color="#1A1C1E" />
        </Pressable>
        <Text style={{ fontWeight: '700', fontSize: 20, color: '#1A1C1E' }}>Terms of Service</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 13, color: '#717973', marginBottom: 20 }}>
          Last updated: January 2025 · Trip Nepal
        </Text>

        {SECTIONS.map(s => (
          <View key={s.title} style={{ marginBottom: 20 }}>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#1A1C1E', marginBottom: 6 }}>{s.title}</Text>
            <Text style={{ fontSize: 14, color: '#414844', lineHeight: 22 }}>{s.body}</Text>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
