import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const onNewChatMessage = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const messageData = event.data?.data();
    if (!messageData) return;

    const chatId = event.params.chatId;
    const senderId = messageData.senderId;
    const text = messageData.text;

    const db = admin.firestore();

    // 1. Fetch the parent chat document to identify the players
    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists) return;

    const chatData = chatDoc.data()!;
    
    // 2. Identify the recipient (whoever DID NOT send the message)
    const recipientId = senderId === chatData.ownerId ? chatData.renterId : chatData.ownerId;

    // 3. Locate the recipient's Push Token
    // We check both collections since Pros can rent from Pros, or Customers from Pros
    let recipientRef = await db.collection("customers").doc(recipientId).get();
    if (!recipientRef.exists) {
        recipientRef = await db.collection("professionals").doc(recipientId).get();
    }

    const pushToken = recipientRef.data()?.pushToken;

    if (!pushToken) {
        console.log(`Execution skipped: No push token on file for user ${recipientId}`);
        return;
    }

    // 4. Construct and dispatch the payload
    const payload = {
      token: pushToken,
      notification: {
        title: chatData.equipmentName ? `New message about ${chatData.equipmentName}` : "Tydee Message",
        body: text.length > 60 ? text.substring(0, 60) + "..." : text,
      },
      data: {
        type: "chat",
        rentalId: chatId,
        // This URL lets Expo deep-link straight into the chat room when the notification is tapped
        url: `/(professional)/chat/${chatId}` 
      }
    };

    try {
      await admin.messaging().send(payload);
      console.log(`Push notification successfully dispatched to ${recipientId}`);
    } catch (error) {
      console.error("Critical failure sending push notification:", error);
    }
  }
);