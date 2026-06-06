import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function registerForPushNotificationsAsync() {
      let token;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B1A1A',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return;
        }
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId ?? '04b147c0-3983-4662-9ca0-22f9d79f46a3',
        })).data;
      } else {
        console.log('Must use physical device for Push Notifications');
      }

      return token;
    }

    if (user) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token && isMounted) {
          setExpoPushToken(token);
          
          try {
            
            await (supabase.from('push_tokens') as any).upsert(
              { user_id: user.id, token, device_type: Platform.OS },
              { onConflict: 'user_id,token' }
            );
          } catch (e) {
            console.error('Error saving push token', e);
          }
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { expoPushToken };
}
