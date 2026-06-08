import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import * as admin from 'firebase-admin';

// Initialize Expo SDK
const expo = new Expo();

/**
 * Sends a push notification to a specific user by their Firestore UID
 */
export const sendPushNotification = async (
  userId: string, 
  content: { title: string; body: string; data?: any }
) => {
  try {
    // 1. Fetch the user's push token from Firestore
    // Note: You should store tokens in 'customers' or 'professionals' docs
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const pushToken = userDoc.data()?.pushToken;

    // 2. Validate the token
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      console.error(`User ${userId} does not have a valid Expo push token.`);
      return;
    }

    // 3. Construct the message
    const messages: ExpoPushMessage[] = [{
      to: pushToken,
      sound: 'default',
      title: content.title,
      body: content.body,
      data: content.data || {},
      priority: 'high',
    }];

    // 4. Send the message
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log("Push Ticket:", ticketChunk);
        // NOTE: In production, you should save these tickets to check for errors later
      } catch (error) {
        console.error("Error sending notification chunk:", error);
      }
    }
  } catch (err) {
    console.error("Internal Push Error:", err);
  }
};