import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Camera, Save, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase"; // Ensure correct path

export default function EditItemScreen() {
  const router = useRouter();
  // Extracts the specific document ID directly from the URL
  const { id } = useLocalSearchParams<{ id: string }>();

  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  
  // Loading States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 🚀 1. Fetch the exact document when the screen mounts
  useEffect(() => {
    const fetchEquipment = async () => {
      if (!id) return;
      
      try {
        const docRef = doc(db, "equipment", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const item = docSnap.data();
          setName(item.title || "");
          setPrice(item.pricing?.dailyRate?.toString() || "");
          setDescription(item.description || "");
          setIsActive(item.status === "active");
        } else {
          Alert.alert("Not Found", "This equipment listing could not be found.");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching item:", error);
        Alert.alert("Error", "Could not load equipment details.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchEquipment();
  }, [id]);

  // 🚀 2. Save Changes back to Firestore
  const handleUpdate = async () => {
    if (!name || !price) {
      Alert.alert("Missing Info", "Please ensure the name and price are filled out.");
      return;
    }

    setIsSaving(true);

    try {
      // Recalculate financial splits just like in new-listing
      const dailyRate = parseFloat(price);
      const tydeeFee = dailyRate * 0.15;
      const listerEarnings = dailyRate - tydeeFee;
      
      const docRef = doc(db, "equipment", id as string);
      
      await updateDoc(docRef, {
        title: name,
        description: description,
        status: isActive ? "active" : "inactive",
        "pricing.dailyRate": dailyRate,
        "pricing.listerEarnings": listerEarnings,
        "pricing.tydeeFee": tydeeFee,
        // Optional: update security deposit if your logic requires it
        "pricing.securityDeposit": dailyRate * 5, 
      });

      Alert.alert(
        "Equipment Updated",
        "Your changes have been saved and synced with the marketplace.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error updating item:", error);
      Alert.alert("Update Failed", "There was an issue saving your changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // 🚀 3. Delete Document
  const handleDelete = () => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to permanently delete this equipment? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
               await deleteDoc(doc(db, "equipment", id as string));
               Alert.alert("Deleted", "Item removed from inventory.", [{ text: "OK", onPress: () => router.back() }]);
            } catch (error) {
               console.error("Error deleting item:", error);
               Alert.alert("Error", "Could not delete the item.");
            }
          } 
        },
      ]
    );
  };

  if (isLoadingData) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Edit Equipment</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── Image Edit Bay ── */}
        <View style={styles.imageEditContainer}>
          <View style={styles.imagePlaceholder}>
            <Camera size={32} color="#94a3b8" />
          </View>
          <TouchableOpacity style={styles.changeImageBtn}>
            <Text style={styles.changeImageText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* ── Status Toggle ── */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>Marketplace Status</Text>
            <Text style={styles.statusSub}>
              {isActive ? "Currently visible to customers" : "Hidden from the marketplace"}
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#e2e8f0", true: "#10b981" }}
            thumbColor={"#fff"}
            onValueChange={setIsActive}
            value={isActive}
          />
        </View>

        {/* ── Form Fields ── */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Equipment Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Price per Day (ZAR)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
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
          style={[styles.primaryButton, isSaving && { opacity: 0.7 }]} 
          onPress={handleUpdate}
          disabled={isSaving}
        >
          {isSaving ? (
             <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : (
             <Save size={20} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Saving..." : "Save Changes"}
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
  deleteButton: { padding: 8, marginRight: -8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  
  scrollContent: { padding: 20, paddingBottom: 120 },
  
  imageEditContainer: { alignItems: "center", marginBottom: 32 },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  changeImageBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  changeImageText: { fontSize: 13, fontWeight: "700", color: "#475569" },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  statusTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  statusSub: { fontSize: 12, color: "#64748b" },

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
    backgroundColor: "#10b981",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});