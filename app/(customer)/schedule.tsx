import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator, TextInput, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db, auth } from "@/firebase/firebase";
import { collection, addDoc, doc, serverTimestamp, onSnapshot, query, Timestamp } from "firebase/firestore";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';

export default function ScheduleBooking() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [permanentPin, setPermanentPin] = useState<string>("Not Set");
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [customerBid, setCustomerBid] = useState("");
  const [loadingServices, setLoadingServices] = useState(true);
  
  useEffect(() => {
  if (!auth.currentUser?.uid) return;

  const unsub = onSnapshot(doc(db, "customers", auth.currentUser.uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      // Look for the same keys you use in the Profile Screen
      const rawPin = data.permanentPin || data.startPin || "";
      setPermanentPin(rawPin ? String(rawPin) : "Not Set");
    }
  });
  return () => unsub();
}, []);

  
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let grouped: any[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        let subServices: any[] = [];
        Object.keys(data).forEach(key => {
          if (typeof data[key] === 'object' && data[key].name) {
            subServices.push({ id: `${doc.id}_${key}`, categoryName: doc.id, ...data[key] });
          }
        });
        grouped.push({ id: doc.id, name: doc.id, items: subServices });
      });
      setCategories(grouped);
      setLoadingServices(false);
    });
    return () => unsubscribe();
  }, []);

  const openPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handleCreateJob = async () => {
  const user = auth.currentUser;
  if (!selectedService) return Alert.alert("Selection Required", "Please choose a service.");
  
  // Validation: Don't let them book if the PIN hasn't loaded or isn't set
  if (permanentPin === "Not Set" || !permanentPin) {
    return Alert.alert("Profile Incomplete", "Please ensure your Handshake PIN is set in your Profile before booking.");
  }

  try {
    const jobPayload = {
      customerId: user?.uid,
      customerName: user?.displayName || user?.email?.split('@')[0],
      
      title: selectedService.name,
      category: selectedService.categoryName,
      basePrice: selectedService.base_price,
      customerInitialBid: customerBid ? parseFloat(customerBid) : selectedService.base_price,
      
      status: "open",
      hasBids: false,
      bidCount: 0,
      bids: [],
      bidders: [],
      
      // USE THE PERMANENT PIN HERE
      startPin: permanentPin, 
      customerPin: permanentPin, // Backup key for safety
      
      scheduledAt: Timestamp.fromDate(date),
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "jobs"), jobPayload);
    
    Alert.alert(
      "Success", 
      `Job live for bidding. Use your Handshake PIN (${permanentPin}) when the Pro arrives.`,
      [{ text: "OK", onPress: () => router.replace("/(customer)") }]
    );
  } catch (e) {
    Alert.alert("Error", "Handshake failed. Please try again.");
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(customer)")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Reservation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          
          <Text style={styles.sectionLabel}>1. SELECT SERVICE</Text>
          {loadingServices ? (
            <ActivityIndicator color="#4f46e5" style={{ marginVertical: 20 }} />
          ) : (
            categories.map((cat) => (
              <View key={cat.id} style={styles.accordionContainer}>
                <TouchableOpacity 
                  style={[styles.categoryHeader, expandedCategory === cat.id && styles.activeCatHeader]}
                  onPress={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                >
                  <Text style={[styles.categoryTitle, expandedCategory === cat.id && styles.activeCatTitle]}>{cat.name}</Text>
                  <Ionicons name={expandedCategory === cat.id ? "chevron-up" : "chevron-down"} size={18} color={expandedCategory === cat.id ? "#fff" : "#94a3b8"} />
                </TouchableOpacity>

                {expandedCategory === cat.id && (
                  <View style={styles.subServiceList}>
                    {cat.items.map((item: any) => (
                      <TouchableOpacity 
                        key={item.id} 
                        style={[styles.subItem, selectedService?.id === item.id && styles.selectedSubItem]}
                        onPress={() => setSelectedService(item)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.subItemName, selectedService?.id === item.id && styles.selectedText]}>{item.name}</Text>
                          <Text style={styles.subItemRange}>Estimated: R{item.base_price} - R{item.base_price * 2.5}</Text>
                        </View>
                        <Ionicons name={selectedService?.id === item.id ? "checkmark-circle" : "add-circle-outline"} size={22} color="#6366f1" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}

          {selectedService && (
            <Animated.View entering={FadeInDown} style={styles.bidSection}>
              <Text style={styles.sectionLabel}>2. YOUR PRICE OFFER (OPTIONAL)</Text>
              <View style={styles.bidInputContainer}>
                <Text style={styles.currencyLabel}>R</Text>
                <TextInput 
                  style={styles.bidInput}
                  placeholder={`${selectedService.base_price}`}
                  keyboardType="numeric"
                  value={customerBid}
                  onChangeText={setCustomerBid}
                />
              </View>
            </Animated.View>
          )}

          <Text style={styles.sectionLabel}>3. SCHEDULE WINDOW</Text>
          <View style={styles.glassCard}>
            <TouchableOpacity style={styles.selectorRow} onPress={() => openPicker('date')}>
              <Ionicons name="calendar" size={18} color="#4f46e5" />
              <Text style={styles.selectorValue}>{date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <Ionicons name="caret-down" size={14} color="#cbd5e1" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.selectorRow} onPress={() => openPicker('time')}>
              <Ionicons name="time" size={18} color="#4f46e5" />
              <Text style={styles.selectorValue}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <Ionicons name="caret-down" size={14} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* PICKER WITH VISIBILITY FIXES */}
          {showPicker && (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              // CRITICAL FIX FOR TEXT VISIBILITY:
              themeVariant="light" 
              textColor="#000000" 
              accentColor="#4f46e5"
              minimumDate={new Date()}
              onChange={(e, d) => { 
                setShowPicker(Platform.OS === 'ios'); 
                if(d) setDate(d); 
              }}
            />
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.postAction} onPress={handleCreateJob}>
          <LinearGradient colors={['#1e293b', '#111827']} style={styles.gradientBtn}>
            <Text style={styles.postBtnText}>Post Bid to Pros</Text>
            <Ionicons name="flash" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#94a3b8", letterSpacing: 1.5, marginBottom: 15, marginTop: 25 },
  accordionContainer: { marginBottom: 10, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 18 },
  activeCatHeader: { backgroundColor: '#1e293b' },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  activeCatTitle: { color: '#fff' },
  subServiceList: { padding: 10 },
  subItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 14, marginBottom: 8, backgroundColor: '#f8fafc' },
  selectedSubItem: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#6366f1' },
  subItemName: { fontSize: 14, fontWeight: '700', color: '#334155' },
  subItemRange: { fontSize: 11, color: '#6366f1', marginTop: 2, fontWeight: '600' },
  selectedText: { color: '#4f46e5' },
  bidSection: { marginTop: 10 },
  bidInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  currencyLabel: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginRight: 10 },
  bidInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#4f46e5' },
  glassCard: { backgroundColor: "#fff", borderRadius: 20, padding: 5, borderWidth: 1, borderColor: "#f1f5f9" },
  selectorRow: { flexDirection: "row", alignItems: "center", padding: 15, gap: 15 },
  selectorValue: { flex: 1, fontSize: 15, color: "#1e293b", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginHorizontal: 15 },
  footer: { padding: 20, paddingBottom: 40, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  gradientBtn: { paddingVertical: 18, borderRadius: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  postBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});