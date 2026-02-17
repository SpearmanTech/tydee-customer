import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ChevronLeft, CheckCircle2, Target, Zap } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';

export default function About() {
  return (
    <SafeAreaView style={styles.container}>
      {/* PREMIUM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace("/(customer)")}
          style={styles.backButton}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <ChevronLeft size={26} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Our Vision</Text>
      </View>

      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
           <Text style={styles.heroTitle}>Engineering Trust in Durban</Text>
           <Text style={styles.paragraph}>
             Tydee is an on-demand services marketplace designed for speed, 
             accountability, and uncompromising quality. We believe that 
             service excellence shouldn't be a gamble.
           </Text>
        </View>

        <View style={styles.principlesCard}>
           <Text style={styles.cardLabel}>Our Core Principles</Text>
           
           <PrincipleItem 
             title="Engineered Trust" 
             text="We don't assume trust; we build it into every line of code." 
           />
           <PrincipleItem 
             title="Total Transparency" 
             text="Real-time tracking and verified reviews protect every booking." 
           />
           <PrincipleItem 
             title="Elite Accountability" 
             text="We reward excellence and enforce strict performance standards." 
           />
        </View>

        <View style={styles.manifestoSection}>
          <Text style={styles.manifestoText}>
            Every system we build is designed to protect our customers and 
            empower the professionals who deliver consistently.
          </Text>
        </View>

        <Text style={styles.footerNote}>
          Tydee v1.0.0 • Durban, South Africa
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrincipleItem({ title, text }: { title: string, text: string }) {
  return (
    <View style={styles.principleRow}>
      <LinearGradient
        colors={['#4f46e5', '#6366f1']}
        style={styles.iconCircle}
      >
        <CheckCircle2 size={14} color="white" />
      </LinearGradient>
      <View style={styles.principleContent}>
        <Text style={styles.principleTitle}>{title}</Text>
        <Text style={styles.principleDesc}>{text}</Text>
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
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1f2937", marginLeft: 15 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  heroSection: { marginBottom: 30 },
  heroTitle: { fontSize: 24, fontWeight: "900", color: "#111827", marginBottom: 12 },
  paragraph: { fontSize: 16, color: "#475569", lineHeight: 24, fontWeight: "500" },
  
  principlesCard: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20 },
      android: { elevation: 2 }
    })
  },
  cardLabel: { fontSize: 13, fontWeight: "800", color: "#6366f1", textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
  principleRow: { flexDirection: "row", marginBottom: 20, gap: 15 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  principleContent: { flex: 1 },
  principleTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  principleDesc: { fontSize: 14, color: "#64748b", lineHeight: 20, fontWeight: "500" },

  manifestoSection: { marginTop: 30, paddingHorizontal: 10 },
  manifestoText: { fontSize: 14, color: "#94a3b8", textAlign: "center", fontStyle: 'italic', lineHeight: 22 },
  footerNote: { marginTop: 40, fontSize: 12, color: "#cbd5e1", textAlign: "center", fontWeight: "600" },
});