import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import MapView, { Marker, PROVIDER_GOOGLE } from "../../../../components/Map";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";
import { useAuth } from "../../../../context/AuthContext";

const { width } = Dimensions.get("window");
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

interface HandoverOptionProps {
  active: boolean;
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function HandoverOption({
  active,
  title,
  sub,
  icon,
  onPress,
}: HandoverOptionProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.optionCard, active && styles.activeOption]}>
        <View style={[styles.iconBox, active && styles.activeIconBox]}>
          <Ionicons
            name={icon}
            size={24}
            color={active ? "white" : "#64748b"}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text
            style={[styles.optionTitle, active && styles.activeOptionTitle]}
          >
            {title}
          </Text>
          <Text style={styles.optionSub}>{sub}</Text>
        </View>
        {active && (
          <Ionicons name="checkmark-circle" size={24} color="#4f46e5" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ListStepFour() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const [deliveryOption, setDeliveryOption] = useState<"pickup" | "both">("pickup");
  const [isPublishing, setIsPublishing] = useState(false);

  // 🚀 Mapbox & Location State
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Default to Durban, updates when they search
  const [location, setLocation] = useState({
    lat: -29.8579,
    lng: 31.0292,
    address: "Umhlanga Rocks Dr, Durban",
  });

  // 🚀 Mapbox Search Engine
  const searchAddress = async (text: string) => {
    setSearchQuery(text);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          text
        )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=za`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error("Mapbox search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (feature: any) => {
    setLocation({
      address: feature.place_name,
      lng: feature.center[0],
      lat: feature.center[1],
    });
    setSearchQuery("");
    setSearchResults([]);
    setIsEditingLocation(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const publishListingFn = httpsCallable(functions, "publishListing");

      const response = await publishListingFn({
        title: params.title,
        description: params.description,
        category: params.category,
        images: params.images ? JSON.parse(params.images as string) : [],
        dailyRate: params.dailyRate,
        deposit: params.deposit,
        lat: location.lat, // 👈 Now completely dynamic
        lng: location.lng, // 👈 Now completely dynamic
        area: location.address, // 👈 Now completely dynamic
        handoverType: deliveryOption,
      });

      if ((response.data as any).success) {
        Alert.alert("Success!", "Your gear is live on Foona.");
        router.push("/(customer)");
      }
    } catch (error) {
      console.error("Final Submission Error:", error);
      Alert.alert("Error", "Could not publish listing.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: "100%" }]} />
          </View>
          <Text style={styles.stepText}>STEP 4 OF 4</Text>
          <Text style={styles.title}>Location & Handover</Text>
          <Text style={styles.sub}>
            Finalize where your gear lives and how it reaches customers.
          </Text>
        </View>

        {/* LOCATION BAY (MAP OR SEARCH) */}
        <View style={styles.mapCard}>
          {isEditingLocation ? (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search your address..."
                  value={searchQuery}
                  onChangeText={searchAddress}
                  autoFocus
                />
                {isSearching && <ActivityIndicator size="small" color="#4f46e5" />}
                <TouchableOpacity onPress={() => setIsEditingLocation(false)}>
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {searchResults.length > 0 && (
                <View style={styles.resultsList}>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.resultItem}
                      onPress={() => handleSelectLocation(item)}
                    >
                      <Ionicons name="location-outline" size={18} color="#64748b" style={{ marginRight: 12 }} />
                      <Text style={styles.resultText} numberOfLines={2}>
                        {item.place_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.mapWrapper}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={{
                  latitude: location.lat,
                  longitude: location.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={{ latitude: location.lat, longitude: location.lng }}>
                  <View style={styles.customMarker}>
                    <View style={styles.markerPulse} />
                  </View>
                </Marker>
              </MapView>
            </View>
          )}

          {!isEditingLocation && (
            <TouchableOpacity 
              style={styles.locationInfo} 
              onPress={() => setIsEditingLocation(true)}
            >
              <Ionicons name="location-sharp" size={18} color="#4f46e5" />
              <Text style={styles.addressText} numberOfLines={1}>{location.address}</Text>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* HANDOVER PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HANDOVER METHOD</Text>

          <HandoverOption
            active={deliveryOption === "pickup"}
            title="Customer Pickup"
            sub="Renter collects the gear from your location."
            icon="home-outline"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDeliveryOption("pickup");
            }}
          />

          <HandoverOption
            active={deliveryOption === "both"}
            title="Delivery & Pickup"
            sub="You offer delivery for a fee (Negotiable in chat)."
            icon="car-outline"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDeliveryOption("both");
            }}
          />
        </View>

        {/* PRIVACY SHIELD */}
        <View style={styles.privacyCard}>
          <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          <View style={styles.privacyTextContent}>
            <Text style={styles.privacyTitle}>Foona Privacy Shield</Text>
            <Text style={styles.privacySub}>
              Your exact address is only shared with verified renters after they
              pay the deposit.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FINAL ACTION */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={handlePublish}
          disabled={isPublishing || isEditingLocation}
        >
          <LinearGradient
            colors={isEditingLocation ? ["#94a3b8", "#cbd5e1"] : ["#0f172a", "#1e293b"]}
            style={styles.gradient}
          >
            {isPublishing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.publishText}>Complete Listing</Text>
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { paddingBottom: 140 },
  header: { paddingTop: 60, paddingHorizontal: 24 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  progressContainer: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    marginBottom: 15,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#10b981" },
  stepText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
  },
  title: { fontSize: 26, fontWeight: "900", color: "#0f172a", marginTop: 8 },
  sub: { fontSize: 15, color: "#64748b", marginTop: 8, lineHeight: 22 },

  mapCard: {
    margin: 24,
    borderRadius: 32,
    backgroundColor: "white",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 15,
  },
  mapWrapper: { height: 180, width: "100%" },
  map: { ...StyleSheet.absoluteFillObject },
  customMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  markerPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4f46e5",
    borderWidth: 2,
    borderColor: "white",
  },
  locationInfo: { padding: 20, flexDirection: "row", alignItems: "center" },
  addressText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  editText: { color: "#4f46e5", fontWeight: "800", fontSize: 13, paddingLeft: 10 },

  // Mapbox Search Styles
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
    minHeight: 180,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  resultsList: {
    marginTop: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resultText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },

  section: { paddingHorizontal: 24, marginTop: 10 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6366f1",
    letterSpacing: 1,
    marginBottom: 15,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: "white",
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  activeOption: { borderColor: "#4f46e5", backgroundColor: "#f5f3ff" },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  activeIconBox: { backgroundColor: "#4f46e5" },
  optionTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  activeOptionTitle: { color: "#4f46e5" },
  optionSub: { fontSize: 11, color: "#64748b", marginTop: 2 },

  privacyCard: {
    flexDirection: "row",
    margin: 24,
    padding: 20,
    backgroundColor: "#ecfdf5",
    borderRadius: 24,
    alignItems: "flex-start",
  },
  privacyTextContent: { flex: 1, marginLeft: 15 },
  privacyTitle: { fontSize: 14, fontWeight: "800", color: "#065f46" },
  privacySub: {
    fontSize: 12,
    color: "#065f46",
    opacity: 0.8,
    marginTop: 4,
    lineHeight: 18,
  },

  footer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    paddingHorizontal: 24,
  },
  publishBtn: { borderRadius: 24, overflow: "hidden" },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  publishText: { color: "white", fontWeight: "800", fontSize: 17 },
});