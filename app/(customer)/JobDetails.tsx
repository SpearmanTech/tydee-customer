import { db } from "@/firebase/firebase";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

export default function ActiveJobDetails() {
  const { jobId } = useLocalSearchParams();
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to empty state until Firestore loads
  const [selectedMethod, setSelectedMethod] = useState({
    id: "none",
    label: "Loading Wallet...",
    icon: "wallet-outline",
    isLinked: false
  });

  const scrollY = new Animated.Value(0);
  const auth = getAuth();

  // 1. Fetch Job Data (Real-time listener)
  useEffect(() => {
    if (!jobId) return;

    const jobRef = doc(db, "jobs", jobId as string);
    const unsubscribe = onSnapshot(jobRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Allow viewing for all relevant active/completed statuses
        setJobData({ id: docSnap.id, ...data });
      } else {
        console.log("Job document does not exist.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);

  // 2. Fetch Customer Payment Data (Dynamic Wallet)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const customerRef = doc(db, "customers", user.uid);
    const unsubscribe = onSnapshot(customerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.paymentMethod?.isLinked) {
          setSelectedMethod({
            id: data.paymentMethod.token,
            label: `${data.paymentMethod.brand} •••• ${data.paymentMethod.last4}`,
            icon: "card",
            isLinked: true
          });
        } else {
          setSelectedMethod({
            id: "none",
            label: "Add Payment Method",
            icon: "add-circle-outline",
            isLinked: false
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Handle Checkout Flow
  const handleCheckout = () => {
    if (!selectedMethod.isLinked) {
      if (Platform.OS === 'web') {
        alert("Please add a payment method in your Wallet first.");
      } else {
        Alert.alert("Action Required", "Please add a payment method in your Wallet before paying.");
      }
      // router.push('/(customer)/wallet');
      return;
    }

    router.push({
      pathname: "/(stack)/payment-confirmation",
      params: {
        jobId: jobData.id,
        proId: jobData.assigned_professional_id,
        amount: Number(jobData?.final_price || jobData?.budget || 0) + 25 
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const imageScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: "clamp",
  });

  // Safe Date Formatter
  const formattedDate = jobData?.createdAt?.seconds 
    ? new Date(jobData.createdAt.seconds * 1000).toLocaleDateString() 
    : "Pending Date";

  return (
    <View style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.headerTitleRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.mainTitle}>Order Summary</Text>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* --- PROFESSIONAL PROFILE SECTION --- */}
        {jobData?.assigned_professional_id ? (
          <View style={styles.proSection}>
            <Animated.View style={[styles.imageWrapper, { transform: [{ scale: imageScale }] }]}>
              <Image
                source={{ uri: jobData?.assigned_professional_image || "https://via.placeholder.com/150" }}
                style={styles.proImage}
              />
            </Animated.View>
            <View style={styles.proInfo}>
              <Text style={styles.proName}>
                {jobData?.assigned_professional_name || "Professional"}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.ratingText}>Top Rated Partner</Text>
              </View>
              <Text style={styles.proSpecialty}>Assigned Professional</Text>
            </View>
          </View>
        ) : (
          <View style={styles.pendingProSection}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.pendingProText}>Awaiting Professional Assignment...</Text>
          </View>
        )}

        {/* --- HANDSHAKE PIN --- */}
        {jobData?.status === "assigned" && jobData?.startPin && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>HANDSHAKE PIN</Text>
            <Text style={styles.pinText}>{jobData.startPin}</Text>
            <Text style={styles.pinNote}>Give this to the Pro when they arrive.</Text>
          </View>
        )}

        {/* --- NEW: BOOKING DETAILS SECTION --- */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Booking Details</Text>
          
          <View style={styles.detailItem}>
            <Ionicons name="document-text-outline" size={18} color="#64748b" style={styles.detailIcon} />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Service Description</Text>
              <Text style={styles.detailDescription}>{jobData?.description || "No description provided."}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.detailIcon} />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Requested Date</Text>
              <Text style={styles.detailDescription}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="information-circle-outline" size={18} color="#64748b" style={styles.detailIcon} />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailTitle}>Current Status</Text>
              <Text style={[styles.detailDescription, { color: '#6366f1', fontWeight: 'bold', textTransform: 'capitalize' }]}>
                {jobData?.status || "Unknown"}
              </Text>
            </View>
          </View>
        </View>

        {/* --- INVOICE SECTION --- */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Service Summary</Text>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceKey}>{jobData?.title || "Standard Service"}</Text>
            <Text style={styles.invoiceValue}>R {jobData?.final_price || jobData?.budget || 0}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceKey}>Service Fee</Text>
            <Text style={styles.invoiceValue}>R 25.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.totalLabel}>Total Charge</Text>
            <Text style={styles.totalAmount}>
              R {Number(jobData?.final_price || jobData?.budget || 0) + 25}
            </Text>
          </View>
        </View>

        {/* --- PAYMENT CONFIRMATION MODULE --- */}
        {/* Hide checkout button if job is already completed */}
        {jobData?.status !== "completed" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Confirm Payment</Text>
            <TouchableOpacity
              style={styles.methodDropdown}
              onPress={() => {
                if (!selectedMethod.isLinked) {
                  // Optional: route to wallet setup
                }
              }}
            >
              <Ionicons
                name={selectedMethod.icon as any}
                size={20}
                color={selectedMethod.isLinked ? "#6366f1" : "#94a3b8"}
              />
              <Text style={[styles.methodText, !selectedMethod.isLinked && { color: '#94a3b8' }]}>
                {selectedMethod.label}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleCheckout}>
              <LinearGradient
                colors={selectedMethod.isLinked ? ["#1f2937", "#111827"] : ["#cbd5e1", "#94a3b8"]}
                style={styles.gradientBtn}
              >
                <Text style={styles.btnText}>Complete Job & Pay</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  headerTitleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 20, marginBottom: 20 },
  backBtn: { width: 45, height: 45, backgroundColor: "white", borderRadius: 14, justifyContent: "center", alignItems: "center", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 3 } }) },
  mainTitle: { fontSize: 22, fontWeight: "800", color: "#1f2937", marginLeft: 15 },
  
  proSection: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 30, marginTop: 10 },
  imageWrapper: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 15, elevation: 10 },
  proImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "white" },
  proInfo: { marginLeft: 20, flex: 1 },
  proName: { fontSize: 24, fontWeight: "900", color: "#1f2937" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  ratingText: { marginLeft: 6, color: "#64748b", fontWeight: "600", fontSize: 14 },
  proSpecialty: { color: "#6366f1", fontWeight: "700", marginTop: 6, textTransform: "uppercase", fontSize: 11, letterSpacing: 1 },
  
  pendingProSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', padding: 20, marginHorizontal: 20, borderRadius: 16, marginBottom: 30 },
  pendingProText: { marginLeft: 12, color: '#4338ca', fontWeight: '600', fontSize: 14 },

  sectionCard: { backgroundColor: "white", marginHorizontal: 20, borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: "#f1f5f9", ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 15 }, android: { elevation: 2 } }) },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#94a3b8", marginBottom: 15, textTransform: "uppercase", letterSpacing: 1 },
  
  detailItem: { flexDirection: 'row', marginBottom: 16 },
  detailIcon: { marginTop: 2, marginRight: 12 },
  detailTextContainer: { flex: 1 },
  detailTitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  detailDescription: { fontSize: 15, color: '#1f2937', fontWeight: '500', lineHeight: 22 },

  invoiceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  invoiceKey: { color: "#64748b", fontSize: 15, fontWeight: "500" },
  invoiceValue: { color: "#1f2937", fontSize: 15, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  totalLabel: { color: "#1f2937", fontSize: 16, fontWeight: "800" },
  totalAmount: { color: "#10b981", fontSize: 24, fontWeight: "900" },
  
  methodDropdown: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#e2e8f0" },
  methodText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "600", color: "#1f2937", textTransform: 'capitalize' },
  confirmBtn: { marginTop: 20 },
  gradientBtn: { borderRadius: 18, padding: 20, alignItems: "center" },
  btnText: { color: "white", fontWeight: "800", fontSize: 16 },
  
  pinText: { fontSize: 32, fontWeight: "900", color: "#1f2937", textAlign: "center", letterSpacing: 8 },
  pinNote: { textAlign: "center", color: "#64748b", marginTop: 8, fontSize: 13 }
});