import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get("window");

const MOCK_HISTORY = [
  {
    id: 'R-701',
    title: 'Industrial Pressure Washer',
    owner: 'Sipho M.',
    status: 'Active',
    dueDate: 'Feb 23, 2026',
    price: 1585,
    image: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?q=80&w=200',
  },
  {
    id: 'R-605',
    title: 'Heavy Duty Drill Set',
    owner: 'Thabo L.',
    status: 'Completed',
    dueDate: 'Feb 15, 2026',
    price: 150,
    image: 'https://images.unsplash.com/photo-1504148455328-497c5ef215d0?q=80&w=200',
  }
];

export default function PremiumHistory() {
  const [activeTab, setActiveTab] = useState('Active');

  const handleTabPress = (tab: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const filteredHistory = MOCK_HISTORY.filter(item => 
    activeTab === 'Active' ? item.status === 'Active' : item.status === 'Completed'
  );

  const renderHistoryItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.historyCard}
      activeOpacity={0.7}
      onPress={() => router.push(`equipment/Rent/rent-status/`)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.itemThumb} />
        {item.status === 'Active' && (
          <View style={styles.activePulse} />
        )}
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.topRow}>
          <Text style={styles.orderId}>#{item.id}</Text>
          <View style={[
            styles.statusBadge, 
            item.status === 'Active' ? styles.activeBadge : styles.completedBadge
          ]}>
            <View style={[styles.dot, item.status === 'Active' ? styles.activeDot : styles.completedDot]} />
            <Text style={[styles.statusText, item.status === 'Active' ? styles.activeText : styles.completedText]}>
              {item.status}
            </Text>
          </View>
        </View>
        
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.ownerText}>Lent by <Text style={styles.ownerName}>{item.owner}</Text></Text>
        
        <View style={styles.bottomInfo}>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={14} color="#94a3b8" />
            <Text style={styles.dateText}>
              {item.status === 'Active' ? `Due ${item.dueDate}` : `Returned ${item.dueDate}`}
            </Text>
          </View>
          <Text style={styles.priceText}>R{item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rental Activity</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="search-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
          {['Active', 'Completed'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => handleTabPress(tab)}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} orders</Text>
            <Text style={styles.emptySub}>When you rent gear, it will appear here.</Text>
            <TouchableOpacity 
              style={styles.browseBtn}
              onPress={() => router.push("/RentEquipment")}
            >
              <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.browseGradient}>
                <Text style={styles.browseBtnText}>Explore Gear</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  iconBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: '#f1f5f9', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  tabWrapper: { paddingHorizontal: 20, marginTop: 10 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    padding: 6,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
  activeTab: { 
    backgroundColor: 'white', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 2 
  },
  tabLabel: { fontWeight: '700', color: '#64748b', fontSize: 14 },
  activeTabLabel: { color: '#0f172a' },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  imageContainer: { position: 'relative' },
  itemThumb: { width: 85, height: 85, borderRadius: 18, backgroundColor: '#f1f5f9' },
  activePulse: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white',
  },
  itemDetails: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontSize: 11, color: '#94a3b8', fontWeight: '700', letterSpacing: 1 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 10 
  },
  activeBadge: { backgroundColor: '#f0fdf4' },
  completedBadge: { backgroundColor: '#f8fafc' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  activeDot: { backgroundColor: '#10b981' },
  completedDot: { backgroundColor: '#94a3b8' },
  statusText: { fontSize: 10, fontWeight: '800' },
  activeText: { color: '#166534' },
  completedText: { color: '#475569' },
  itemTitle: { fontWeight: '800', fontSize: 16, color: '#0f172a', marginBottom: 2 },
  ownerText: { fontSize: 12, color: '#64748b' },
  ownerName: { fontWeight: '600', color: '#334155' },
  bottomInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  dateContainer: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#64748b', marginLeft: 5, fontWeight: '600' },
  priceText: { fontWeight: '900', color: '#0f172a', fontSize: 15 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyIconBg: { 
    width: 80, 
    height: 80, 
    borderRadius: 30, 
    backgroundColor: '#f1f5f9', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 20
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  emptySub: { color: '#94a3b8', marginTop: 8, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  browseBtn: { marginTop: 30, width: '60%' },
  browseGradient: { paddingVertical: 16, borderRadius: 18, alignItems: 'center' },
  browseBtnText: { color: 'white', fontWeight: '800', fontSize: 15 }
});