import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase'; 

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for notifications!');
    return;
  }

  try {
    // SURGICAL FIX: Use the specific Project ID directly as a fallback
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      "cff17f73-4614-49ef-b229-bb58401bcc55"; // Your hardcoded ID
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("SUCCESS: Push Token Generated:", token);

    if (userId && token) {
      // Use the user's UID to store the token for targeted notifications
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        pushToken: token,
        lastTokenUpdate: new Date().toISOString() 
      });
    }
  } catch (e) {
    console.log("Error getting push token:", e);
  }

  return token;
}