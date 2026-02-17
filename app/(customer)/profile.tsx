import { auth, db } from "@/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { doc, serverTimestamp, updateDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const { user, isLoading } = useAuth();
  const navigation = useNavigation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState<any>({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "customers", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const rawPin = data.permanentPin || data.startPin || "";
        const formattedPin = rawPin ? String(rawPin) : "Not Set";
        setProfile({ ...data, permanentPin: formattedPin });
        setFormData({
          full_name: data.full_name || user?.displayName || "",
          phone: data.phone || "",
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const userRef = doc(db, "customers", user.uid);
      await updateDoc(userRef, {
        full_name: formData.full_name,
        phone: formData.phone,
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Success", "Profile optimized.");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Title Section */}
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => router.replace("/(customer)")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Profile & Wallet</Text>
        </View>

        {/* Security / Handshake PIN Card */}
        <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.pinCard}>
           <View style={styles.pinHeader}>
              <Ionicons name="shield-checkmark" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.pinTitle}>Service Handshake PIN</Text>
           </View>
           <View style={styles.pinContent}>
              <Text style={styles.pinValue}>
                 {showPin ? profile?.permanentPin : "••••"}
              </Text>
              <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.pinEye}>
                 <Ionicons name={showPin ? "eye-off-outline" : "eye-outline"} size={22} color="white" />
              </TouchableOpacity>
           </View>
           <Text style={styles.pinNote}>Secure confirmation code for your service partner.</Text>
        </LinearGradient>

        {/* Profile Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Account Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput 
              style={styles.premiumInput} 
              value={formData.full_name} 
              placeholder="Full Name"
              onChangeText={(t) => setFormData({...formData, full_name: t})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput 
              style={styles.premiumInput} 
              value={formData.phone} 
              placeholder="082 123 4567"
              keyboardType="phone-pad"
              onChangeText={(t) => setFormData({...formData, phone: t})}
            />
          </View>

          <TouchableOpacity onPress={handleUpdateProfile} style={styles.saveAction}>
            <LinearGradient colors={['#1f2937', '#111827']} style={styles.saveGradient}>
               <Text style={styles.saveText}>Update Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Wallet Section */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
             <Text style={styles.sectionLabel}>Saved Methods</Text>
             <TouchableOpacity onPress={() => router.push("/(stack)/update-payment")}>
                <Text style={styles.addMethodText}>+ Add New</Text>
             </TouchableOpacity>
          </View>
          
          <View style={styles.methodItem}>
             <Ionicons name="card-outline" size={20} color="#6366f1" />
             <Text style={styles.methodLabel}>Visa •••• 0358</Text>
             <View style={styles.primaryBadge}><Text style={styles.primaryText}>Primary</Text></View>
          </View>
          
          <View style={styles.methodItem}>
             <Ionicons name="card-outline" size={20} color="#9ca3af" />
             <Text style={styles.methodLabel}>Mastercard •••• 4450</Text>
          </View>

          <TouchableOpacity style={styles.promoAction}>
             <Ionicons name="pricetag-outline" size={18} color="#4f46e5" />
             <Text style={styles.promoText}>Apply Promo or Voucher</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerActions}>
           <TouchableOpacity style={styles.footerBtn} onPress={() => auth.signOut()}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
           </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  headerTitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    marginBottom: 20 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    backgroundColor: 'white', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 3 } })
  },
  mainTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginLeft: 15 },
  
  // Handshake PIN Card
  pinCard: { 
    marginHorizontal: 20, 
    borderRadius: 24, 
    padding: 24, 
    marginBottom: 25,
    ...Platform.select({ ios: { shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 15 }, android: { elevation: 8 } })
  },
  pinHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  pinTitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginLeft: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  pinContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pinValue: { color: 'white', fontSize: 36, fontWeight: '900', letterSpacing: 8 },
  pinEye: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  pinNote: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 15, fontWeight: '500' },

  // General Card Styling
  sectionCard: { 
    backgroundColor: 'white', 
    marginHorizontal: 20, 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 15 },
  inputGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8, marginLeft: 4 },
  premiumInput: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 15, 
    color: '#1f2937',
    fontWeight: '500'
  },
  saveAction: { marginTop: 10 },
  saveGradient: { borderRadius: 16, padding: 18, alignItems: 'center' },
  saveText: { color: 'white', fontWeight: '700', fontSize: 15 },

  // Wallet
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addMethodText: { color: '#4f46e5', fontWeight: '700', fontSize: 14 },
  methodItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  methodLabel: { flex: 1, marginLeft: 12, fontSize: 14, color: '#1f2937', fontWeight: '500' },
  primaryBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  primaryText: { color: '#059669', fontSize: 11, fontWeight: '700' },
  promoAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 20, 
    backgroundColor: '#f5f3ff', 
    padding: 14, 
    borderRadius: 12 
  },
  promoText: { color: '#4f46e5', fontWeight: '600', fontSize: 13, marginLeft: 8 },

  // Footer
  footerActions: { paddingHorizontal: 20, marginTop: 10 },
  footerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 15, 
    borderRadius: 16, 
    backgroundColor: '#fef2f2' 
  },
  logoutText: { marginLeft: 8, color: '#ef4444', fontWeight: '700' }
});