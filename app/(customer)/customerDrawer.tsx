import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { 
  User, 
  CreditCard, 
  Gift, 
  ShieldCheck, 
  HelpCircle, 
  Info, 
  LogOut, 
  Package, // Added for Rent
  BadgePlus // Added for List
} from "lucide-react-native";
import React from "react";

export default function CustomerDrawer(props: DrawerContentComponentProps) {
  const router = useRouter();
  const { signOut, user } = useAuth(); 

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Sign Out", 
        style: "destructive", 
        onPress: async () => {
          try {
            await signOut();
            router.replace("/(auth)/login");
          } catch (error) {
            Alert.alert("Error", "Failed to sign out.");
          }
        } 
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* USER PROFILE HEADER */}
      <View style={styles.userHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>My Account</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <DrawerItem
          icon={<User size={20} color="#1e293b" />}
          label="Profile Details"
          onPress={() => router.push("/(customer)/profile")}
        />
        <DrawerItem
          icon={<CreditCard size={20} color="#1e293b" />}
          label="Payments"
          onPress={() => router.push("/(customer)/(stack)/update-payment")}
        />

        {/* NEW: EQUIPMENT MARKETPLACE SECTION */}
        <View style={styles.separator} />
        <Text style={styles.sectionLabel}>EQUIPMENT</Text>
        <DrawerItem
          icon={<Package size={20} color="#6366f1" />}
          label="Manage Rentals"
          onPress={() => router.push("/(customer)/Rental-management/index")}
        />
        <DrawerItem
          icon={<BadgePlus size={20} color="#10b981" />}
          label="Manage Listings"
          onPress={() => router.push("/equipment/List/list-equipment")}
        />

        <View style={styles.separator} />
        <Text style={styles.sectionLabel}>OTHERS</Text>
        <DrawerItem
          icon={<Gift size={20} color="#1e293b" />}
          label="Promotions"
          onPress={() => {}} 
        />
        <DrawerItem
          icon={<ShieldCheck size={20} color="#1e293b" />}
          label="Safety & Security"
          onPress={() => router.push("/(customer)/(stack)/SafetySecurity")}
        />
        <DrawerItem
          icon={<HelpCircle size={20} color="#1e293b" />}
          label="Support"
          onPress={() => router.push("/(customer)/(stack)/support")}
        />
        <DrawerItem
          icon={<Info size={20} color="#1e293b" />}
          label="About Tydee"
          onPress={() => router.push("/(customer)/(stack)/About")}
        />
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutItem} onPress={handleSignOut}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DrawerItem({ icon, label, onPress }: { icon: any; label: string; onPress: () => void; }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  userHeader: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  userEmail: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  mainContent: { flex: 1, paddingHorizontal: 15 },
  sectionLabel: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#94a3b8', 
    letterSpacing: 1, 
    marginLeft: 10, 
    marginTop: 15, 
    marginBottom: 8 
  },
  separator: { 
    height: 1, 
    backgroundColor: '#f1f5f9', 
    marginHorizontal: 10, 
    marginTop: 15 
  },
  item: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 12, 
    paddingHorizontal: 10, 
    borderRadius: 12, 
    marginBottom: 4 
  },
  iconBox: { width: 32, alignItems: 'center' },
  label: { fontSize: 15, color: "#475569", fontWeight: "600" },
  footer: { 
    paddingHorizontal: 25, 
    paddingBottom: 40, 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    paddingTop: 20 
  },
  signOutItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  signOutLabel: { fontSize: 15, color: "#ef4444", fontWeight: "700" },
});
