import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import AddCardModal from "../../../constants/AddCardModal"; 
import { useAuth } from "../../../context/AuthContext";

export default function UpdatePaymentScreen() {
  const router = useRouter();
  const { user } = useAuth(); 
  const [showAddCard, setShowAddCard] = useState(false);

  const handleCardLinkComplete = (success: boolean) => {
    setShowAddCard(false);
    if (success) {
      // Platform check so it doesn't fail silently on Web!
      if (Platform.OS === 'web') {
        window.alert("Card Linked Successfully! Your account is now ready for seamless, automated payments.");
        router.replace("/(customer)");
      } else {
        Alert.alert(
          "Card Linked Successfully", 
          "Your account is now ready for seamless, automated payments.",
          [{ text: "Great", onPress: () => router.replace("/(customer)") }]
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace("/(customer)")}   
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Wallet</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* WALLET CARD */}
        <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.walletCard}>
          <Text style={styles.walletLabel}>Tydee Cash Balance</Text>
          <Text style={styles.balanceText}>ZAR 0.00</Text>
          <TouchableOpacity style={styles.topUpBtn}><Text style={styles.topUpText}>+ Top Up Account</Text></TouchableOpacity>
        </LinearGradient>

        {/* PAYMENT METHODS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <PaymentMethodItem 
            icon="card-outline" color="#4f46e5" label="Debit / Credit Card" 
            onPress={() => setShowAddCard(true)}
          />
          <PaymentMethodItem icon="logo-paypal" color="#003087" label="PayPal" />
          <PaymentMethodItem icon="flash-outline" color="#16a34a" label="Foonapay" />
          <PaymentMethodItem icon="business-outline" color="#1f2937" label="Bank Transfer (EFT)" />
        </View>

        {/* PROFILES STATUS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Default Profiles</Text>
          <View style={styles.defaultRow}>
            <View>
              <Text style={styles.profileName}>Business Profile</Text>
              <Text style={styles.currentMethod}>
                {user?.paymentMethod?.isLinked ? `${user.paymentMethod.brand} •••• ${user.paymentMethod.last4}` : "No card linked"}
              </Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowAddCard(true)}>
              <Text style={styles.editBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* PORTAL POSITIONING: This renders on top of everything */}
      {showAddCard && user?.uid && (
        <View style={StyleSheet.absoluteFill}>
          <AddCardModal 
            userId={user.uid} 
            email={user.email} 
            onComplete={handleCardLinkComplete} 
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function PaymentMethodItem({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.methodItem} onPress={onPress}>
      <View style={[styles.methodIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.methodLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  headerTitle: { fontSize: 20, fontWeight: '800', marginLeft: 15 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  walletCard: { borderRadius: 28, padding: 24, marginBottom: 25 },
  walletLabel: { color: 'white', opacity: 0.8, fontSize: 13 },
  balanceText: { color: 'white', fontSize: 32, fontWeight: '800', marginVertical: 10 },
  topUpBtn: { backgroundColor: 'white', padding: 12, borderRadius: 14, alignSelf: 'flex-start' },
  topUpText: { color: '#4f46e5', fontWeight: '800' },
  sectionCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
  methodItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  methodIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  methodLabel: { flex: 1, marginLeft: 15, fontWeight: '600' },
  defaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileName: { fontWeight: '700' },
  currentMethod: { fontSize: 12, color: '#64748b' },
  editBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8 },
  editBtnText: { color: '#4f46e5', fontWeight: '700' }
});