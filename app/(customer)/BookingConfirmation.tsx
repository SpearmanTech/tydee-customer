import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '@/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle, MapPin, User, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { paymentService } from "../services/paymentService";
import { useAuth } from "../../context/AuthContext"; // Ensure correct import for useAuth

export default function BookingConfirmation() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth(); 
  const [jobData, setJobData] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    const processInitialCharge = async (data: any) => {
      // Only charge if the job is confirmed and hasn't been paid/charged yet
      if (data.status === "confirmed" && !data.isPaid && user) {
        setPaymentProcessing(true);
        try {
          // Calling the refined v2 function logic via your paymentService
          const result = await paymentService.chargeSavedCard(
            user.uid,
            data.accepted_bid_details?.amount,
            jobId as string
          );
          
          if (result.success) {
             console.log("Background charge initiated successfully");
             // Note: The Webhook we built will handle updating 'isPaid' to true in Firestore
          }
        } catch (error) {
          console.error("Payment Error:", error);
          Alert.alert("Payment Issue", "We couldn't process the automatic payment. Please check your saved card.");
        } finally {
          setPaymentProcessing(false);
        }
      }
    };

    const fetchJob = async () => {
      if (!jobId) return;
      const snap = await getDoc(doc(db, "jobs", jobId as string));
      if (snap.exists()) {
        const data = snap.data();
        setJobData(data);
        processInitialCharge(data);
      }
    };
    fetchJob();
  }, [jobId, user]); // Added user to dependency array

  if (!jobData) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
        <View style={styles.iconCircle}>
          <CheckCircle size={40} color="#059669" />
        </View>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your professional is on their way.</Text>
        {paymentProcessing && (
          <Text style={styles.processingText}>Securing payment...</Text>
        )}
      </Animated.View>

      <View style={styles.content}>
        {/* PRO CARD */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <View style={styles.row}>
            <User size={20} color="#6366f1" />
            <Text style={styles.cardLabel}>Professional</Text>
          </View>
          <Text style={styles.cardValue}>{jobData.accepted_bid_details?.name || "Assigning..."}</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>R {jobData.accepted_bid_details?.amount}</Text>
          </View>
        </Animated.View>

        {/* PIN CARD - THE HANDSHAKE */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.pinCard}>
          <ShieldCheck size={24} color="#fff" />
          <Text style={styles.pinLabel}>Start Job PIN</Text>
          <Text style={styles.pinValue}>{jobData.startPin}</Text>
          <Text style={styles.pinHint}>Give this code to your pro when they arrive to start the service.</Text>
        </Animated.View>

        {/* LOCATION CARD */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.card}>
          <View style={styles.row}>
            <MapPin size={20} color="#6366f1" />
            <Text style={styles.cardLabel}>Service Location</Text>
          </View>
          <Text style={styles.cardValue} numberOfLines={2}>
            {jobData.location?.address || "Location on file"}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryBtn} 
          onPress={() => router.replace("/(customer)")}
        >
          <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 8, textAlign: 'center' },
  processingText: { fontSize: 12, color: '#6366f1', marginTop: 5, fontWeight: '600' },
  content: { flex: 1, padding: 25, gap: 20 },
  card: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  pinCard: { backgroundColor: '#1e293b', padding: 30, borderRadius: 32, alignItems: 'center', gap: 10 },
  pinLabel: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 14, textTransform: 'uppercase' },
  pinValue: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 8 },
  pinHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  priceBadge: { backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  priceText: { fontWeight: '900', color: '#059669' },
  footer: { padding: 25 },
  primaryBtn: { backgroundColor: '#111827', padding: 20, borderRadius: 20, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});