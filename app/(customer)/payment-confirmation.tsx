import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function PaymentConfirmation() {
  const { jobId } = useLocalSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const router = useRouter();

  useEffect(() => {
    if (!jobId) return;

    // Listen for the Webhook to update the job status to 'paid' or 'completed'
    const unsubscribe = onSnapshot(doc(db, "jobs", jobId as string), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === "completed" || data.paymentStatus === "success") {
          setStatus("success");
        }
      }
    });

    return () => unsubscribe();
  }, [jobId]);

  if (status === "verifying") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.statusText}>Confirming Payment with Bank...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#10b981", "#059669"]} style={styles.successCard}>
        <Ionicons name="checkmark-circle" size={80} color="white" />
        <Text style={styles.successTitle}>Payment Confirmed!</Text>
        <Text style={styles.successSub}>R {(Number(25) + 150).toFixed(2)} sent to Pro</Text>
      </LinearGradient>

      <TouchableOpacity 
        style={styles.homeBtn} 
        onPress={() => router.replace("/(customer)")}
      >
        <Text style={styles.homeBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", justifyContent: 'center', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { marginTop: 20, fontSize: 16, color: "#64748b", fontWeight: "600" },
  successCard: { borderRadius: 30, padding: 40, alignItems: 'center' },
  successTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginTop: 20 },
  successSub: { color: 'white', opacity: 0.9, marginTop: 10 },
  homeBtn: { marginTop: 30, backgroundColor: "#1f2937", padding: 20, borderRadius: 20, alignItems: 'center' },
  homeBtnText: { color: 'white', fontWeight: '800' }
});