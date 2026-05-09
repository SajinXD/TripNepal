import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, TouchableOpacity, Pressable,
  Dimensions, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Home, Compass, Bot, Briefcase, MapPin, DollarSign,
  Settings, LogOut, X, Users,
} from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Home',             route: '/(tourist)/home',    icon: Home },
  { label: 'Explore Map',      route: '/(tourist)/explore', icon: Compass },
  { label: 'AI Trip Planner',  route: '/(tourist)/ai-plan', icon: Bot },
  { label: 'My Bookings',      route: '/(tourist)/bookings',icon: Briefcase },
  { label: 'Find Guides',      route: '/guides',            icon: Users },
  { label: 'Stays & Lodges',   route: '/stays',             icon: MapPin },
  { label: 'Currency',         route: '/converter',         icon: DollarSign },
];

export function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isOpen ? 0 : -DRAWER_WIDTH,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isOpen ? 1 : 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  function navigate(route: string) {
    onClose();
    setTimeout(() => router.push(route as any), 280);
  }

  async function handleLogout() {
    onClose();
    setTimeout(async () => {
      await supabase.auth.signOut();
      useAuthStore.getState().setAuth(null, null);
      router.replace('/welcome');
    }, 280);
  }

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)', opacity }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }] }]}
        pointerEvents="box-none"
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Avatar size={48} src={profile?.avatar_url || undefined} borderMint />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {profile?.full_name || 'Traveler'}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {profile?.role === 'guide' ? 'GUIDE' : 'EXPLORER'}
                </Text>
              </View>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={22} color="#717973" />
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Navigation items */}
        <View style={{ flex: 1, paddingVertical: 8 }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.route}
                activeOpacity={0.7}
                style={styles.navRow}
                onPress={() => navigate(item.route)}
              >
                <View style={styles.navIcon}>
                  <Icon size={18} color="#8B1A1A" />
                </View>
                <Text style={styles.navLabel}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Bottom */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.navRow}
          onPress={() => navigate('/(tourist)/settings')}
        >
          <View style={styles.navIcon}>
            <Settings size={18} color="#717973" />
          </View>
          <Text style={[styles.navLabel, { color: '#717973' }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.navRow, { marginBottom: 24 }]}
          onPress={handleLogout}
        >
          <View style={[styles.navIcon, { backgroundColor: '#FEE2E2' }]}>
            <LogOut size={18} color="#DC2626" />
          </View>
          <Text style={[styles.navLabel, { color: '#DC2626' }]}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  roleBadge: {
    marginTop: 4,
    backgroundColor: '#C8E6C9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8B1A1A',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF0ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },
});
