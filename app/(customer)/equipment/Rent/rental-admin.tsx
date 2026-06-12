import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "@/firebase/firebase";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function RentalAdminScreen() {
  const { rentalId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [rental, setRental] = useState<any>(null);
  const [renterProfile, setRenterProfile] = useState<any>(null);
  const [pin, setPin] = useState("");

  // 1. Real-time sync for the specific rental ticket
  useEffect(() => {
    if (!rentalId) return;

    const unsubscribe = onSnapshot(doc(db, "rentals", rentalId as string), async (docSnap) => {
      if (docSnap.exists()) {
        const rentalData = docSnap.data();
        setRental({ id: docSnap.id, ...rentalData });

        // Fetch the customer's profile so the Pro knows who they are meeting
        if (rentalData.userId) {
          try {
            const customerRef = await getDoc(doc(db, "customers", rentalData.userId));
            if (customerRef.exists()) {
              setRenterProfile(customerRef.data());
            }
          } catch (e) {
            console.error("Failed to fetch renter profile");
          }
        }
      } else {
        Alert.alert("Notice", "This rental ticket has been removed or cancelled.");
        router.back();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [rentalId]);

  // 2. The Official Handshake Logic
  const handleVerifyHandshake = async () => {
    if (pin.length !== 4) {
      Alert.alert("Invalid Entry", "Please enter the 4-digit PIN provided by the renter.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVerifying(true);

    try {
      const functions = getFunctions();
      const activateRentalHandshake = httpsCallable(functions, "activateRentalHandshake");
      
      const result: any = await activateRentalHandshake({
        rentalId,
        enteredPin: pin
      });

      if (result.data?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Handshake Complete!", 
          "The PIN was verified. The rental is now active and your funds are secured."
        );
        setPin(""); // Clear the input
      } else {
        // Handle incorrect PIN rejection gracefully
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Verification Failed", result.data?.message || "Incorrect PIN code.");
      }
    } catch (error: any) {
      console.error("Handshake Error:", error);
      Alert.alert("System Error", error.message || "Failed to process the handshake. Check your connection.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading || !rental) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rental Command</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Status Banner */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <LinearGradient 
              colors={rental.status === 'pending_transfer' ? ["#f59e0b", "#d97706"] : ["#10b981", "#059669"]} 
              style={styles.statusBanner}
            >
              <Ionicons 
                name={rental.status === 'pending_transfer' ? "time" : "checkmark-circle"} 
                size={28} 
                color="white" 
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.statusTitle}>
                  {rental.status === 'pending_transfer' ? "Awaiting Handshake" : "Rental Active"}
                </Text>
                <Text style={styles.statusSub}>
                  {rental.status === 'pending_transfer' 
                    ? "Meet the renter to exchange the gear." 
                    : `Due for return on ${rental.endDate}`}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Core Rental Info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="construct" size={20} color="#6366f1" />
              <Text style={styles.cardTitle}>{rental.equipmentTitle}</Text>
            </View>
            <View style={styles.divider} />
            
            <InfoRow label="Renter Name" value={renterProfile?.full_name || renterProfile?.name || "Verified Customer"} />
            <InfoRow label="Start Date" value={rental.startDate} />
            <InfoRow label="End Date" value={rental.endDate} />
            <InfoRow label="Duration" value={`${rental.days} Days`} />
            <InfoRow label="Damage Protection" value={rental.hasInsurance ? "Active" : "Declined"} />
            
            <View style={styles.divider} />
            <View style={styles.payoutRow}>
              <Text style={styles.payoutLabel}>Your Final Payout</Text>
              <Text style={styles.payoutValue}>R{rental.rentalFee}</Text>
            </View>
          </View>

          {/* THE HANDSHAKE MODULE */}
          {rental.status === 'pending_transfer' && (
            <Animated.View entering={FadeInUp.delay(200)} style={styles.handshakeModule}>
              <View style={styles.handshakeIconWrap}>
                <Ionicons name="lock-closed" size={24} color="#6366f1" />
              </View>
              <Text style={styles.handshakeTitle}>Equipment Handover</Text>
              <Text style={styles.handshakeSub}>
                Enter the secret 4-digit PIN provided by the renter to release your funds and activate the timer.
              </Text>

              <TextInput
                style={styles.pinInput}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                placeholder="• • • •"
                placeholderTextColor="#cbd5e1"
                value={pin}
                onChangeText={setPin}
              />

              <TouchableOpacity 
                style={[styles.verifyBtn, pin.length < 4 && styles.verifyBtnDisabled]}
                onPress={handleVerifyHandshake}
                disabled={pin.length < 4 || isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.verifyBtnText}>Verify & Secure Funds</Text>
                    <Ionicons name="shield-checkmark" size={18} color="white" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ACTIONS FOR ACTIVE RENTAL */}
          {rental.status === 'active' && (
            <Animated.View entering={FadeInUp.delay(200)} style={styles.activeActions}>
               <TouchableOpacity style={styles.actionBtnSecondary}>
                 <Ionicons name="chatbubble" size={20} color="#6366f1" />
                 <Text style={styles.actionBtnTextSecondary}>Message Renter</Text>
               </TouchableOpacity>

               <TouchableOpacity style={styles.actionBtnPrimary}>
                 <Text style={styles.actionBtnTextPrimary}>Log Equipment Return</Text>
               </TouchableOpacity>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc", paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  backBtn: { width: 44, height: 44, backgroundColor: "white", borderRadius: 14, justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  content: { padding: 20 },
  
  statusBanner: { padding: 20, borderRadius: 20, flexDirection: "row", alignItems: "center", marginBottom: 20, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  statusTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  statusSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "500", marginTop: 4 },

  card: { backgroundColor: "white", borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#f1f5f9" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginLeft: 10 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  infoLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  infoValue: { fontSize: 13, color: "#1e293b", fontWeight: "800" },
  
  payoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  payoutLabel: { fontSize: 15, color: "#1e293b", fontWeight: "800" },
  payoutValue: { fontSize: 24, fontWeight: "900", color: "#10b981" },

  handshakeModule: { backgroundColor: "white", borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 2, borderStyle: "dashed", borderColor: "#cbd5e1" },
  handshakeIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#eef2ff", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  handshakeTitle: { fontSize: 18, fontWeight: "900", color: "#1e293b", marginBottom: 8 },
  handshakeSub: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, marginBottom: 25 },
  
  pinInput: { backgroundColor: "#f8fafc", width: "100%", height: 70, borderRadius: 20, textAlign: "center", fontSize: 32, fontWeight: "900", letterSpacing: 20, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 20 },
  
  verifyBtn: { backgroundColor: "#1e293b", width: "100%", height: 60, borderRadius: 18, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: "white", fontSize: 16, fontWeight: "800" },

  activeActions: { gap: 12 },
  actionBtnSecondary: { backgroundColor: "white", width: "100%", height: 60, borderRadius: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  actionBtnTextSecondary: { color: "#6366f1", fontSize: 15, fontWeight: "700", marginLeft: 8 },
  actionBtnPrimary: { backgroundColor: "#10b981", width: "100%", height: 60, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  actionBtnTextPrimary: { color: "white", fontSize: 16, fontWeight: "800" }
});