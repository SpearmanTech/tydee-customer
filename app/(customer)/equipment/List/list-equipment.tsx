import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const CATEGORY_OPTIONS = [
  { id: '1', label: 'Power Tools', icon: 'hammer-outline' },
  { id: '2', label: 'Cleaning', icon: 'sparkles-outline' },
  { id: '3', label: 'Gardening', icon: 'leaf-outline' },
  { id: '4', label: 'Construction', icon: 'business-outline' },
  { id: '5', label: 'Electrical', icon: 'flash-outline' },
  { id: '6', label: 'Plumbing', icon: 'water-outline' },
];

export default function ListStepOne() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                  </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: '25%' }]} />
        </View>
        <Text style={styles.stepText}>STEP 1 OF 4</Text>
        <Text style={styles.title}>What are you listing?</Text>
        <Text style={styles.sub}>Select a category to help customers find your gear faster.</Text>
      </View>

      <FlatList
        data={CATEGORY_OPTIONS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.catCard, 
              selectedCategory === item.id && styles.selectedCard
            ]}
            onPress={() => handleSelect(item.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.iconBg, 
              selectedCategory === item.id && styles.selectedIconBg
            ]}>
              <Ionicons 
                name={item.icon as any} 
                size={28} 
                color={selectedCategory === item.id ? '#fff' : '#4f46e5'} 
              />
            </View>
            <Text style={[
              styles.catLabel, 
              selectedCategory === item.id && styles.selectedLabel
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, !selectedCategory && styles.disabledBtn]}
          disabled={!selectedCategory}
          onPress={() => {
            // Grab the actual text label (e.g., "Power Tools") instead of just the ID
            const selectedLabel = CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.label || 'General';
            
            // Push to Step 2 AND pass the category data
            router.push({
              pathname: "/equipment/List/list-details", // Make sure this path matches your file structure
              params: { category: selectedLabel }
            });
          }}
        >
          <LinearGradient 
            colors={selectedCategory ? ['#10b981', '#059669'] : ['#e2e8f0', '#cbd5e1']} 
            style={styles.gradient}
          >
            <Text style={styles.nextText}>Next: Item Details</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  progressContainer: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#10b981' },
  stepText: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 8 },
  sub: { fontSize: 15, color: '#64748b', marginTop: 8, lineHeight: 22 },
  grid: { paddingHorizontal: 16, paddingBottom: 120 },
 backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2 
  },

  catCard: {
    flex: 1,
    backgroundColor: 'white',
    margin: 8,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
  selectedCard: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  iconBg: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  selectedIconBg: { backgroundColor: '#10b981' },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },
  selectedLabel: { color: '#065f46' },
  footer: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 24 },
  nextBtn: { borderRadius: 20, overflow: 'hidden' },
  disabledBtn: { opacity: 0.6 },
  gradient: { paddingVertical: 18, alignItems: 'center' },
  nextText: { color: 'white', fontWeight: '800', fontSize: 16 }
});