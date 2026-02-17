import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import AddCardModal from "../../../constants/AddCardModal"; 
import { useAuth } from "../../../context/AuthContext";

const { width } = Dimensions.get("window");

export default function UpdatePaymentScreen() {
  const router = useRouter();
  const { user } = useAuth(); 
  const [showAddCard, setShowAddCard] = useState(false);
  
  // Debug log to catch "undefined" component errors early
  console.log("AddCardModal Component Status:", typeof AddCardModal);
  console.log("1. AddCardModal:", typeof AddCardModal);
  console.log("2. LinearGradient:", typeof LinearGradient);
  console.log("3. Ionicons:", typeof Ionicons);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace("/(customer)")}   
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing & Wallet</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TYDEE CASH – GRADIENT CARD */}
        <LinearGradient 
          colors={['#6366f1', '#4f46e5']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }}
          style={styles.walletCard}
        >
          <View style={styles.walletTop}>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet" size={22} color="white" />
            </View>
            <Text style={styles.walletLabel}>Tydee Cash Balance</Text>
          </View>
          
          <Text style={styles.balanceText}>ZAR 0.00</Text>
          
          <TouchableOpacity style={styles.topUpBtn} activeOpacity={0.9}>
            <Text style={styles.topUpText}>+ Top Up Account</Text>
          </TouchableOpacity>
          
          <Text style={styles.rewardNote}>Earn 2% cashback on every Tydee Cash booking.</Text>
        </LinearGradient>

        {/* PAYMENT METHODS SECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          
          <PaymentMethodItem 
            icon="card-outline" 
            color="#4f46e5" 
            label="Debit / Credit Card" 
            onPress={() => setShowAddCard(true)}
          />
          <PaymentMethodItem 
            icon="logo-paypal" 
            color="#003087" 
            label="PayPal" 
          />
          <PaymentMethodItem 
            icon="flash-outline" 
            color="#16a34a" 
            label="Foonapay" 
          />
          <PaymentMethodItem 
            icon="business-outline" 
            color="#1f2937" 
            label="Bank Transfer (EFT)" 
          />
        </View>

        {/* PROFILES DEFAULT */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Default Profiles</Text>
          
          <View style={styles.defaultRow}>
            <View>
              <Text style={styles.profileName}>Personal Profile</Text>
              <Text style={styles.currentMethod}>Using Tydee Cash</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.defaultRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.profileName}>Business Profile</Text>
              <Text style={styles.currentMethod}>
                {user?.paymentMethod?.isLinked 
                  ? `${user.paymentMethod.brand} •••• ${user.paymentMethod.last4}` 
                  : "No card linked"}
              </Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECURITY FOOTER */}
        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark" size={18} color="#9ca3af" />
          <Text style={styles.securityText}>
            Secured by AES-256 Encryption. Tydee does not store card CVV data.
          </Text>
        </View>
      </ScrollView>

      {/* PAYSTACK MODAL OVERLAY */}
      {showAddCard && (
        <View style={StyleSheet.absoluteFill}>
          <AddCardModal 
            userId={user?.uid} 
            email={user?.email} 
            onComplete={(success) => {
              setShowAddCard(false);
              if (success) {
                // Here you would typically trigger a re-fetch of user data
                alert("Success! Your card is linked for Uber-style payments.");
              }
            }} 
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// --- SUB-COMPONENT ---
function PaymentMethodItem({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity 
      style={styles.methodItem} 
      activeOpacity={0.7} 
      onPress={onPress}
    >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1f2937', marginLeft: 15 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  walletCard: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    marginTop: 10,
    marginBottom: 25,
    ...Platform.select({
      ios: { shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 15 },
      android: { elevation: 8 }
    })
  },
  walletTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: 8 },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  balanceText: { color: 'white', fontSize: 32, fontWeight: '800', marginVertical: 15 },
  topUpBtn: { backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, alignSelf: 'flex-start' },
  topUpText: { color: '#4f46e5', fontWeight: '800', fontSize: 14 },
  rewardNote: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 15, fontWeight: '500' },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 15 },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  methodIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  methodLabel: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '600', color: '#374151' },
  defaultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  profileName: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  currentMethod: { fontSize: 12, color: '#64748b', marginTop: 4 },
  editBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 20
  },
  securityText: { fontSize: 11, color: '#9ca3af', fontWeight: '500', textAlign: 'center', flex: 1 }
});