import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  ActivityIndicator, TextInput, Modal, ScrollView, Pressable 
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function BookingHistory() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  
  // New Filter & Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "jobs"),
      where("customerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(fetchedJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Comprehensive Filtering (Status + Service Name Search)
  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Filter by Status
    if (filterStatus === 'active') {
      result = result.filter(j => ["open", "confirmed", "assigned", "in_progress"].includes(j.status));
    } else if (filterStatus === 'completed') {
      result = result.filter(j => j.status === "completed");
    }

    // Filter by Search (Service/Title)
    if (searchQuery.trim() !== '') {
      result = result.filter(j => 
        j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.service?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [jobs, filterStatus, searchQuery]);

  const renderJobItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => setSelectedJob(item)} // Open floating modal
    >
      <View style={styles.cardHeader}>
        <Text style={styles.jobTitle}>{item.title || "General Service"}</Text>
        <Text style={[styles.statusBadge, styles.activeBadge]}>
          {item.status?.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.jobDate}>{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</Text>
      <Text style={styles.jobPrice}>R {item.final_price || item.budget || 0}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 1. HEADER WITH BACK ARROW */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/(customer)")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* 2. SEARCH & FILTERS */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput 
            placeholder="Search services..." 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterBar}>
          {['all', 'active', 'completed'].map((status) => (
            <TouchableOpacity 
              key={status}
              onPress={() => setFilterStatus(status as any)}
              style={[styles.filterBtn, filterStatus === status && styles.activeFilter]}
            >
              <Text style={[styles.filterText, filterStatus === status && styles.activeFilterText]}>
                {status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No bookings match your filters.</Text>}
        />
      )}

      {/* 3. EXPANDING FLOATING MODAL */}
      <Modal
        visible={!!selectedJob}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedJob(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedJob(null)}>
          <View style={styles.floatingCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedJob?.title}</Text>
                <TouchableOpacity onPress={() => setSelectedJob(null)}>
                  <Ionicons name="close-circle" size={28} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.detailText}>
                  Date: {selectedJob && new Date(selectedJob.createdAt?.seconds * 1000).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={20} color="#059669" />
                <Text style={styles.detailText}>Price: R {selectedJob?.final_price || selectedJob?.budget}</Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
                <Text style={styles.detailText}>Status: {selectedJob?.status}</Text>
              </View>

              <Text style={styles.descriptionTitle}>Description:</Text>
              <Text style={styles.descriptionText}>{selectedJob?.description || "No description provided."}</Text>

              <TouchableOpacity 
                style={styles.fullDetailBtn}
                onPress={() => {
                  const id = selectedJob.id;
                  setSelectedJob(null);
                  router.push({ pathname: "/(customer)/JobDetails", params: { jobId: id } });
                }}
              >
                <Text style={styles.fullDetailBtnText}>View Full Details</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  
  filterSection: { backgroundColor: '#fff', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#f3f4f6', margin: 16, paddingHorizontal: 12, 
    borderRadius: 12, height: 45 
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f3f4f6' },
  activeFilter: { backgroundColor: '#8b5cf6' },
  filterText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  activeFilterText: { color: '#fff' },
  
  listContent: { padding: 16 },
  jobCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jobTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadge: { backgroundColor: '#e0e7ff', color: '#3730a3' },
  jobDate: { fontSize: 13, color: '#6b7280' },
  jobPrice: { fontSize: 15, fontWeight: '700', color: '#059669', marginTop: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, // Adjustment for status bar if needed
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    zIndex: 10, // Ensures the whole header is up front
  },
  backBtn: { 
    padding: 10, // Visual padding
    zIndex: 20,  // Higher zIndex than the title
    position: 'relative',
  },
  titleContainer: {
    flex: 1, // Let this take the remaining space
    marginLeft: 10,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#111827' 
  },
  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  floatingCard: { backgroundColor: '#fff', width: '100%', borderRadius: 24, padding: 24, maxHeight: '70%', elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', flex: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  detailText: { fontSize: 16, color: '#4b5563' },
  descriptionTitle: { fontSize: 16, fontWeight: '700', marginTop: 15, color: '#111827' },
  descriptionText: { fontSize: 14, color: '#6b7280', marginTop: 5, lineHeight: 20 },
  fullDetailBtn: { backgroundColor: '#8b5cf6', marginTop: 25, padding: 16, borderRadius: 12, alignItems: 'center' },
  fullDetailBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});