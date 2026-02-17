import { db } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "context/AuthContext";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get("window");

const mapStyle = [
  { featureType: "all", stylers: [{ saturation: -80 }, { lightness: 20 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", stylers: [{ color: "#c9c9c9" }] },
];

export default function CustomerHome() {
  const navigation: any = useNavigation();
  const { user } = useAuth();
  const [latestJobId, setLatestJobId] = useState<string | null>(null);

  const [mockPros] = useState([
    { id: "1",  title: "Thabo - Cleaner", latitude: -29.8579, longitude: 31.0292, icon: "sparkles" },
    { id: "2",  title: "Sarah - Plumber", latitude: -29.8565, longitude: 31.0321, icon: "water" },
    { id: "3", title: "Sizwe - Electrician", latitude: -29.859, longitude: 31.031, icon: "flash" },
  ]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "jobs"),
      where("customerId", "==", user.uid),
      where("status", "in", ["pending", "open"]),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const jobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          createdAt: doc.data().createdAt,
        }));
        jobs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setLatestJobId(jobs[0].id);
      } else {
        setLatestJobId(null);
      }
    }, (error) => console.error(error));
    return () => unsubscribe();
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
        customMapStyle={mapStyle}
      >
        {mockPros.map((pro) => (
  <Marker
    key={pro.id}
    coordinate={{ latitude: pro.latitude, longitude: pro.longitude }}
    title={pro.title}
  >
    <View style={styles.customMarker}>
       <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.markerGradient}>
          {/* Dynamic icon based on pro service */}
          <Ionicons name={pro.icon as any} size={14} color="white" />
       </LinearGradient>
       <View style={styles.markerTail} />
    </View>
  </Marker>
))}
      </MapView>

      <TouchableOpacity style={styles.hamburger} onPress={() => navigation.openDrawer()}>
        <Ionicons name="menu-outline" size={24} color="#1f2937" />
      </TouchableOpacity>

      <View style={styles.bottomSheetContainer}>
        <View style={styles.cardRow}>
          <MainActionCard 
            colors={['#6366f1', '#4f46e5']} 
            icon="add-circle" 
            label="Book Now" 
            onPress={() => router.push("/SelectServices")} 
          />
          <MainActionCard 
            colors={['#111827', '#374151']} 
            icon="flash" 
            label="View Bids" 
            badge={!!latestJobId}
            onPress={() => {
              if (!latestJobId) {
                Alert.alert("No Active Job", "Create a job first to view bids.");
                return;
              }
              router.push(`/(customer)/SelectBid/${latestJobId}`);
            }} 
          />
        </View>

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
        <TabItem icon="receipt-outline" label="Orders" onPress={() => router.push("/History")} />
        <TabItem icon="person-outline" label="Account" onPress={() => router.push("/profile")} />
      </View>
    </View>
  );
}

// --- SUB-COMPONENTS ---
function MainActionCard({ colors, icon, label, onPress, badge }: any) {
  return (
    <TouchableOpacity style={styles.mainCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={colors} style={styles.cardGradient}>
        {badge && <View style={styles.badge} />}
        <Ionicons name={icon} size={28} color="white" />
        <Text style={styles.cardLabel}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function AddressButton({ icon, label }: any) {
  return (
    <TouchableOpacity style={styles.addressBtn}>
      <Ionicons name={icon} size={18} color="#4f46e5" />
      <Text style={styles.addressBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabItem({ icon, label, active, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tab}>
      <Ionicons name={icon} size={22} color={active ? "#4f46e5" : "#9ca3af"} />
      <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
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
  customMarker: { alignItems: 'center', justifyContent: 'center' },
  markerGradient: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  markerTail: {
    width: 2,
    height: 4,
    backgroundColor: 'white',
  },
  bottomSheetContainer: {
    position: "absolute",
    bottom: 100,
    width: width - 32,
    alignSelf: 'center',
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 20,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  mainCard: { flex: 1, height: 100 },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: { color: 'white', fontWeight: '700', marginTop: 8, fontSize: 14 },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  searchText: { flex: 1, marginLeft: 12, color: '#9ca3af', fontWeight: '500' },
  searchDivider: { width: 1, height: 20, backgroundColor: '#e5e7eb', marginHorizontal: 12 },
  addressRow: { flexDirection: 'row', gap: 10 },
  addressBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 16,
  },
  addressBtnText: { marginLeft: 8, fontWeight: '700', color: '#1f2937', fontSize: 13 },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: '600' },
  activeTabLabel: { color: '#4f46e5' },
});