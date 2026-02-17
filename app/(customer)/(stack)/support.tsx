import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  FileText,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  ShieldAlert,
} from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';

export default function Support() {
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
          <ChevronLeft size={26} color="#1f2937" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Tydee Concierge</Text>
          <View style={styles.statusRow}>
             <View style={styles.statusDot} />
             <Text style={styles.statusText}>Support Online</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>How can our elite support team assist you today?</Text>

        <SupportItem
          icon={<HelpCircle size={22} color="#4f46e5" />}
          title="Common Questions"
          text="Instant answers regarding bookings, payments, and Tydee policies."
          bgColor="#f5f3ff"
        />

        <SupportItem
          icon={<MessageSquare size={22} color="#4f46e5" />}
          title="Direct Message"
          text="Chat with our Durban-based support team for personalized assistance."
          bgColor="#f5f3ff"
        />

        <SupportItem
          icon={<FileText size={22} color="#4f46e5" />}
          title="Report an Incident"
          text="Submit a detailed report regarding service quality or late arrivals."
          bgColor="#f5f3ff"
        />

        {/* URGENT ASSISTANCE GRADIENT */}
        <TouchableOpacity activeOpacity={0.9} style={styles.urgentWrapper}>
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            style={styles.urgentGradient}
          >
            <View style={styles.urgentIconBox}>
              <ShieldAlert size={24} color="#fff" />
            </View>
            <View style={styles.urgentTextContainer}>
              <Text style={styles.urgentTitle}>Urgent Safety Assistance</Text>
              <Text style={styles.urgentDesc}>Escalate active disputes or safety concerns immediately.</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Every interaction is recorded to ensure the highest standards of accountability in the Tydee network.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportItem({ icon, title, text, bgColor }: any) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={[styles.iconNest, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <View style={styles.cardTextContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{text}</Text>
      </View>
      <ChevronLeft size={16} color="#d1d5db" style={{ transform: [{ rotate: '180deg' }] }} />
    </TouchableOpacity>
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
    marginRight: 15,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1f2937" },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  statusText: { fontSize: 11, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  introText: { 
    fontSize: 15, 
    color: "#64748b", 
    fontWeight: "600", 
    textAlign: "center", 
    marginBottom: 25,
    lineHeight: 22 
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15 },
      android: { elevation: 2 }
    })
  },
  iconNest: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  cardTextContent: { flex: 1, marginLeft: 16, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 4 },
  cardDescription: { fontSize: 13, color: "#64748b", lineHeight: 18, fontWeight: "500" },
  
  // Urgent Assistance
  urgentWrapper: { marginTop: 10 },
  urgentGradient: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  urgentIconBox: { 
    width: 48, 
    height: 48, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  urgentTextContainer: { flex: 1, marginLeft: 16 },
  urgentTitle: { color: 'white', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  urgentDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', lineHeight: 16 },

  footerNote: { marginTop: 30, paddingHorizontal: 20 },
  footerNoteText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
});