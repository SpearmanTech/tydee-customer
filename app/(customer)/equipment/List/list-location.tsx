import { functions } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { httpsCallable } from "firebase/functions";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "../../../../components/Map";
import { useAuth } from "../../../../context/AuthContext";

const { width } = Dimensions.get("window");

// 🚀 Google Places API (New) — web-first MVP, client-side, restricted key
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

if (__DEV__ && !GOOGLE_PLACES_API_KEY) {
  console.error(
    "[list-location] EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is undefined. " +
    "Address search will not work. Add it to your .env and restart Metro."
  );
}

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

type SelectedLocation = {
  lat: number;
  lng: number;
  address: string;
  placeId: string;
};

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

// Generates a v4-style UUID for Places session tokens.
// crypto.randomUUID() is available in all evergreen browsers (web target for this MVP).
function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator (only reached on environments without crypto.randomUUID)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ListStepFour() {
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [deliveryOption, setDeliveryOption] = useState<"pickup" | "both">("pickup");
  const [isPublishing, setIsPublishing] = useState(false);

  // 🚀 Google Places & Location State
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Session token lives for the duration of one search session (first keystroke -> selection).
  // Reusing it across the autocomplete calls and the terminating geocode lookup is what
  // makes this bill at the cheap per-request/session rate instead of per-keystroke.
  const sessionTokenRef = useRef<string | null>(null);

  const getSessionToken = () => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }
    return sessionTokenRef.current;
  };

  const retireSessionToken = () => {
    sessionTokenRef.current = null;
  };

  useEffect(() => {
    const getUserLocation = async () => {
      setIsFetchingLocation(true);
      setLocationError(null);

      // On web, geolocation is opportunistic only — it's a convenience pre-fill,
      // never a silent default. If it fails for any reason, we drop straight into
      // the search UI with no placeholder address and no fallback coordinates.
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("permission_denied");
          setIsEditingLocation(true);
          setIsFetchingLocation(false);
          return;
        }

        const userLocation = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = userLocation.coords;

        const resolved = await reverseGeocode(latitude, longitude);
        if (!resolved) {
          // Reverse geocode came back empty — do not default to "Current Location"
          // or any hardcoded address. Force manual search instead.
          setLocationError("reverse_geocode_empty");
          setIsEditingLocation(true);
          setIsFetchingLocation(false);
          return;
        }

        setLocation(resolved);
      } catch (error) {
        console.error("Error fetching initial location:", error);
        setLocationError("geolocation_failed");
        setIsEditingLocation(true);
      } finally {
        setIsFetchingLocation(false);
      }
    };

    getUserLocation();
  }, []);

  // Resolves a lat/lng pair to a formatted address + place_id via the Geocoding API.
  // Used only for the initial GPS pre-fill (no autocomplete session involved here).
  const reverseGeocode = async (
    latitude: number,
    longitude: number
  ): Promise<SelectedLocation | null> => {
    try {
      const url = `${GEOCODE_URL}?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.results?.length) {
        return null;
      }

      const best = data.results[0];
      return {
        lat: latitude,
        lng: longitude,
        address: best.formatted_address,
        placeId: best.place_id,
      };
    } catch (error) {
      console.error("Reverse geocode error:", error);
      return null;
    }
  };

  // 🚀 Google Places Autocomplete (New) — as-you-type predictions
  const searchAddress = async (text: string) => {
    setSearchQuery(text);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(AUTOCOMPLETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY as string,
          // Only the fields we actually render in the dropdown — keeps this on the
          // cheap end of the Autocomplete SKU and avoids pulling unused data.
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({
          input: text,
          sessionToken: getSessionToken(),
          includedRegionCodes: ["za"],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Places Autocomplete error:", data);
        setSearchResults([]);
        return;
      }

      const predictions = (data.suggestions || [])
        .map((s: any) => s.placePrediction)
        .filter(Boolean);

      setSearchResults(predictions);
    } catch (error) {
      console.error("Places Autocomplete request failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Terminates the autocomplete session by resolving the chosen place via the
  // Geocoding API (cheaper than Place Details (New) when only lat/lng/address is needed).
  const handleSelectLocation = async (prediction: any) => {
    const placeId = prediction.placeId;
    const label =
      prediction.text?.text ||
      prediction.structuredFormat?.mainText?.text ||
      "";

    setIsSearching(true);
    try {
      const url = `${GEOCODE_URL}?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&sessiontoken=${getSessionToken()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.results?.length) {
        Alert.alert(
          "Couldn't load that address",
          "Please try selecting it again or search for a different address."
        );
        return;
      }

      const result = data.results[0];
      const { lat, lng } = result.geometry.location;

      setLocation({
        lat,
        lng,
        address: result.formatted_address || label,
        placeId: result.place_id || placeId,
      });
      setLocationError(null);
      setSearchQuery("");
      setSearchResults([]);
      setIsEditingLocation(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Geocode lookup failed:", error);
      Alert.alert("Error", "Could not resolve that address. Please try again.");
    } finally {
      setIsSearching(false);
      // Session is done — selection made, geocode terminating call sent.
      retireSessionToken();
    }
  };

  const handlePublish = async () => {
    if (!location) {
      Alert.alert(
        "Address required",
        "Please search for and select a valid address before publishing."
      );
      setIsEditingLocation(true);
      return;
    }

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
        lat: location.lat,
        lng: location.lng,
        area: location.address,
        placeId: location.placeId,
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

  const hasValidLocation = !!location;

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
          {isFetchingLocation ? (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={styles.mapLoadingText}>Finding you...</Text>
            </View>
          )
            : isEditingLocation || !hasValidLocation ? (
              <View style={styles.searchContainer}>
                {locationError && (
                  <Text style={styles.locationErrorText}>
                    {locationError === "permission_denied"
                      ? "Location access was denied. Search for your address below."
                      : "We couldn't detect your location. Search for your address below."}
                  </Text>
                )}
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
                  {hasValidLocation && (
                    <TouchableOpacity onPress={() => setIsEditingLocation(false)}>
                      <Ionicons name="close-circle" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                {searchResults.length > 0 && (
                  <View style={styles.resultsList}>
                    {searchResults.map((item) => (
                      <TouchableOpacity
                        key={item.placeId}
                        style={styles.resultItem}
                        onPress={() => handleSelectLocation(item)}
                      >
                        <Ionicons name="location-outline" size={18} color="#64748b" style={{ marginRight: 12 }} />
                        <Text style={styles.resultText} numberOfLines={2}>
                          {item.text?.text}
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

          {!isEditingLocation && hasValidLocation && (
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
          disabled={isPublishing || isEditingLocation || !hasValidLocation}
        >
          <LinearGradient
            colors={
              isEditingLocation || !hasValidLocation
                ? ["#94a3b8", "#cbd5e1"]
                : ["#0f172a", "#1e293b"]
            }
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
  mapLoadingContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  mapLoadingText: {
    color: "#475569",
    fontWeight: "600",
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

  // Search styles
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
    minHeight: 180,
  },
  locationErrorText: {
    fontSize: 12,
    color: "#b45309",
    backgroundColor: "#fffbeb",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
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