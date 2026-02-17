import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { PaystackProvider, usePaystack } from 'react-native-paystack-webview';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface Props {
  userId: string | undefined;
  email: string | undefined;
  onComplete: (success: boolean) => void;
}

const PaystackTrigger = ({ userId, onComplete }: any) => {
  const paystack = usePaystack();
  const functions = getFunctions();
  const hasStarted = useRef(false);

  useEffect(() => {
    // If the hook is ready and we haven't tried to launch yet
    if (paystack?.startPaystack && !hasStarted.current) {
      hasStarted.current = true;
      
      // Small delay ensures the Provider's internal state is fully settled
      setTimeout(() => {
        paystack.startPaystack({
          onSuccess: async (res: any) => {
            try {
              const verifyAndSaveCard = httpsCallable(functions, 'verifyAndSaveCard');
              const result: any = await verifyAndSaveCard({ 
                reference: res.transactionRef, 
                userId: userId 
              });
              onComplete(result.data?.success || false);
            } catch (error) {
              console.error("Verification error:", error);
              onComplete(false);
            }
          },
          onCancel: () => onComplete(false),
        });
      }, 500); 
    }
  }, [paystack]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Connecting to Paystack...</Text>
    </View>
  );
};

const AddCardModal = ({ userId, email, onComplete }: Props) => {
  return (
    <View style={styles.overlay}>
      <PaystackProvider
        paystackKey="pk_test_18cf0ea4a6a3cacfdbcea52da8415d88d611ab3b"
        billingEmail={email || ""}
        amount="1.00"
        currency="ZAR"
        activityIndicatorColor="#6366f1"
      >
        <PaystackTrigger userId={userId} onComplete={onComplete} />
      </PaystackProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e293b',
    zIndex: 9999,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10
  }
});

export default AddCardModal;