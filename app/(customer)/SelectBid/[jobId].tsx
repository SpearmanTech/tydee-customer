import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Clock, DollarSign, ShieldCheck, Star } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, Layout, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore"; // Removed collection, query, orderBy imports
import { db } from "@/firebase/firebase"; 

/* ---------------- TYPES ---------------- */
type Bid = {
  professionalId: string;
  amount: number;
  eta?: number;
  name?: string;
  rating?: number;
  profileImage?: string;
  timestamp?: string;
  id: string;
  
};

type Job = {
  uid: string;
  status: string;
  bids?: Bid[];
  title?: string;
  createdAt?: any;
  startPin?: string;
  bidCount?: number; // NEW: For quick count
  hasBids?: boolean;
};

const formatZAR = (value: number) => `R ${Number(value || 0).toFixed(0)}`;

/* ---------------- ANIMATED BID CARD ---------------- */
function AnimatedBidCard({ bid, onAccept, disabled }: { bid: Bid; onAccept: (b: Bid) => void; disabled?: boolean; }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = 1.06;
    const t = setTimeout(() => (scale.value = withSpring(1)), 150);
    return () => clearTimeout(t);
  }, [bid.amount]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View layout={Layout.springify()} entering={FadeInDown} style={[styles.bookingCard, animatedStyle]}>
      <View style={styles.bookingHeader}>
        <View style={styles.proInfoRow}>
          <Image source={{ uri: bid.profileImage || "https://via.placeholder.com/150" }} style={styles.profileImage} />
          <View>
            <Text style={styles.proName}>{bid.name ?? "Professional"}</Text>
            <View style={styles.ratingRow}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.ratingText}>{Number(bid.rating || 0).toFixed(1)}</Text>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={10} color="#059669" />
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.bookingPrice}>{formatZAR(bid.amount)}</Text>
      </View>

      <View style={styles.metaContainer}>
        <View style={styles.rowSmall}>
          <Clock size={16} color="#6b7280" />
          <Text style={styles.bookingMetaText}>ETA: {bid.eta || "--"} mins away</Text>
        </View>
      </View>

      <View style={styles.bookingFooter}>
        <TouchableOpacity style={styles.viewBtn}><Text style={styles.viewBtnText}>View Profile</Text></TouchableOpacity>
        <TouchableOpacity 
          style={[styles.startBtn, disabled && { opacity: 0.6 }]} 
          onPress={() => onAccept(bid)} 
          disabled={disabled}
        >
          <Text style={styles.startBtnText}>{disabled ? "Processing..." : "Accept Bid"}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

/* ---------------- MAIN SCREEN ---------------- */
export default function BidSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract ID with prioritizing segments then query params
  const jobId = params.jobId || params.id || Object.values(params)[0];
  console.log('🆔 Route params:', params);
   console.log('🆔 Extracted jobId:', jobId);
   console.log('🆔 jobId type:', typeof jobId);
  const [job, setJob] = useState<Job | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("60:00");
  const [sortType, setSortType] = useState<"default" | "price" | "rating" | "eta">("default");

useEffect(() => {
  if (!jobId) {
    console.log('❌ No jobId provided');
    return;
  }

  console.log('🔍 Setting up listener for jobId:', jobId);

  const jobUnsub = onSnapshot(
    doc(db, "jobs", jobId), 
    (snap) => {
      console.log('📡 Snapshot received. Exists?', snap.exists());
      
      if (snap.exists()) {
        const data = snap.data() as Job;
        console.log('📦 Job data:', data);
        console.log('💰 Bids array:', data.bids);
        console.log('📊 Bid count:', data.bids?.length || 0);
        
        setJob(data);
        const processedBids = (data.bids || []).map(bid => ({
          ...bid,
          id: bid.id || bid.professionalId
        }));
        
        console.log('✅ Processed bids:', processedBids);
        setBids(processedBids);
      }
      setLoading(false);
    }, 
    (error) => {
      console.error("❌ Job listener error:", error);
      setLoading(false);
    }
  );

  return () => {
    console.log('🧹 Cleaning up listener');
    jobUnsub();
  };
}, [jobId]);

  // 3. ROBUST SORTING
  const sortedBids = useMemo(() => {
    if (!bids || bids.length === 0) return [];
    
    const result = [...bids];
    if (sortType === "default") {
      result.sort((a, b) => new Date(b.timestamp ?? '0').getTime() - new Date(a.timestamp ?? '0').getTime()); // Newest first
    } else if (sortType === "price") result.sort((a, b) => a.amount - b.amount);
    else if (sortType === "rating") result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortType === "eta") result.sort((a, b) => (a.eta ?? 0) - (b.eta ?? 0));
    
    return result;
  }, [bids, sortType]);

  const handleAcceptBid = async (bid: Bid) => {
    if (!jobId || processingId) return;
    setProcessingId(bid.professionalId);
    
    try {
      const jobRef = doc(db, "jobs", jobId);
      await updateDoc(jobRef, {
        status: "assigned",
        assigned_professional_id: bid.professionalId,
        final_price: Number(bid.amount),
        bidAcceptedAt: serverTimestamp(),
        accepted_bid_details: {
          name: bid.name ?? "Professional",
          amount: bid.amount,
          professionalId: bid.professionalId,
        }
      });

      router.push({
        pathname: "/(customer)/BookingConfirmation",
        params: { 
          jobId, 
          proName: bid.name ?? "Professional", 
          bidAmount: bid.amount.toString(),
          startPin: job?.startPin || "0000"
        },
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not assign professional.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4f46e5" size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#111827" size={28} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Select Professional</Text>
          <Text style={styles.timerText}>{job?.title || "Searching..."} • {timeLeft}</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={{ height: 100 }} />

          <Text style={styles.sectionTitle}>Sort Results By</Text>
          <View style={styles.sortRow}>
            {(["price", "rating", "eta"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.sortBtn, sortType === type && styles.sortBtnActive]}
                onPress={() => setSortType(type)}
              >
                <Text style={[styles.sortBtnText, sortType === type && styles.sortBtnTextActive]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {sortedBids.length === 0 ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color="#4f46e5" size="small" />
              <Text style={styles.emptyTitle}>Waiting for live bids...</Text>
              <Text style={styles.debugIdText}>ID: {jobId}</Text>
            </View>
          ) : (
            sortedBids.map((bid, index) => (
              <AnimatedBidCard
                key={`${bid.professionalId}-${index}`}
                bid={bid}
                onAccept={handleAcceptBid}
                disabled={!!processingId}
              />
            ))
          )}
        </ScrollView>

        <View style={styles.floatingStatusCard}>
          <View style={styles.zapWrap}><DollarSign size={20} color="#059669" /></View>
          <View>
            <Text style={styles.statusTitle}>Market Active</Text>
            <Text style={styles.statusSub}>{bids.length} {bids.length === 1 ? 'bid' : 'bids'} received</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", zIndex: 20 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  timerText: { fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: '500' },
  backBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  floatingStatusCard: { position: 'absolute', top: 16, left: 16, right: 16, backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", elevation: 12, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, zIndex: 10 },
  zapWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ecfdf5", justifyContent: "center", alignItems: "center", marginRight: 12 },
  statusTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  statusSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sortRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  sortBtnActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  sortBtnText: { fontSize: 11, fontWeight: "800", color: "#6b7280" },
  sortBtnTextActive: { color: "#fff" },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 100 },
  emptyTitle: { fontSize: 15, color: "#9ca3af", marginTop: 16, fontWeight: "600" },
  debugIdText: { fontSize: 10, color: '#d1d5db', marginTop: 8 },
  bookingCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb", elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  proInfoRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  profileImage: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#f3f4f6' },
  proName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  ratingText: { fontSize: 12, color: "#111827", fontWeight: '700' },
  verifiedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#ecfdf5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 4, marginLeft: 8 },
  verifiedText: { fontSize: 10, fontWeight: "800", color: "#059669" },
  bookingPrice: { fontSize: 20, fontWeight: "900", color: "#059669" },
  metaContainer: { gap: 8, marginBottom: 16, paddingLeft: 60 },
  rowSmall: { flexDirection: "row", alignItems: "center", gap: 6 },
  bookingMetaText: { fontSize: 12, color: "#6b7280", fontWeight: '600' },
  bookingFooter: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: '#f9fafb', paddingTop: 16 },
  viewBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center" },
  viewBtnText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  startBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#111827", justifyContent: "center", alignItems: "center" },
  startBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});