import { db } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { SafeAreaView, Platform, StatusBar } from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import formatCurrency from "../../utils/currency";
import Animated, { FadeInDown } from "react-native-reanimated";

const SUB_SERVICE_CONFIGS: Record<string, any[]> = {
  // --- HAIR SERVICES ---
  "Braiding (Knotless)": [
    {
      key: "hair_length",
      type: "select",
      label: "Desired Length",
      options: ["Shoulder", "Mid-back", "Waist", "Knee"],
      icon: "ruler",
    },
    {
      key: "braid_size",
      type: "select",
      label: "Braid Size",
      options: ["Large", "Medium", "Small/Smedium"],
      icon: "grid",
    },
    {
      key: "provide_hair",
      type: "toggle",
      label: "Pro should provide hair extensions",
      hint: "Pros usually charge an extra fee for purchasing hair.",
    },
    {
      key: "hair_washed",
      type: "toggle",
      label: "Hair is already washed & blown out",
      icon: "water",
    },
  ],
  "Hair Styling & Install": [
    {
      key: "service_type",
      type: "select",
      label: "Styling Type",
      options: ["Wig Install", "Silk Press", "Pony Tail", "Wash & Set"],
      icon: "content-cut",
    },
    {
      key: "is_new_wig",
      type: "toggle",
      label: "New Wig? (Requires plucking/bleaching)",
      icon: "sparkles",
    },
    {
      key: "travel_setup",
      type: "toggle",
      label: "I have a chair and mirror ready",
      hint: "Helps the pro know if they need to bring a portable chair.",
    },
  ],

  // --- BEAUTY SERVICES ---
  "Nail Tech (Full Set)": [
    {
      key: "set_type",
      type: "select",
      label: "Set Type",
      options: ["Acrylic Full Set", "Gel Overlay", "Biab"],
      icon: "hand-back-left",
    },
    {
      key: "nail_art_count",
      type: "counter",
      label: "Nails with Art/Designs",
      icon: "brush",
    },
    {
      key: "needs_soak_off",
      type: "toggle",
      label: "I need a soak-off/removal",
      hint: "Adds 30-45 mins to the appointment.",
    },
    {
      key: "pedicure_add",
      type: "toggle",
      label: "Add basic pedicure?",
      icon: "footsteps",
    },
  ],
  "Makeup Artist (Glam)": [
    {
      key: "occasion",
      type: "select",
      label: "Occasion",
      options: ["Soft Glam", "Full Bridal", "Editorial/Photoshoot"],
      icon: "camera",
    },
    {
      key: "lash_preference",
      type: "select",
      label: "Lashes",
      options: ["Strip Lashes", "Individual Clusters", "No Lashes"],
      icon: "eye",
    },
    {
      key: "guest_count",
      type: "counter",
      label: "Additional people for makeup",
      icon: "people",
    },
  ],

  // --- GROOMING ---
  "Mobile Barbering": [
    {
      key: "cut_type",
      type: "select",
      label: "Service",
      options: [
        "Haircut Only",
        "Beard Trim/Lineup",
        "Full Service (Hair & Beard)",
      ],
      icon: "content-cut",
    },
    {
      key: "kids_count",
      type: "counter",
      label: "Number of Kids (under 12)",
      icon: "person",
    },
    {
      key: "senior_count",
      type: "counter",
      label: "Number of Seniors",
      icon: "person-cane",
    },
  ],
  "General/Basic Cleaning": [
    {
      key: "rooms_count",
      type: "counter",
      label: "Living Areas / Lounges",
      icon: "sofa",
    },
    { key: "bedrooms_count", type: "counter", label: "Bedrooms", icon: "bed" },
    {
      key: "bathrooms_count",
      type: "counter",
      label: "Bathrooms",
      icon: "bath",
    },
    {
      key: "provide_materials",
      type: "toggle",
      label: "I will provide cleaning materials",
      hint: "Pros charge more if they bring their own.",
    },
    {
      key: "has_pets",
      type: "toggle",
      label: "Has Pets? (Hair removal)",
      icon: "dog",
    },
  ],
  "Spring Clean": [
    { key: "rooms_count", type: "counter", label: "Total Rooms", icon: "home" },
    {
      key: "inside_cupboards",
      type: "toggle",
      label: "Clean inside cupboards?",
      icon: "archive",
    },
    {
      key: "windows_count",
      type: "counter",
      label: "Interior Window Panes",
      icon: "layout",
    },
    {
      key: "is_move_out",
      type: "toggle",
      label: "Is this a Move-out / Move-in clean?",
      hint: "Requires empty-house deep scrubbing.",
    },
  ],
  "Oven Cleaning": [
    {
      key: "ovens_count",
      type: "counter",
      label: "Number of Ovens",
      icon: "hash",
    },
    {
      key: "is_gas",
      type: "toggle",
      label: "Is it a Gas Oven?",
      icon: "flame",
    },
    {
      key: "include_hob",
      type: "toggle",
      label: "Include Stove-top / Hob?",
      icon: "disc",
    },
  ],

  "Leak Repair": [
    {
      key: "num_leaks",
      type: "counter",
      label: "Number of Leaks",
      icon: "droplets",
    },
    {
      key: "pipes_behind_wall",
      type: "toggle",
      label: "Pipes behind walls/under tiles?",
      icon: "wall",
    },
    {
      key: "is_emergency",
      type: "toggle",
      label: "Active Flooding / Emergency?",
      icon: "alert-octagon",
    },
    {
      key: "fixture_type",
      type: "picker",
      label: "Primary Fixture",
      options: ["Tap", "Toilet", "Shower", "External Pipe"],
    },
  ],
  "Geyser Service": [
    {
      key: "geyser_age",
      type: "counter",
      label: "Approx Age of Geyser (Years)",
      icon: "calendar",
    },
    {
      key: "geyser_location",
      type: "picker",
      label: "Location",
      options: ["Roof/Ceiling", "External Wall", "Garage"],
    },
    {
      key: "is_solar",
      type: "toggle",
      label: "Solar Integrated System?",
      icon: "sun",
    },
    {
      key: "is_tripping",
      type: "toggle",
      label: "Tripping Electricity?",
      icon: "zap",
    },
  ],

  // --- OUTDOOR CATEGORY ---
  "Gutter Cleaning": [
    {
      key: "floors_count",
      type: "counter",
      label: "Number of Stories",
      icon: "layers",
    },
    {
      key: "gutter_guards",
      type: "toggle",
      label: "Gutter guards installed?",
      hint: "Takes longer to remove and replace.",
    },
    {
      key: "is_accessible",
      type: "toggle",
      label: "Roof is walkable?",
      icon: "check-circle",
    },
    {
      key: "take_debris",
      type: "toggle",
      label: "Pro must bag and take away debris?",
      icon: "trash-2",
    },
  ],
};

export default function BookingScreen() {
  const { user, setActiveJobId } = useAuth();
  const router = useRouter();
  const googleAutocompleteRef = useRef<any>(null);
  const { categoryId, subServiceId } = useLocalSearchParams<{
    categoryId: string;
    subServiceId: string;
  }>();

  const [serviceDetails, setServiceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    address: "",
    city: "",
    urgency: "standard",
    scheduledDate: "",
  });

  useEffect(() => {
    const initializeBooking = async () => {
      try {
        if (!categoryId || !user) return;

        const serviceSnap = await getDoc(
          doc(db, "services", categoryId as string),
        );
        const userSnap = await getDoc(doc(db, "customers", user.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};

        const savedAddress = userData.homeLocation?.address || "";
        const savedCity = userData.homeLocation?.city || "";

        if (serviceSnap.exists()) {
          const data =
            serviceSnap.data()[subServiceId as string] ||
            serviceSnap.data().subServices?.[subServiceId as string];
          setServiceDetails(data);

          const config = SUB_SERVICE_CONFIGS[subServiceId as string] || [];

          setFormData((prev) => {
            const initial: any = {
              ...prev,
              address: savedAddress,
              city: savedCity,
            };
            config.forEach((f) => {
              if (!(f.key in initial))
                initial[f.key] = f.type === "counter" ? 0 : false;
            });
            return initial;
          });

          if (savedAddress && googleAutocompleteRef.current) {
            googleAutocompleteRef.current.setAddressText(savedAddress);
          }
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    };
    initializeBooking();
  }, [categoryId, subServiceId, user?.uid]);

  const calculateTotal = () => {
    if (!serviceDetails) return 0;
    let total = serviceDetails.base_price || 0;
    if (serviceDetails.price_per_room && formData.rooms_count) {
      total += formData.rooms_count * serviceDetails.price_per_room;
    }

    const multipliers: any = {
      urgent: 2,
      standard: 1.5,
      scheduled: 1.0,
    };

    return Math.round(total * (multipliers[formData.urgency] || 1.0));
  };

  const handleSubmit = async () => {
    if (!formData.address || !formData.city) {
      Alert.alert(
        "Missing Info",
        "Please provide a delivery address and city.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const customerSnap = await getDoc(doc(db, "customers", user!.uid));
      let handshakePin = "0000";
      let customerName = "Foona Customer";

      if (customerSnap.exists()) {
        const cData = customerSnap.data();
        handshakePin = String(cData.permanentPin || cData.startPin || "0000");
        customerName = cData.full_name || user?.displayName || customerName;
      }

      const calculatedBudget = calculateTotal();

      const jobPayload = {
        title: serviceDetails?.name || "Service Request",
        category: categoryId,
        subService: subServiceId,
        description: `${serviceDetails?.name} service at ${formData.address}`,
        status: "pending",
        bid_status: "open",
        budget: calculatedBudget,
        final_price: calculatedBudget,
        customerId: user!.uid,
        displayName: customerName,
        startPin: handshakePin,
        location: {
          address: formData.address,
          city: formData.city,
        },
        details: {
          urgency: formData.urgency,
          scheduledDate: formData.scheduledDate || null,
        },
        propertyDetails: { ...formData },
        bids: [],
        bidders: [],
        createdAt: serverTimestamp(),
      };

      const functions = getFunctions();
      const createJobFn = httpsCallable(functions, "createJob");

      const res: any = await createJobFn(jobPayload);

      if (res.data && res.data.jobId) {
        const newJobId = res.data.jobId;
        setActiveJobId(newJobId);

        router.replace({
          pathname: "/(customer)/SelectBid/[jobId]",
          params: { jobId: newJobId },
        });
      } else {
        throw new Error("Cloud Function did not return a Job ID.");
      }
    } catch (e) {
      console.error("Submit error:", e);
      Alert.alert("Error", "Failed to post job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step === 1 ? router.back() : setStep(1))}
            style={styles.backTouchArea}
          >
            <Ionicons name="chevron-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {serviceDetails?.name || "Booking"}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <Animated.View entering={FadeInDown}>
              <Text style={styles.sectionLabel}>Service Requirements</Text>
              <View style={styles.card}>
                {(SUB_SERVICE_CONFIGS[subServiceId as string] || []).map(
                  (field) => (
                    <View key={field.key} style={styles.fieldWrapper}>
                      {field.type === "counter" ? (
                        <View style={styles.counterRow}>
                          <Text style={styles.fieldLabel}>{field.label}</Text>
                          <View style={styles.counterActions}>
                            <TouchableOpacity
                              onPress={() =>
                                setFormData({
                                  ...formData,
                                  [field.key]: Math.max(
                                    0,
                                    formData[field.key] - 1,
                                  ),
                                })
                              }
                              style={styles.cBtn}
                            >
                              <Ionicons name="remove" size={18} />
                            </TouchableOpacity>
                            <Text style={styles.cValue}>
                              {formData[field.key]}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setFormData({
                                  ...formData,
                                  [field.key]: formData[field.key] + 1,
                                })
                              }
                              style={styles.cBtn}
                            >
                              <Ionicons name="add" size={18} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.toggleBtn,
                            formData[field.key] && styles.toggleActive,
                          ]}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              [field.key]: !formData[field.key],
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.toggleText,
                              formData[field.key] && styles.toggleTextActive,
                            ]}
                          >
                            {field.label}
                          </Text>
                          <Ionicons
                            name={
                              formData[field.key]
                                ? "checkbox"
                                : "square-outline"
                            }
                            size={22}
                            color={formData[field.key] ? "#fff" : "#6b7280"}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ),
                )}
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setStep(2)}
              >
                <Text style={styles.primaryBtnText}>
                  Next: Location & Urgency
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown}>
              <Text style={styles.sectionLabel}>Service Location</Text>

              {/* 🔥 WATERTIGHT FIX: Conditionally render Web Manual Inputs vs Native Autocomplete */}
              <View style={{ zIndex: 1000 }}>
                {Platform.OS === "web" ? (
                  <View style={{ marginBottom: 20 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Street Address (e.g., 123 Main St)"
                      value={formData.address}
                      onChangeText={(t) =>
                        setFormData({ ...formData, address: t })
                      }
                      placeholderTextColor="#94a3b8"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="City (e.g., Durban)"
                      value={formData.city}
                      onChangeText={(t) =>
                        setFormData({ ...formData, city: t })
                      }
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                ) : (
                  <View style={[styles.autoCompleteContainer]}>
                    <GooglePlacesAutocomplete
                      ref={googleAutocompleteRef}
                      placeholder="Search for address..."
                      minLength={2}
                      fetchDetails={true}
                      onPress={(data, details = null) => {
                        const city =
                          details?.address_components.find((c) =>
                            c.types.includes("locality"),
                          )?.long_name || "";
                        setFormData({
                          ...formData,
                          address: data.description,
                          city: city,
                        });
                      }}
                      query={{
                        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
                        language: "en",
                        components: "country:za",
                      }}
                      styles={{
                        textInput: styles.googleInput,
                        listView: styles.googleListView,
                      }}
                    />
                  </View>
                )}
              </View>

              <Text style={styles.sectionLabel}>Urgency Level</Text>
              <View style={styles.urgencyContainer}>
                {[
                  {
                    id: "urgent",
                    label: "Urgent",
                    desc: "Within 2 hrs",
                    mult: "1.5x",
                  },
                  {
                    id: "standard",
                    label: "Standard",
                    desc: "Within 6 hrs",
                    mult: "1.2x",
                  },
                  {
                    id: "scheduled",
                    label: "Schedule",
                    desc: "Pick a date",
                    mult: "1.0x",
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.urgencyCard,
                      formData.urgency === item.id && styles.urgencyActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, urgency: item.id })
                    }
                  >
                    <Text
                      style={[
                        styles.urgencyTitle,
                        formData.urgency === item.id && styles.whiteText,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.urgencyDesc,
                        formData.urgency === item.id && styles.whiteText,
                      ]}
                    >
                      {item.desc}
                    </Text>
                    <View style={styles.multiplierBadge}>
                      <Text style={styles.multiplierText}>{item.mult}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.urgency === "scheduled" && (
                <Animated.View entering={FadeInDown} style={styles.card}>
                  <Text style={styles.fieldLabel}>Preferred Date</Text>
                  <TextInput
                    style={[styles.input, { marginTop: 10, marginBottom: 0 }]}
                    placeholder="YYYY-MM-DD"
                    value={formData.scheduledDate}
                    onChangeText={(t) =>
                      setFormData({ ...formData, scheduledDate: t })
                    }
                  />
                </Animated.View>
              )}

              <View style={styles.priceCard}>
                <Text style={styles.priceValue}>
                  {formatCurrency(calculateTotal())}
                </Text>
                <Text style={styles.priceLabel}>Estimated Total</Text>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Post Job Request</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 24, paddingTop: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  backTouchArea: { padding: 8, marginLeft: -8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
  },
  fieldWrapper: { marginBottom: 15 },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: { fontSize: 15, fontWeight: "600", color: "#374151" },
  counterActions: { flexDirection: "row", alignItems: "center", gap: 15 },
  cBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  cValue: { fontSize: 18, fontWeight: "700" },
  toggleBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  toggleActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  toggleText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  toggleTextActive: { color: "#fff" },
  autoCompleteContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
    minHeight: 70,
  },
  googleInput: {
    backgroundColor: "#f9fafb",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  googleListView: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 5,
    elevation: 3,
    position: "absolute",
    top: 55,
  },
  input: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
    fontSize: 15,
  },
  urgencyContainer: { flexDirection: "row", gap: 10, marginBottom: 20 },
  urgencyCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  urgencyActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  urgencyTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  urgencyDesc: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  whiteText: { color: "#fff" },
  multiplierBadge: {
    marginTop: 6,
    backgroundColor: "#06b6d4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  multiplierText: { fontSize: 9, fontWeight: "900", color: "#fff" },
  priceCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginVertical: 20,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#cbd5e1",
  },
  priceValue: { fontSize: 32, fontWeight: "800", color: "#111827" },
  priceLabel: { fontSize: 14, color: "#6b7280" },
  primaryBtn: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  submitBtn: {
    backgroundColor: "#06b6d4",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
});
