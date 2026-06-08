import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Alert, Platform } from "react-native";
import { PaystackProvider, usePaystack } from "react-native-paystack-webview";
import Constants from "expo-constants";

const EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY: string | undefined =
  process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;

interface Props {
  userId: string | undefined;
  email: string | undefined;
  userType?: "customer" | "professional"; 
  onComplete: (success: boolean) => void;
}

// Automatically trigger the Paystack UI the moment it's ready (Mobile Only)
const AutoTrigger = () => {
  const paystack = usePaystack();
  const [hasLaunched, setHasLaunched] = useState(false);

  useEffect(() => {
    if (typeof paystack?.startPaystack === 'function' && !hasLaunched) {
      setHasLaunched(true);
      paystack.startPaystack();
    }
  }, [paystack, hasLaunched]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={styles.loadingText}>Opening Paystack...</Text>
    </View>
  );
};

const AddCardModal = ({ userId, email, onComplete }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!userId || !email) return null;

  // 1. PREVENT WEB HANGING
  if (Platform.OS === 'web') {
    return (
      <View style={styles.overlay}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: '#ef4444', textAlign: 'center', padding: 20 }]}>
            Paystack WebView is native-only.{"\n"}Please test payments on an iOS/Android simulator or the Expo Go app.
          </Text>
          <Text 
            style={{ color: '#4f46e5', marginTop: 20, fontWeight: 'bold' }}
            onPress={() => onComplete(false)}
          >
            Cancel & Go Back
          </Text>
        </View>
      </View>
    );
  }

  // 2. CALL YOUR ACTUAL FIREBASE FUNCTION
  const handleSuccess = async (res: any) => {
    setIsProcessing(true); 
    try {
      const functions = getFunctions();
      // Updated to match your actual Cloud Function name!
      const verifyCard = httpsCallable(functions, "verifyAndSaveCard"); 
      
      await verifyCard({
        reference: res.transactionRef.reference,
        userId: userId,
        userType: "user" // <--- Added this to the payload
      });
      
      setIsProcessing(false);
      onComplete(true);
    } catch (error) {
      console.error("Card Verification Error:", error);
      setIsProcessing(false);
      Alert.alert("Link Failed", "We couldn't securely verify your card. Please try again.");
      onComplete(false);
    }
  };

  const handleCancel = () => {
    onComplete(false);
  };

  if (isProcessing) {
    return (
      <View style={styles.overlay}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Verifying with Foona Servers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <PaystackProvider
        paystackKey={EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || ""}
        billingEmail={email}
        amount="1.00" 
        currency="ZAR"
        activityIndicatorColor="transparent" 
        autoStart={false} 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      >
        <AutoTrigger />
      </PaystackProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0f1e", 
    zIndex: 9999,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 20,
  }
});

export default AddCardModal;