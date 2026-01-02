import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Register for push notifications and get Expo Push Token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Must be a physical device
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
    }

    // Get the Expo Push Token
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        if (!projectId) {
            // Development mode in Expo Go - push notifications won't work
            console.log('No projectId found - push notifications disabled in development');
            console.log('To enable push notifications, run: npx eas build:configure');
            return null;
        }

        const expoPushToken = await Notifications.getExpoPushTokenAsync({
            projectId,
        });
        token = expoPushToken.data;

        console.log('Expo Push Token:', token);
    } catch (error) {
        console.log('Push notifications not available:', error);
        return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#009688',
        });
    }

    return token;
}

// Save push token to database
export async function savePushToken(token: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('No user logged in, cannot save push token');
            return false;
        }

        // Check if profile exists first
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.log('Profile not found, cannot save push token yet');
            return false;
        }

        // Upsert the token (insert or update if exists)
        const { error } = await supabase
            .from('push_tokens')
            .upsert({
                user_id: user.id,
                token: token,
                device_type: Platform.OS,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,token',
            });

        if (error) {
            console.error('Error saving push token:', error);
            return false;
        }

        console.log('Push token saved successfully');
        return true;
    } catch (error) {
        console.error('Error in savePushToken:', error);
        return false;
    }
}

// Remove push token from database (on logout)
export async function removePushToken(token: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('token', token);

        if (error) {
            console.error('Error removing push token:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in removePushToken:', error);
        return false;
    }
}

// Send push notification via Expo's push service
// Note: In production, this should be done server-side (Edge Function)
export async function sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: object,
    imageUrl?: string
): Promise<boolean> {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        ...(imageUrl && { imageUrl }), // Add imageUrl if provided
    };

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();
        console.log('Push notification result:', result);
        return true;
    } catch (error) {
        console.error('Error sending push notification:', error);
        return false;
    }
}

// Get push tokens for a user (for sending notifications to them)
export async function getUserPushTokens(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching push tokens:', error);
            return [];
        }

        return data?.map(item => item.token) || [];
    } catch (error) {
        console.error('Error in getUserPushTokens:', error);
        return [];
    }
}

// Listen for notifications (for handling when app is open)
export function setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
    // This listener is fired whenever a notification is received while the app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
        onNotificationReceived?.(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        onNotificationResponse?.(response);
    });

    return () => {
        notificationListener.remove();
        responseListener.remove();
    };
}
