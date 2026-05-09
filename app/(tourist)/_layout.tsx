import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../src/components/layout/BottomTabBar';

export default function TouristLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="ai-plan" options={{ title: 'AI Plan' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Trips' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
