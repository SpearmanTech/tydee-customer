import { db } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
// Adjust the path to wherever you created the components!
import MapView, { Marker, PROVIDER_GOOGLE } from '../../components/Map';

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

// helper components used in CustomerHome

type MainActionCardProps = {
  colors: readonly any[]; // LinearGradient expects a readonly tuple, cast later as needed
  icon: any; // Ionicons name union is huge; allow any to avoid mismatches
  label: string;
  badge?: boolean;
  onPress: () => void;
};

function MainActionCard({
  colors,
  icon,
  label,
  badge,
  onPress,
}: MainActionCardProps) {
  return (
    <TouchableOpacity style={styles.mainCard} onPress={onPress}>
      <LinearGradient colors={colors as any} style={styles.cardGradient}>
        <Ionicons name={icon as any} size={28} color="white" />
        <Text style={styles.cardLabel}>{label}</Text>
        {badge && <View style={styles.badge} />}
      </LinearGradient>
    </TouchableOpacity>
  );
}

type AddressButtonProps = {
  icon: string;
  label: string;
  onPress?: () => void;
};

function AddressButton({ icon, label, onPress }: AddressButtonProps) {
  return (
    <TouchableOpacity style={styles.addressBtn} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#4f46e5" />
      <Text style={styles.addressBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

type TabItemProps = {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

function TabItem({ icon, label, active = false, onPress }: TabItemProps) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <Ionicons name={icon} size={24} color={active ? "#4f46e5" : "#9ca3af"} />
      <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CustomerHome() {
  const navigation: any = useNavigation();
  const { user } = useAuth();
  const [latestJobId, setLatestJobId] = useState<string | null>(null);

  // NEW STATES FOR REFINEMENT
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeRental, setActiveRental] = useState<any>(null); // To track an ongoing gear rental

  const toggleExpansion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Existing Jobs Logic
    const q = query(
      collection(db, "jobs"),
      where("customerId", "==", user.uid),
      where("status", "in", ["pending", "open"]),
    );
    const unsubJobs = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const jobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          createdAt: doc.data().createdAt,
        }));
        jobs.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
        );
        setLatestJobId(jobs[0].id);
      } else {
        setLatestJobId(null);
      }
    });

    // 2. Active Rental Logic (Placeholder for Rent Side Refinement)
    // In production, you'd query 'rentals' collection where status is 'active'
    // For now, we'll keep it null unless you want to mock one.

    return () => unsubJobs();
  }, [user?.uid]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: -29.8579,
          longitude: 31.0292,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        }}
        // customMapStyle={mapStyle} // Removed for brevity, keep yours
      >
        {/* Existing Markers */}
      </MapView>

      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => navigation.openDrawer()}
      >
        <Ionicons name="menu-outline" size={24} color="#1f2937" />
      </TouchableOpacity>

      <View style={styles.bottomSheetContainer}>
        {/* IF ACTIVE RENTAL EXISTS: Show priority card */}
        {activeRental && (
          <TouchableOpacity style={styles.activeRentalBanner}>
            <LinearGradient
              colors={["#4f46e5", "#3730a3"]}
              style={styles.activeGradient}
            >
              <Ionicons name="time" size={18} color="white" />
              <Text style={styles.activeText}>
                Active Rental: Return in 2 days
              </Text>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.cardRow}>
          <MainActionCard
            colors={["#6366f1", "#4f46e5"]}
            icon="add-circle"
            label="Book Now"
            onPress={() => router.push("/SelectServices")}
          />
          <MainActionCard
            colors={["#111827", "#374151"]}
            icon="flash"
            label="View Bids"
            badge={!!latestJobId}
            onPress={() => {
              if (!latestJobId) {
                Alert.alert(
                  "No Active Job",
                  "Create a job first to view bids.",
                );
                return;
              }
              router.push(`/(customer)/SelectBid/${latestJobId}`);
            }}
          />
        </View>

        {/* REFINED: Expandable Equipment Section */}
        {isExpanded && (
          <View style={[styles.cardRow, { marginTop: -8 }]}>
            <MainActionCard
              colors={["#10b981", "#059669"]}
              icon="cart-outline"
              label="Rent Gear"
              onPress={() => router.push("/equipment/Rent/rent-marketplace")}
            />
            <MainActionCard
              colors={["#f59e0b", "#d97706"]}
              icon="list-outline"
              label="List Gear"
              onPress={() => router.push("/equipment/List/list-equipment")}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.expandToggle}
          onPress={toggleExpansion}
          activeOpacity={0.7}
        >
          <Text style={styles.expandText}>
            {isExpanded ? "Hide Equipment" : "Rent or List Equipment"}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color="#6366f1"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.searchBar} activeOpacity={0.9}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <Text style={styles.searchText}>Want to schedule a service?</Text>
          <View style={styles.searchDivider} />
          <TouchableOpacity onPress={() => router.push("/schedule")}>
            <Ionicons name="options-outline" size={20} color="#6366f1" />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.addressRow}>
          <AddressButton icon="home-outline" label="Home" />
          <AddressButton icon="business-outline" label="Office" />
        </View>
      </View>

      <View style={styles.tabBar}>
        <TabItem icon="map" label="Explore" active />
        <TabItem
          icon="receipt-outline"
          label="Orders"
          onPress={() => router.push("/History")}
        />
        <TabItem
          icon="person-outline"
          label="Account"
          onPress={() => router.push("/profile")}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  hamburger: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  customMarker: { alignItems: "center", justifyContent: "center" },
  markerGradient: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "white",
  },
  markerTail: {
    width: 2,
    height: 4,
    backgroundColor: "white",
  },
  bottomSheetContainer: {
    position: "absolute",
    bottom: 100,
    width: width - 32,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 20,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  cardRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  mainCard: { flex: 1, height: 100 },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardLabel: { color: "white", fontWeight: "700", marginTop: 8, fontSize: 14 },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "white",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 16,
  },
  searchText: { flex: 1, marginLeft: 12, color: "#9ca3af", fontWeight: "500" },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 12,
  },
  addressRow: { flexDirection: "row", gap: 10 },
  addressBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 16,
  },
  addressBtnText: {
    marginLeft: 8,
    fontWeight: "700",
    color: "#1f2937",
    fontSize: 13,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    backgroundColor: "white",
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  tab: { flex: 1, alignItems: "center" },
  tabLabel: { fontSize: 11, color: "#9ca3af", marginTop: 4, fontWeight: "600" },
  activeTabLabel: { color: "#4f46e5" },

  // NEW REFINEMENT STYLES
  expandToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  expandText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4f46e5",
    marginRight: 6,
  },
  activeRentalBanner: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  activeGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  activeText: {
    flex: 1,
    color: "white",
    fontWeight: "700",
    fontSize: 13,
  },
});
