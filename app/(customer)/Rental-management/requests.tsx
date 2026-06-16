import { useRouter } from "expo-router";
import { ArrowLeft, Calendar, CheckCircle2, Star, User, XCircle } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// 🚀 Mock Data: Represents inbound Escrow requests
const MOCK_REQUESTS = [
  {
    id: "req_001",
    equipmentName: "Honda 5kVA Generator",
    requesterName: "Sipho M.",
    requesterRating: 4.9,
    startDate: "18 Jun",
    endDate: "20 Jun",
    durationDays: 3,
    totalPayout: 1350,
  },
  {
    id: "req_002",
    equipmentName: "Industrial Power Drill",
    requesterName: "Jason K.",
    requesterRating: 4.5,
    startDate: "22 Jun",
    endDate: "22 Jun",
    durationDays: 1,
    totalPayout: 150,
  },
];

export default function RequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState(MOCK_REQUESTS);

  // ── Action Handlers ──
  const handleAccept = (id: string, payout: number) => {
    Alert.alert(
      "Accept Booking",
      `Are you sure you want to lock in this rental? R ${payout} will be secured in Escrow.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept & Lock",
          style: "default",
          onPress: () => {
            // Remove from pending list on success
            setRequests((prev) => prev.filter((req) => req.id !== id));
            Alert.alert("Success", "Booking confirmed. The funds are secured in Escrow.");
          },
        },
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.alert(
      "Decline Booking",
      "Are you sure you want to decline? The customer will be refunded.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => setRequests((prev) => prev.filter((req) => req.id !== id)),
        },
      ]
    );
  };

  const renderRequestCard = ({ item }: { item: typeof MOCK_REQUESTS[0] }) => (
    <View style={styles.card}>
      
      {/* ── Requester Info ── */}
      <View style={styles.requesterRow}>
        <View style={styles.avatarPlaceholder}>
          <User size={20} color="#94a3b8" />
        </View>
        <View style={styles.requesterInfo}>
          <Text style={styles.requesterName}>{item.requesterName}</Text>
          <View style={styles.ratingRow}>
            <Star size={12} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingText}>{item.requesterRating} Rating</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>New Request</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Job Details ── */}
      <Text style={styles.equipmentName}>{item.equipmentName}</Text>
      
      <View style={styles.detailsRow}>
        <View style={styles.detailBox}>
          <Calendar size={14} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.detailText}>{item.startDate} - {item.endDate}</Text>
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailTextBold}>{item.durationDays} {item.durationDays === 1 ? 'Day' : 'Days'}</Text>
        </View>
      </View>

      {/* ── Financial Summary ── */}
      <View style={styles.payoutBox}>
        <Text style={styles.payoutLabel}>Guaranteed Payout</Text>
        <Text style={styles.payoutAmount}>R {item.totalPayout}</Text>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
        >
          <XCircle size={18} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.rejectText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAccept(item.id, item.totalPayout)}
        >
          <CheckCircle2 size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.acceptText}>Accept Booking</Text>
        </TouchableOpacity>
      </View>

    </View>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbound Requests</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySub}>No pending rental requests at the moment.</Text>
          </View>
        }
      />
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
  
  listContent: { padding: 20, paddingBottom: 100 },
  
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#cbd5e1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  
  requesterRow: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  requesterInfo: { flex: 1 },
  requesterName: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#64748b", marginLeft: 4 },
  
  badge: { backgroundColor: "#fef2f2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: "#ef4444", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 16 },
  
  equipmentName: { fontSize: 18, fontWeight: "900", color: "#1e293b", marginBottom: 12 },
  
  detailsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  detailBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  detailText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  detailTextBold: { fontSize: 13, fontWeight: "800", color: "#1e293b" },
  
  payoutBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  payoutLabel: { fontSize: 13, fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: 0.5 },
  payoutAmount: { fontSize: 24, fontWeight: "900", color: "#15803d" },
  
  actionRow: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
  },
  rejectButton: { backgroundColor: "#fef2f2" },
  rejectText: { color: "#ef4444", fontSize: 14, fontWeight: "800" },
  acceptButton: { backgroundColor: "#10b981" },
  acceptText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#64748b", textAlign: "center" },
});