import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function PremiumListStepThree() {
  const params = useLocalSearchParams(); // Retrieve title and images from Step 2
  const [dailyRate, setDailyRate] = useState('');
  const [deposit, setDeposit] = useState('');
  
  // Tydee's service fee logic
  const tydeeFeePercent = 0.15; 
  const earnings = dailyRate ? (parseFloat(dailyRate) * (1 - tydeeFeePercent)).toFixed(2) : '0.00';

  const handlePriceChange = (val: string) => {
    const cleanValue = val.replace(/[^0-9]/g, '');
    setDailyRate(cleanValue);
  };

  const isComplete = dailyRate && deposit;

  // Surge Data for Durban North rollout
  const isHighDemand = true; 

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: '75%' }]} />
          </View>
          <Text style={styles.stepText}>STEP 3 OF 4</Text>
          <Text style={styles.title}>Pricing & Security</Text>
        </View>

        {/* SURGE INSIGHT */}
        {isHighDemand && (
          <View style={styles.surgeInsight}>
            <LinearGradient 
              colors={['#fffbeb', '#fef3c7']} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}} 
              style={styles.surgeGradient}
            >
              <Ionicons name="trending-up" size={18} color="#b45309" />
              <Text style={styles.surgeText}>
                <Text style={{fontWeight: '900'}}>High Demand!</Text> Similar gear is trending in Durban right now.
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* EARNINGS CALCULATOR */}
        <View style={styles.earningsCard}>
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.earningsGradient}>
            <View style={styles.earningsHeader}>
               <Text style={styles.earningsLabel}>ESTIMATED EARNINGS</Text>
               <Ionicons name="sparkles" size={14} color="#fbbf24" />
            </View>
            <View style={styles.earningsRow}>
               <Text style={styles.earningsValue}>R{earnings}</Text>
               <Text style={styles.perDay}>/day</Text>
            </View>
            <Text style={styles.feeNote}>You keep 85% of every rental.</Text>
          </LinearGradient>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Daily Rental Rate</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencyPrefix}>R</Text>
              <TextInput 
                style={styles.mainInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                value={dailyRate}
                onChangeText={handlePriceChange}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.labelRow}>
               <Text style={styles.inputLabel}>Security Deposit</Text>
               <View style={styles.shieldBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#10b981" />
                  <Text style={styles.shieldText}>GAMMA PROTECTED</Text>
               </View>
            </View>
            <View style={styles.currencyInput}>
              <Text style={styles.currencyPrefix}>R</Text>
              <TextInput 
                style={styles.mainInput}
                keyboardType="numeric"
                placeholder="e.g. 1000"
                placeholderTextColor="#94a3b8"
                value={deposit}
                onChangeText={setDeposit}
              />
            </View>
            <Text style={styles.helperText}>
              Held in escrow. If gear is damaged, Gamma helps verify your claim.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, !isComplete && styles.disabledBtn]}
          disabled={!isComplete}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({
              pathname: "/equipment/List/list-location",
              params: { 
                ...params, // Title and Images
                dailyRate,
                deposit
              }
            });
          }}
        >
          <LinearGradient 
            colors={isComplete ? ['#10b981', '#059669'] : ['#e2e8f0', '#cbd5e1']} 
            style={styles.gradient}
          >
            <Text style={styles.nextText}>Final Step: Location</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// [Styles remain identical to original]
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 140 },
  header: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  progressContainer: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 15, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#10b981' },
  stepText: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 8 },
  
  surgeInsight: { marginHorizontal: 24, marginTop: 15 },
  surgeGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, gap: 12 },
  surgeText: { color: '#b45309', fontSize: 12, flex: 1, lineHeight: 18 },

  earningsCard: { marginHorizontal: 24, borderRadius: 32, overflow: 'hidden', marginTop: 20, shadowColor: '#0f172a', shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
  earningsGradient: { padding: 24 },
  earningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  earningsLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  earningsRow: { flexDirection: 'row', alignItems: 'baseline' },
  earningsValue: { color: 'white', fontSize: 40, fontWeight: '900' },
  perDay: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '700', marginLeft: 4 },
  feeNote: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 10, fontWeight: '600' },

  inputSection: { paddingHorizontal: 24, marginTop: 30 },
  inputWrapper: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginLeft: 4 },
  shieldBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  shieldText: { color: '#059669', fontSize: 9, fontWeight: '900', marginLeft: 4 },
  
  currencyInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 24, paddingHorizontal: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  currencyPrefix: { fontSize: 20, fontWeight: '700', color: '#94a3b8', marginRight: 10 },
  mainInput: { flex: 1, paddingVertical: 18, fontSize: 20, fontWeight: '800', color: '#0f172a' },
  helperText: { fontSize: 12, color: '#94a3b8', marginTop: 12, lineHeight: 18, paddingHorizontal: 4 },

  footer: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 24 },
  nextBtn: { borderRadius: 20, overflow: 'hidden' },
  disabledBtn: { opacity: 0.6 },
  gradient: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nextText: { color: 'white', fontWeight: '800', fontSize: 16 }
});