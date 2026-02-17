import * as admin from "firebase-admin";
import {user} from "firebase-functions/v1/auth";
import {UserRecord} from "firebase-admin/auth";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const onProfessionalCreate = user().onCreate(
  async (authUser: UserRecord) => {
    await db.collection("professionals").doc(authUser.uid).set({
      uid: authUser.uid,
      name: authUser.displayName ?? "Unnamed Professional",
      email: authUser.email ?? "",
      rating: 5,
      isOnline: false,
      services: [],
      role: "professional",
      isVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Professional profile created:", authUser.uid);
  }
);
