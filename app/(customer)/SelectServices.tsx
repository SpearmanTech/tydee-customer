import { db } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface Category {
  id: string;
  categoryName: string;
  icon?: string;
  subServices: Record<string, any>;
}

export default function SelectServicesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. REAL-TIME TAXONOMY SYNC
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCategoryPress = (category: Category) => {
    // Navigate to a sub-selection screen passing the category ID
    // This aligns with your goal of showing sub-categories next
    router.push({
      pathname: "/(customer)/SelectSubService",
      params: { categoryId: category.id, categoryName: category.categoryName },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Choose Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>What do you need help with?</Text>
        <Text style={styles.sectionSubtitle}>Select a category to see available experts.</Text>

        <View style={styles.grid}>
          {categories.map((cat, index) => (
            <Animated.View 
              key={cat.id} 
              entering={FadeInDown.delay(index * 100)}
              style={styles.cardWrapper}
            >
              <TouchableOpacity 
                style={styles.categoryCard} 
                onPress={() => handleCategoryPress(cat)}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.categoryEmoji}>{cat.icon || "🛠️"}</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.categoryName}>{cat.categoryName}</Text>
                  <Text style={styles.subCount}>
                    {Object.keys(cat.subServices || {}).length} Services Available
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* PROMO / INFO SECTION */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-check-outline" size={20} color="#059669" />
          <Text style={styles.infoText}>
            All professionals are background checked and verified for your safety.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: { padding: 4 },
  screenTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  sectionSubtitle: { fontSize: 15, color: "#6b7280", marginBottom: 24 },
  grid: { gap: 12 },
  cardWrapper: { width: "100%" },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    // Shadow for depth
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryEmoji: { fontSize: 24 },
  textContainer: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  subCount: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: "#065f46", lineHeight: 18 },
});