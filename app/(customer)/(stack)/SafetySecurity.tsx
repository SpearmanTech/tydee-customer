import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import {
  ShieldCheck,
  MapPin,
  Lock,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function SafetySecurity() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(customer)")}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety & Trust</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heroText}>
          Your security is our highest priority at Foona.
        </Text>

        <SafetySection
          icon={<ShieldCheck size={22} color="#4f46e5" />}
          title="Verified Professionals"
          text="Every service partner undergoes multi-stage identity verification and background checks before they can accept jobs."
          bgColor="#f5f3ff"
        />

        <SafetySection
          icon={<MapPin size={22} color="#4f46e5" />}
          title="GPS-Tracked Jobs"
          text="For your peace of mind, all active services are tracked via encrypted GPS data and timestamped from start to finish."
          bgColor="#f5f3ff"
        />

        <SafetySection
          icon={<Lock size={22} color="#4f46e5" />}
          title="Escrow Protection"
          text="Your payment is held in a secure vault and only released to the professional once you have confirmed the service is complete."
          bgColor="#f5f3ff"
        />

        <SafetySection
          icon={<AlertTriangle size={22} color="#dc2626" />}
          title="24/7 Support Desk"
          text="In the rare event of an incident, our safety team is available 24/7 to intervene. Simply tap the SOS icon in your active job view."
          bgColor="#fef2f2"
          titleColor="#991b1b"
        />

        <View style={styles.trustBadge}>
          <LinearGradient
            colors={["#1f2937", "#111827"]}
            style={styles.badgeGradient}
          >
            <ShieldCheck size={28} color="#fff" />
            <Text style={styles.badgeText}>Foona SafeGuarantee Active</Text>
          </LinearGradient>
        </View>

        <Text style={styles.legalNote}>
          We design our systems assuming real-world risk and actively mitigate
          it through constant security audits.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SafetySection({ icon, title, text, bgColor, titleColor }: any) {
  return (
    <View style={styles.sectionCard}>
      <View style={[styles.iconNest, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.sectionTitle,
            titleColor ? { color: titleColor } : null,
          ]}
        >
          {title}
        </Text>
        <Text style={styles.sectionDescription}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    marginLeft: 15,
  },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  heroText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  sectionCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15 },
      android: { elevation: 2 },
    }),
  },
  iconNest: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: { flex: 1, marginLeft: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
    fontWeight: "500",
  },
  trustBadge: { marginTop: 10, marginBottom: 25 },
  badgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  legalNote: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
