import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { Platform } from "react-native";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// 🚨 1. IMPORT FUNCTIONS HERE
import { getFunctions } from "firebase/functions"; 

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// 1. Initialize App (Safe for Fast Refresh)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Auth (Safe for Fast Refresh)
let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    // Attempt to initialize native auth with persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // If it fails (usually due to hot reloading), retrieve the existing instance
    auth = getAuth(app);
  }
}

// 3. Initialize DB and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// 🚨 2. INITIALIZE AND EXPORT FUNCTIONS HERE
// If your functions are deployed to us-central1 (the default), this is perfect.
// If you deployed them to a specific region like europe-west1, use: getFunctions(app, 'europe-west1')
export const functions = getFunctions(app);

export { auth };
export default app;