import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNearbyEquipmentClient } from 'constants/equipmentService';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as geofire from 'geofire-common';
import { query, collection, orderBy, startAt, endAt, getDocs } from 'firebase/firestore';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Category List aligned with Tydee Service sectors
const CATEGORIES = ['All', 'Power Tools', 'Cleaning', 'Gardening', 'Construction', 'Electrical'];

export default function PremiumRentEquipment() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false); 
  const [loading, setLoading] = useState(true);

  const fetchNearbyGear = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      // Default to Durban coordinates if permission denied
      let lat = -29.8579;
      let lng = 31.0292;

      if (status === 'granted') {
        const userLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Saves battery vs Highest
        });
        lat = userLoc.coords.latitude;
        lng = userLoc.coords.longitude;
      }

      // Our Millions-of-Users Geohash Query
      const nearbyGear = await getNearbyEquipmentClient(lat, lng, 15);
      setEquipment(nearbyGear);
    } catch (error) {
      console.error("Marketplace Sync Error:", error);
      Alert.alert("Sync Failed", "Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchNearbyGear(true);
  }, []);
  // Initial load
  useEffect(() => {
    fetchNearbyGear();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Replace with actual device location later
        const userLat = -29.8579; 
        const userLng = 31.0292;
        const radius = 20; // 20km radius

        const nearbyGear = await getNearbyEquipmentClient(userLat, userLng, radius);
        setEquipment(nearbyGear);
      } catch (error) {
        console.error("Failed to load nearby gear:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

 const filteredData = useMemo(() => {
    return equipment.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, equipment]);

  const toggleFavorite = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  const handleCategoryPress = (category: string) => {
    Haptics.selectionAsync();
    setActiveCategory(category);
  };

  const renderItem = ({ item }: any) => {
    // 🚀 SCALE OPTIMIZATION: Use the thumbnail path if it exists
    // Fallback to the first original image if thumbnail isn't ready
    const displayImage = item.media?.[0]?.replace('/originals/', '/thumbnails/') || item.media?.[0];

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.95}
        onPress={() => router.push({
          pathname: "/equipment/Rent/rental-details",
          params: { equipmentId: item.id }
        })}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: displayImage }} style={styles.itemImage} />
          {/* ... heart button ... */}
          
          {item.status === 'active' && (
            <BlurView intensity={20} style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={10} color="#10b981" />
              <Text style={styles.verifiedText}>GAMMA VERIFIED</Text>
            </BlurView>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.categoryRow}>
            <Text style={styles.itemCategory}>{item.category || 'General'}</Text>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={8} color="#f59e0b" />
              <Text style={styles.ratingText}>{item.rating || 'New'}</Text>
            </View>
          </View>
          
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          
          <View style={styles.priceRow}>
            <View style={styles.priceTag}>
              <Text style={styles.currency}>R</Text>
              <Text style={styles.priceText}>{item.pricing?.dailyRate || '0'}</Text>
              <Text style={styles.dayText}>/day</Text>
            </View>
            <View style={styles.miniAdd}>
               <Ionicons name="chevron-forward" size={14} color="white" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.meshCircle} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Gear</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="options-outline" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Search Container */}
      <View style={styles.searchContainer}>
        <View style={styles.glassSearch}>
          <Ionicons name="search-outline" size={20} color="#64748b" />
          <TextInput 
            placeholder="Search equipment..." 
            style={styles.searchInput}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter Chips */}
      <View>
        <FlatList 
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (

            
            <TouchableOpacity 
              onPress={() => handleCategoryPress(item)}
              activeOpacity={0.8}
              style={[
                styles.categoryBtn, 
                activeCategory === item && styles.categoryBtnActive
              ]}
            >
              <Text style={[
                styles.categoryText, 
                activeCategory === item && styles.categoryTextActive
              ]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
       
      {/* Equipment Grid */}
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}

            refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1" // Tydee Indigo
            colors={["#6366f1"]} // Android color
          />
        }

        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No equipment found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  meshCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  iconBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: 'white', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 10 },
  glassSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchInput: { marginLeft: 12, flex: 1, fontSize: 16, color: '#0f172a', fontWeight: '500' },
  categoryList: { paddingLeft: 20, paddingVertical: 18 },
  categoryBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 14, 
    marginRight: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5 },
      android: { elevation: 2 }
    })
  },
  categoryBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  categoryText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  categoryTextActive: { color: 'white' },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between' },
  card: {
    width: (width / 2) - 18,
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 15,
    elevation: 2
  },
  imageWrapper: { width: '100%', height: 130 },
  itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  favCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: { color: '#0f172a', fontSize: 8, fontWeight: '900', marginLeft: 4, letterSpacing: 0.5 },
  cardContent: { padding: 12 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemCategory: { fontSize: 9, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  ratingText: { fontSize: 9, fontWeight: '800', color: '#b45309', marginLeft: 2 },
  itemTitle: { fontWeight: '700', fontSize: 14, color: '#0f172a', marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceTag: { flexDirection: 'row', alignItems: 'baseline' },
  currency: { fontSize: 10, fontWeight: '700', color: '#0f172a' },
  priceText: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  dayText: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },
  miniAdd: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748b', fontWeight: '600' }
});