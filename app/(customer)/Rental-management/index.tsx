import { useRouter } from "expo-router";
import { ArrowLeft, Box, DollarSign, Inbox, PlusCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase"; // Ensure correct path

export default function RentalDashboard() {
  const router = useRouter();

  // Real-time State
  const [activeListings, setActiveListings] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    // 🚀 1. Listener for Active Equipment Count
    const equipmentQuery = query(
      collection(db, "equipment"),
      where("ownerId", "==", user.uid),
      where("status", "==", "active")
    );

    const unsubEquipment = onSnapshot(equipmentQuery, (snapshot) => {
      setActiveListings(snapshot.size); // Simply counts the number of active documents
    });

    // 🚀 2. Listener for Pending Requests & Total Earnings
    // Assuming your bookings collection is named "rental_bookings"
    const bookingsQuery = query(
      collection(db, "rental_bookings"),
      where("ownerId", "==", user.uid)
    );

    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
      let pendingCount = 0;
      let earningsSum = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === "PENDING") {
          pendingCount++;
        }
        if (data.status === "COMPLETED" && data.financials?.listerEarnings) {
          earningsSum += data.financials.listerEarnings;
        }
      });

      setPendingRequests(pendingCount);
      setTotalEarned(earningsSum);
      setIsLoading(false);
    });

    // Cleanup listeners when the component unmounts
    return () => {
      unsubEquipment();
      unsubBookings();
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(customer)/index"); // Adjust if your root dashboard path is different
            }
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Equipment Hub</Text>
        <View style={{ width: 24 }} /> {/* Spacer for centering */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── Earnings Snapshot ── */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsIconBg}>
            <DollarSign size={28} color="#10b981" />
          </View>
          <View>
            <Text style={styles.earningsLabel}>Total Earned</Text>
            {isLoading ? (
               <ActivityIndicator size="small" color="#10b981" style={{ alignSelf: 'flex-start', marginTop: 4 }}/>
            ) : (
               <Text style={styles.earningsValue}>R {totalEarned.toFixed(2)}</Text>
            )}
          </View>
        </View>

        {/* ── Action Grid ── */}
        <Text style={styles.sectionTitle}>Manage Rentals</Text>
        
        <View style={styles.grid}>
          
          {/* Pending Requests (High Priority Alert) */}
          <TouchableOpacity 
            style={[styles.actionCard, pendingRequests > 0 && styles.actionCardAlert]}
            onPress={() => router.push("/(customer)/Rental-management/requests")}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: pendingRequests > 0 ? "#fee2e2" : "#f1f5f9" }]}>
                <Inbox size={24} color={pendingRequests > 0 ? "#ef4444" : "#64748b"} />
              </View>
              {pendingRequests > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingRequests} New</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTitle}>Requests</Text>
            <Text style={styles.cardSubtitle}>Accept or reject bookings</Text>
          </TouchableOpacity>

          {/* My Inventory */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push("/(customer)/Rental-management/inventory")}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: "#e0e7ff" }]}>
                <Box size={24} color="#6366f1" />
              </View>
            </View>
            <Text style={styles.cardTitle}>Inventory</Text>
            <Text style={styles.cardSubtitle}>
              {isLoading ? "..." : activeListings} Active Listings
            </Text>
          </TouchableOpacity>

        </View>

        {/* ── Add New Listing Button ── */}
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push("/(customer)/Rental-management/new-listing")}
        >
          <PlusCircle size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>Add New Equipment</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  scrollContent: { padding: 20 },
  
  // Earnings
  earningsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    shadowColor: "#cbd5e1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  earningsIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  earningsLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  earningsValue: { fontSize: 32, fontWeight: "900", color: "#0f172a" },

  // Grid
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 16 },
  grid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  actionCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    shadowColor: "#cbd5e1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  actionCardAlert: { borderColor: "#fecaca", borderWidth: 1, backgroundColor: "#fffbfb" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  iconBg: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  badge: { backgroundColor: "#ef4444", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  cardSubtitle: { fontSize: 12, fontWeight: "500", color: "#64748b" },

  // Primary Button
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#0ea5e9",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});