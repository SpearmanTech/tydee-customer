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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "@/firebase/firebase";
import * as Haptics from "expo-haptics";

export default function RentalCheckoutScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState({
    id: "none",
    label: "Loading Wallet...",
    icon: "wallet-outline",
    isLinked: false,
  });

  // --- FINANCIAL SPLIT LOGIC ---
  const totalAmount = Number(params.totalAmount);
  const securityDeposit = Number(params.securityDeposit);
  const serviceFee = 50;
  const insuranceFee = params.hasInsurance === "true" ? 85 : 0;

  // The actual cost of the days rented
  const rentalFee = totalAmount - securityDeposit - serviceFee - insuranceFee;
  // The amount required immediately to lock the booking
  const dueNow = securityDeposit + serviceFee + insuranceFee;

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
            label: `${data.paymentMethod.brand} \u2022\u2022\u2022\u2022 ${data.paymentMethod.last4}`,
            icon: "card",
            isLinked: true,
          });
        } else {
          setSelectedMethod({
            id: "none",
            label: "Add Payment Method",
            icon: "add-circle-outline",
            isLinked: false,
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePayAndConfirm = async () => {
    if (!selectedMethod.isLinked) {
      Alert.alert(
        "Wallet Required",
        "Please link a card in your wallet to proceed."
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
      const functions = getFunctions();
      const createRentalAndCharge = httpsCallable(
        functions,
        "createRentalAndCharge"
      );

      const result = await createRentalAndCharge({
        equipmentId: params.equipmentId,
        ownerId: params.ownerId,
        userId: auth.currentUser?.uid,
        renterRole: "customer", // Tells backend to use the Escrow + PIN flow
        days: Number(params.days),
        startDate: params.startDate,
        endDate: params.endDate,
        hasInsurance: params.hasInsurance === "true",
        totalAmount,
        securityDeposit,
        dueNow,     // Tell backend exactly what to charge now
        rentalFee,  // Tell backend exactly what to charge at handshake
      });

      if (result.data) {
        Alert.alert(
          "Deposit Secured!",
          "Your booking is confirmed. The rental fee will be charged when you receive the equipment.",
          [
            {
              text: "View Receipt",
              onPress: () => router.replace("/(customer)/rentals" as any),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Checkout Error:", error);
      Alert.alert(
        "Payment Failed",
        error.message || "We could not process your transaction."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* -- Header -- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Checkout</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {/* -- Order Summary Card -- */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="construct" size={24} color="#6366f1" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.itemTitle}>{params.equipmentTitle}</Text>
              <Text style={styles.itemDates}>
                {params.startDate} to {params.endDate}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Security Deposit (Refundable)
            </Text>
            <Text style={styles.breakdownValue}>R{securityDeposit}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Fees & Insurance</Text>
            <Text style={styles.breakdownValue}>
              R{serviceFee + insuranceFee}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Due Now</Text>
            <Text style={styles.priceValue}>R{dueNow}</Text>
          </View>

          <View style={styles.handshakeBox}>
            <Ionicons name="lock-closed" size={14} color="#f59e0b" />
            <Text style={styles.handshakeText}>
              The remaining{" "}
              <Text style={{ fontWeight: "800" }}>R{rentalFee}</Text> rental fee
              will automatically be charged to your card only when you meet the
              owner and exchange the start PIN.
            </Text>
          </View>
        </View>

        {/* -- Payment Method -- */}
        <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
        <TouchableOpacity
          style={styles.methodDropdown}
          activeOpacity={0.7}
          onPress={() => {
            if (!selectedMethod.isLinked) {
              Alert.alert(
                "Wallet",
                "Please add a card in your Profile settings."
              );
            }
          }}
        >
          <Ionicons
            name={selectedMethod.icon as any}
            size={22}
            color={selectedMethod.isLinked ? "#6366f1" : "#94a3b8"}
          />
          <Text
            style={[
              styles.methodText,
              !selectedMethod.isLinked && { color: "#94a3b8" },
            ]}
          >
            {selectedMethod.label}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* -- Footer / Pay Button -- */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePayAndConfirm}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={
              selectedMethod.isLinked
                ? ["#1f2937", "#111827"]
                : ["#cbd5e1", "#94a3b8"]
            }
            style={styles.payGradient}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.payBtnText}>Pay Deposit (R{dueNow})</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark" size={12} color="#10b981" />
          <Text style={styles.secureText}>Funds held securely in Escrow</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: "white",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
  },
  content: {
    padding: 20,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 15,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  itemDates: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 15,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 15,
  },
  priceLabel: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "800",
  },
  priceValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#10b981",
  },
  handshakeBox: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    padding: 15,
    borderRadius: 15,
    alignItems: "flex-start",
    gap: 10,
  },
  handshakeText: {
    flex: 1,
    fontSize: 11,
    color: "#b45309",
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 5,
  },
  methodDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  methodText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  payBtn: {
    width: "100%",
    marginBottom: 15,
  },
  payGradient: {
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  payBtnText: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  secureText: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
  },
});