import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/firebase';

const { width } = Dimensions.get("window");

export default function PremiumRentalStatus() {
  const { rentalId } = useLocalSearchParams();
  
  // This would typically be fetched from your 'rentals' collection
  const rentalData = {
    id: rentalId || 'R-701',
    item: 'Industrial Pressure Washer',
    owner: 'Sipho M.',
    dueDate: '2026-02-23T12:00:00',
    status: 'In Possession',
  };

  const handleActionPress = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    switch(action) {
      case 'Evidence':
        // Logic to trigger Gamma on-device AI camera for condition reporting
        router.push('/equipment/gamma-verification');
        break;
      case 'Contact':
        Alert.alert("Support", "Connecting you to the owner via Tydee Chat...");
        break;
      case 'Insurance':
        Alert.alert("Insurance Policy", "Your 'Damage Protection' is active for this session.");
        break;
      default:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Background Header */}
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.headerBackground}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.blurBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Session</Text>
          <TouchableOpacity style={styles.blurBtn}>
            <Ionicons name="help-circle-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.timerCenter}>
          <Text style={styles.timerLabel}>ESTIMATED RETURN IN</Text>
          <Text style={styles.timerValue}>02<Text style={styles.timerUnit}>d</Text> 14<Text style={styles.timerUnit}>h</Text> 35<Text style={styles.timerUnit}>m</Text></Text>
          
          <View style={styles.statusPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusPillText}>{rentalData.status.toUpperCase()}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        style={styles.mainScroll}
      >
        {/* Handover Card */}
        <View style={styles.qrCard}>
          <Text style={styles.cardTitle}>Verification Code</Text>
          <Text style={styles.cardSub}>Present this to the owner to finalize return.</Text>
          
          <View style={styles.qrWrapper}>
            <QRCode
              value={rentalData.id}
              size={160}
              color="#0f172a"
              backgroundColor="white"
            />
          </View>
          
          <View style={styles.idBadge}>
            <Text style={styles.idText}>REF: {rentalData.id}</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionLabel}>SESSION TOOLS</Text>
          <View style={styles.actionGrid}>
            <GridAction 
              icon="chatbubbles-outline" 
              label="Contact" 
              onPress={() => handleActionPress('Contact')} 
            />
            <GridAction 
              icon="camera-outline" 
              label="Evidence" 
              onPress={() => handleActionPress('Evidence')} 
            />
            <GridAction 
              icon="navigate-outline" 
              label="Navigate" 
              onPress={() => handleActionPress('Navigate')} 
            />
            <GridAction 
              icon="shield-outline" 
              label="Insurance" 
              onPress={() => handleActionPress('Insurance')} 
            />
          </View>
        </View>

        {/* Location Info */}
        <TouchableOpacity style={styles.locationCard}>
          <View style={styles.locIconBg}>
            <Ionicons name="location" size={20} color="#6366f1" />
          </View>
          <View style={styles.locText}>
            <Text style={styles.locTitle}>Return Location</Text>
            <Text style={styles.locSub}>Unit 4B, Durban North Hub</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.extendBtn} activeOpacity={0.8}>
          <Text style={styles.extendText}>Extend Rental Period</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
// [GridAction sub-component and Styles match your original code]
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerBackground: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20 
  },
  blurBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 15, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { color: 'white', fontSize: 16, fontWeight: '700', opacity: 0.9 },
  timerCenter: { alignItems: 'center', marginTop: 30 },
  timerLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  timerValue: { color: 'white', fontSize: 42, fontWeight: '900', marginTop: 8 },
  timerUnit: { fontSize: 18, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  statusPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#10b981', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    marginTop: 20 
  },
  statusPillText: { color: 'white', fontSize: 10, fontWeight: '900' },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', marginRight: 8 },
  
  mainScroll: { marginTop: -30 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  qrCard: { 
    backgroundColor: 'white', 
    borderRadius: 30, 
    padding: 30, 
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  cardSub: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  qrWrapper: { 
    marginTop: 25, 
    padding: 15, 
    backgroundColor: 'white', 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  idBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 25 },
  idText: { fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },

  gridSection: { marginTop: 35 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 15 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridBtn: { width: (width - 60) / 4, alignItems: 'center' },
  gridIconBg: { 
    width: 55, 
    height: 55, 
    borderRadius: 20, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  gridLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 8 },

  locationCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 24, 
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  locIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  locText: { flex: 1, marginLeft: 15 },
  locTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  locSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  extendBtn: { 
    marginTop: 20, 
    padding: 20, 
    borderRadius: 24, 
    backgroundColor: '#0f172a', 
    alignItems: 'center' 
  },
  extendText: { color: 'white', fontWeight: '800', fontSize: 15 }
});