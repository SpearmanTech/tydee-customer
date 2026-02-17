import { db } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
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

export default function SelectCleaningScreen() {
  const router = useRouter();
  const { categoryId = "Cleaning" } = useLocalSearchParams<{ categoryId: string }>();
  
  const [subServices, setSubServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. SYNC WITH FIRESTORE FLAT MAP
  // 1. Updated Data Fetcher
useEffect(() => {
  const unsub = onSnapshot(doc(db, "services", categoryId), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      
      // Look for root-level objects that aren't 'categoryName' or metadata
      const servicesArray = Object.entries(data)
        .filter(([key, value]) => 
          typeof value === 'object' && value !== null && key !== 'location'
        )
        .map(([key, value]: any) => ({
          id: key,
          ...value,
        }));
        
      setSubServices(servicesArray);
    }
    setLoading(false);
  });
  return () => unsub();
}, [categoryId]);

// 2. Updated UI Loop
{subServices.map((service, index) => (
  <TouchableOpacity 
    key={service.id} 
    style={styles.serviceCard} 
    onPress={() => handleServiceSelect(service)}
  >
    <View style={styles.cardInfo}>
      {/* Use service.name from your database fields */}
      <Text style={styles.serviceName}>{service.name || service.id}</Text>
      <Text style={styles.serviceDesc}>{service.description || "Professional service"}</Text>
      <View style={styles.priceTag}>
        <Text style={styles.priceText}>From R{service.base_price}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
  </TouchableOpacity>
))}

  const handleServiceSelect = (service: any) => {
    router.push({
      pathname: "/(customer)/Booking",
      params: { 
        categoryId, 
        subServiceId: service.id,
        serviceName: service.name 
      },
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
        <Text style={styles.screenTitle}>{categoryId} Types</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Select specific service</Text>
        <Text style={styles.sectionSubtitle}>
          Choose the best option for your {categoryId.toLowerCase()} needs.
        </Text>

        <View style={styles.list}>
          {subServices.map((service, index) => (
            <Animated.View 
              key={service.id} 
              entering={FadeInDown.delay(index * 100)}
            >
              <TouchableOpacity 
                style={styles.serviceCard} 
                onPress={() => handleServiceSelect(service)}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {service.description}
                  </Text>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>From R{service.base_price}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {subServices.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No specific services found for this category.</Text>
          </View>
        )}
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
  list: { gap: 12 },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  serviceDesc: { fontSize: 13, color: "#6b7280", lineHeight: 18, marginBottom: 10 },
  priceTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: { color: '#4f46e5', fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
});