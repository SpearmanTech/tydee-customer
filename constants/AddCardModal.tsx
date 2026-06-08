import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Alert, Platform, TouchableOpacity } from "react-native";
import Constants from "expo-constants";
// We only import the native wrapper for iOS/Android builds later
import { Paystack } from "react-native-paystack-webview";

const EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY: string =
  process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

interface Props {
  userId: string | undefined;
  email: string | undefined;
  onComplete: (success: boolean) => void;
}

const AddCardModal = ({ userId, email, onComplete }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [webScriptLoaded, setWebScriptLoaded] = useState(false);

  // 1. Inject Paystack's official Web SDK when running in a browser
  useEffect(() => {
    if (Platform.OS === 'web') {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => setWebScriptLoaded(true);
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  if (!userId || !email) return null;

  // 2. Universal Success Handler (Works for both Web and Native)
  const handleSuccess = async (reference: string) => {
    setIsProcessing(true); 
    try {
      const functions = getFunctions();
      const verifyCard = httpsCallable(functions, "verifyAndSaveCard"); 
      
      await verifyCard({
        reference: reference,
        userId: userId,
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

  if (isProcessing) {
    return (
      <View style={styles.overlay}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Verifying with Tydee Servers...</Text>
        </View>
      </View>
    );
  }

  // --- WEB RENDER ---
  if (Platform.OS === 'web') {
    const triggerWebPaystack = () => {
      if (!webScriptLoaded || !(window as any).PaystackPop) {
        alert("Secure payment system is loading. Please try again in a few seconds.");
        return;
      }

      // Initialize the secure web iframe
      const handler = (window as any).PaystackPop.setup({
        key: EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: 100, // Paystack counts in cents (R1.00)
        currency: "ZAR",
        callback: function (response: any) {
          // Triggered when user successfully completes the web popup
          handleSuccess(response.reference);
        },
        onClose: function () {
          // Triggered if they click the 'X' on the web popup
          onComplete(false);
        },
      });

      handler.openIframe();
    };

    return (
      <View style={styles.overlay}>
        <View style={styles.webContainer}>
          <Text style={styles.webTitle}>Secure Payment Setup</Text>
          <Text style={styles.webSubtitle}>Click below to open Paystack's secure web portal and authorize your card.</Text>
          
          <TouchableOpacity 
            style={[styles.webButton, !webScriptLoaded && { opacity: 0.5 }]} 
            onPress={triggerWebPaystack}
            disabled={!webScriptLoaded}
          >
            <Text style={styles.webButtonText}>
              {webScriptLoaded ? "Open Secure Portal" : "Loading Gateway..."}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => onComplete(false)}>
            <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- NATIVE RENDER (Safeguard for future app builds) ---
  return (
    <View style={styles.overlay}>
      <Paystack
        paystackKey={EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY}
        billingEmail={email}
        amount="1.00" 
        currency="ZAR"
        activityIndicatorColor="#4f46e5" 
        autoStart={true} 
        onSuccess={(res: any) => handleSuccess(res.transactionRef.reference)}
        onCancel={() => onComplete(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 15, 30, 0.9)", 
    zIndex: 9999,
    justifyContent: "center",
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
  },
  webContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  webTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 10,
  },
  webSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  webButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  webButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default AddCardModal;