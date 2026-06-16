import { useRouter } from "expo-router";
import { ArrowLeft, Camera, UploadCloud } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase"; // Ensure correct path

const CATEGORIES = ["Power Tools", "Machinery", "Cleaning", "Landscaping", "Other"];

export default function NewListingScreen() {
  const router = useRouter();
  
  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Power Tools");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!name || !price) {
      Alert.alert("Missing Info", "Please provide a name and daily price for your equipment.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Authentication Error", "You must be logged in to list equipment.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Calculate Financial Splits based on your schema (15% Platform Fee)
      const dailyRate = parseFloat(price);
      const tydeeFee = dailyRate * 0.15;
      const listerEarnings = dailyRate - tydeeFee;
      
      // Default security deposit logic (can be adjusted later)
      const securityDeposit = dailyRate * 5; 

      // 2. Build the Payload matching your exact database schema
      const newEquipmentPayload = {
        title: name,
        category: selectedCategory,
        description: description || "No description provided.",
        ownerId: user.uid,
        status: "active",
        handoverType: "pickup",
        numShards: 10,
        createdAt: serverTimestamp(),
        pricing: {
          dailyRate: dailyRate,
          listerEarnings: listerEarnings,
          tydeeFee: tydeeFee,
          securityDeposit: securityDeposit,
        },
        // 🚀 Note: For a production app, you'd integrate expo-location and expo-image-picker here.
        // We are using placeholders below to keep the schema happy until those are added.
        location: {
          area: "Local Area", // Replace with actual location data
          geopoint: null, // Replace with Firestore GeoPoint
        },
        geohash: "default_hash", 
        media: [], // Replace with download URLs after uploading to Firebase Storage
      };

      // 3. Push to Firestore
      await addDoc(collection(db, "equipment"), newEquipmentPayload);

      Alert.alert(
        "Success!",
        "Your equipment has been added to your fleet and is now live on the marketplace.",
        [
          { 
            text: "Awesome", 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      console.error("Error creating listing:", error);
      Alert.alert("Upload Failed", "There was an issue publishing your listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Equipment</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── Image Upload Placeholder ── */}
        <TouchableOpacity style={styles.imageUploadBox}>
          <View style={styles.iconCircle}>
            <Camera size={28} color="#6366f1" />
          </View>
          <Text style={styles.uploadTitle}>Tap to add photos</Text>
          <Text style={styles.uploadSub}>Showcase your gear to get more bookings</Text>
        </TouchableOpacity>

        {/* ── Form Fields ── */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Equipment Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Honda 5kVA Generator"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  selectedCategory === cat && styles.chipActive
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedCategory === cat && styles.chipTextActive
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Price per Day (ZAR)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 250"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description & Condition</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the condition, included accessories, and any rules for the renter..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

      </ScrollView>

      {/* ── Sticky Footer Button ── */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <UploadCloud size={20} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? "Publishing..." : "Publish Listing"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
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
  
  scrollContent: { padding: 20, paddingBottom: 120 },
  
  imageUploadBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  uploadSub: { fontSize: 13, color: "#64748b", textAlign: "center" },

  formGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
  },
  textArea: { minHeight: 120, paddingTop: 16 },

  chipScroll: { flexDirection: "row", overflow: "visible" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#e0e7ff",
    borderColor: "#c7d2fe",
  },
  chipText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  chipTextActive: { color: "#4f46e5", fontWeight: "800" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#6366f1",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});