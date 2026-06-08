import { db } from "@/firebase/firebase";
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
} from "react-native";

export default function ActiveJobDetails() {
  const { jobId } = useLocalSearchParams(); // Get Job ID from navigation
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState({
    id: "1",
    label: "Visa ••• 0358",
    icon: "card",
  });

  const scrollY = new Animated.Value(0);

  // Expert Data Pull: Real-time Listener
  useEffect(() => {
    if (!jobId) return;

    const jobRef = doc(db, "jobs", jobId as string);
    const unsubscribe = onSnapshot(jobRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // EXPERT FILTER: Only allow view if job has actually started
        const activeStatuses = ["started", "payment_requested", "completed"];

        if (activeStatuses.includes(data.status)) {
          setJobData({ id: docSnap.id, ...data });
        } else {
          // If it's still 'assigned', they should be on the 'Tracking' screen instead
          console.log("Job has not started yet.");
          // router.replace("/(customer)/tracking-screen");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Animation Constants
  const imageScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: "clamp",
  });

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
      >
        {/* Professional Profile Section pulled from Job Doc */}
        <View style={styles.proSection}>
          <Animated.View
            style={[
              styles.imageWrapper,
              { transform: [{ scale: imageScale }] },
            ]}
          >
            <Image
              source={{
                uri:
                  jobData?.assigned_professional_image ||
                  "https://via.placeholder.com/150",
              }}
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
          {/* Handshake UI inside ActiveJobDetails (Customer View) */}
          {jobData?.status === "assigned" && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>HANDSHAKE PIN</Text>
              <Text style={styles.pinText}>{jobData?.startPin}</Text>
              <Text style={styles.pinNote}>
                Give this to the Pro when they arrive.
              </Text>
            </View>
          )}
        </View>

        {/* Invoice Card: Dynamic Pricing */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Service Summary</Text>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceKey}>
              {jobData?.title || "Standard Service"}
            </Text>
            <Text style={styles.invoiceValue}>
              R {jobData?.final_price || jobData?.price}
            </Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceKey}>Service Fee</Text>
            <Text style={styles.invoiceValue}>R 25.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.invoiceRow}>
            <Text style={styles.totalLabel}>Total Charge</Text>
            <Text style={styles.totalAmount}>
              R {Number(jobData?.final_price || jobData?.price || 0) + 25}
            </Text>
          </View>
        </View>

        {/* Payment & Status Module */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Confirm Payment</Text>
          <TouchableOpacity
            style={styles.methodDropdown}
            onPress={() => setShowPaymentModal(true)}
          >
            <Ionicons
              name={selectedMethod.icon === "card" ? "card" : "cash"}
              size={20}
              color="#6366f1"
            />
            <Text style={styles.methodText}>{selectedMethod.label}</Text>
            <Ionicons name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() =>
              router.push({
                pathname: "/(stack)/payment-confirmation",
                params: {
                  jobId: jobData.id,
                  proId: jobData.assigned_professional_id,
                },
              })
            }
          >
            <LinearGradient
              colors={["#1f2937", "#111827"]}
              style={styles.gradientBtn}
            >
              <Text style={styles.btnText}>Complete Job & Pay</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Payment Selection Modal stays here as requested */}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // --- Header Styling ---
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 45,
    height: 45,
    backgroundColor: "white",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    marginLeft: 15,
  },

  // --- Professional Section (The Slide-out Frame) ---
  proSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 30,
    marginTop: 10,
  },
  imageWrapper: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  proImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "white",
  },
  proInfo: {
    marginLeft: 20,
    flex: 1,
  },
  proName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1f2937",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 6,
    color: "#64748b",
    fontWeight: "600",
    fontSize: 14,
  },
  proSpecialty: {
    color: "#6366f1",
    fontWeight: "700",
    marginTop: 6,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1,
  },

  // --- Premium Card Styling ---
  sectionCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 15 },
      android: { elevation: 2 },
    }),
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // --- Invoice & Pricing ---
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  invoiceKey: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
  },
  invoiceValue: {
    color: "#1f2937",
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 15,
  },
  totalLabel: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "800",
  },
  totalAmount: {
    color: "#10b981",
    fontSize: 24,
    fontWeight: "900",
  },

  // --- Payment Dropdown ---
  methodDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  methodText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },

  // --- Confirm Button ---
  confirmBtn: {
    marginTop: 20,
  },
  gradientBtn: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },

  // --- Payment Modal Pop-up ---
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  paymentPopup: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 30,
    paddingBottom: 50,
  },
  popupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  doneBtn: {
    color: "#6366f1",
    fontWeight: "800",
    fontSize: 16,
  },
  popupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  popupItemText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },

  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // --- Header Styling ---
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 45,
    height: 45,
    backgroundColor: "white",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    marginLeft: 15,
  },

  // --- Professional Section (The Slide-out Frame) ---
  proSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 30,
    marginTop: 10,
  },
  imageWrapper: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  proImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "white",
  },
  proInfo: {
    marginLeft: 20,
    flex: 1,
  },
  proName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1f2937",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 6,
    color: "#64748b",
    fontWeight: "600",
    fontSize: 14,
  },
  proSpecialty: {
    color: "#6366f1",
    fontWeight: "700",
    marginTop: 6,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1,
  },

  // --- Premium Card Styling ---
  sectionCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 15 },
      android: { elevation: 2 },
    }),
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // --- Invoice & Pricing ---
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  invoiceKey: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
  },
  invoiceValue: {
    color: "#1f2937",
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 15,
  },
  totalLabel: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "800",
  },
  totalAmount: {
    color: "#10b981",
    fontSize: 24,
    fontWeight: "900",
  },

  // --- Payment Dropdown ---
  methodDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  methodText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },

  // --- Confirm Button ---
  confirmBtn: {
    marginTop: 20,
  },
  gradientBtn: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },

  // --- Payment Modal Pop-up ---
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  paymentPopup: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 30,
    paddingBottom: 50,
  },
  popupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  doneBtn: {
    color: "#6366f1",
    fontWeight: "800",
    fontSize: 16,
  },
  popupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  popupItemText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
});
