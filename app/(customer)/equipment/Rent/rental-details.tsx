import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Alert,
  Switch,
  Platform,
  Modal,
  StatusBar,
  ActivityIndicator
} from 'react-native';
// ✅ ADD THIS LINE
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from "../../../../context/AuthContext";
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
// 👉 Ensure these imports match your actual firebase config file paths
import { functions, db } from '@/firebase/firebase'; 

const { width } = Dimensions.get("window");

const fixFirebaseUrl = (rawUrl: string) => {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  
  // If it's a firebase URL and has unencoded slashes in the path section
  if (url.includes('/o/') && !url.includes('%2F')) {
     try {
       const [baseUrl, rest] = url.split('/o/');
       const [pathPart, queryPart] = rest.split('?');
       // Force URL encoding on the folder slashes
       const encodedPath = pathPart.split('/').join('%2F');
       return `${baseUrl}/o/${encodedPath}?${queryPart}`;
     } catch (e) {
       return url;
     }
  }
  return url;
};
export default function PremiumBookingDetail() {
  const { equipmentId } = useLocalSearchParams();
  const { user } = useAuth();
  
  // 🚀 LIVE STATE
  const [equipment, setEquipment] = useState<any>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // RENTAL STATE
  const [days, setDays] = useState(1);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚀 NEW CALENDAR STATE
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');


  // 🚀 FETCH REAL DATA
  useEffect(() => {
    const fetchEquipmentDetails = async () => {
      if (!equipmentId) return;
      
      try {
        const docRef = doc(db, 'equipment', equipmentId as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setEquipment({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert("Not Found", "This equipment is no longer available.");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching equipment:", error);
        Alert.alert("Error", "Could not load equipment details.");
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchEquipmentDetails();
  }, [equipmentId]);

  // 🚀 DYNAMIC PRICING (Fallback to 0 if data is malformed)
  const dailyRate = equipment?.pricing?.dailyRate || 0;
  const securityDeposit = equipment?.pricing?.securityDeposit || 0;
  const insuranceFee = 85; // You can also move this to Firestore later
  const serviceFee = 50;

  const subtotal = dailyRate * days;
  const total = subtotal + securityDeposit + serviceFee + (hasInsurance ? insuranceFee : 0);

  // HANDLE CAROUSEL SCROLL
  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveImageIndex(index);
  };
  
// 🚀 CALENDAR LOGIC
  const onDayPress = (day: any) => {
    Haptics.selectionAsync();
    
    // Reset if both are selected, or if neither are selected
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate('');
      setDays(1);
    } 
    // If start is selected, set end date
    else if (startDate && !endDate) {
      const start = new Date(startDate);
      const end = new Date(day.dateString);
      
      if (end >= start) {
        setEndDate(day.dateString);
        // Calculate difference in days (Minimum 1 day)
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        setDays(diffDays);
      } else {
        // If they click a date before the start date, restart the selection
        setStartDate(day.dateString);
        setEndDate('');
        setDays(1);
      }
    }
  };

const markedDates = useMemo(() => {
    let marks: any = {};
    if (startDate) {
      marks[startDate] = { startingDay: true, color: '#4f46e5', textColor: 'white' };
    }
    if (endDate) {
      marks[endDate] = { endingDay: true, color: '#4f46e5', textColor: 'white' };
      
      // Fill in the middle days
      let start = new Date(startDate);
      let end = new Date(endDate);
      let current = new Date(start);
      current.setDate(current.getDate() + 1);

      while (current < end) {
        const dateStr = current.toISOString().split('T')[0];
        marks[dateStr] = { color: '#e0e7ff', textColor: '#4f46e5' };
        current.setDate(current.getDate() + 1);
      }
    }
    return marks;
  }, [startDate, endDate]);

  // 🚀 FORMAT CALENDAR LABEL
  const formatDateLabel = () => {
    if (startDate && endDate) return `${startDate.slice(5)} to ${endDate.slice(5)}`;
    if (startDate) return startDate.slice(5);
    return "Select Dates";
  };

  // 🚀 SUBMIT BOOKING
  const handleBooking = async () => {
    if (!user) {
      Alert.alert("Account Required", "Please log in to request rentals.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    try {
      const createRental = httpsCallable(functions, 'createRental');
      
      const result = await createRental({
        equipmentId,
        userId: user.uid,
        days,
        hasInsurance,
        totalAmount: total,
        securityDeposit,
        metadata: {
          location: equipment?.locationString || "Durban Metro",
          type: "premium_gear"
        }
      });

      if (result.data) {
        Alert.alert(
          "Request Sent", 
          "The owner has been notified. We'll alert you once confirmed.",
          [{ text: "View My Rentals", onPress: () => router.replace("/(customer)/rentals") }]
        );
      }
    } catch (error) {
      console.error("Rental Creation Error:", error);
      Alert.alert("System Error", "We couldn't initialize this rental. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚀 1. SHOW LOADING SCREEN FIRST
  if (isFetchingData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // 🚀 2. SAFETY CHECK
  if (!equipment) return null;

  // 🚀 3. SET FALLBACK MEDIA
  // 🚀 3. BULLETPROOF MEDIA EXTRACTOR
  // This checks all common field names just in case your database uses a different one
  const extractedImages = equipment?.media || equipment?.images || equipment?.imageUrls || equipment?.photos;
  
  const mediaUrls = extractedImages?.length > 0 
    ? extractedImages 
    : ['https://images.unsplash.com/photo-1581141849291-1125c7b692b5?q=80&w=800'];

   // Fallback if media array is empty or missing
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section with Carousel */}
        <View style={styles.imageContainer}>
          
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {mediaUrls.map((url: string, index: number) => (
              <Image 
                key={index}
                // 🚀 1. THE TRIM FIX: Strips any hidden spaces from the DB string
                source={{ uri: url.trim() }} 
                style={styles.mainImage} 
                // 🚀 2. THE RENDER FIX: Forces the image to fill the 380px height
                resizeMode="cover" 
              />
            ))}
          </ScrollView>
           <LinearGradient 
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']} 
            style={styles.imageOverlay} 
          />
          
          {/* Header Controls */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Carousel Pagination Dots */}
          {mediaUrls.length > 1 && (
            <View style={styles.paginationContainer}>
              {mediaUrls.map((_: any, index: number) => (
                <View 
                  key={index} 
                  style={[
                    styles.paginationDot, 
                    activeImageIndex === index && styles.paginationDotActive
                  ]} 
                />
              ))}
            </View>
          )}

          <View style={styles.floatingPrice}>
             <Text style={styles.floatPriceText}>R{dailyRate}</Text>
             <Text style={styles.floatDayText}>/day</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.indicator} />
          
          <View style={styles.headerRow}>
            <View style={{flex: 1}}>
              <Text style={styles.categoryText}>{equipment.category?.toUpperCase() || 'GENERAL'}</Text>
              <Text style={styles.title}>{equipment.title}</Text>
            </View>
            
            {/* Gamma Verification Check */}
            {equipment.status === 'active' && (
              <View style={styles.premiumBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#10b981" />
                <Text style={styles.badgeText}>GAMMA VERIFIED</Text>
              </View>
            )}
          </View>

          {/* Dynamic Description */}
          {equipment.description && (
            <Text style={styles.descriptionText}>{equipment.description}</Text>
          )}

          {/* Owner Identity */}
          <TouchableOpacity style={styles.ownerProfile}>
            <View style={styles.avatarContainer}>
               <Image source={{ uri: equipment.ownerAvatar || 'https://i.pravatar.cc/100' }} style={styles.avatar} />
               <View style={styles.onlineDot} />
            </View>
            <View style={styles.ownerTextContent}>
              <Text style={styles.ownerName}>{equipment.ownerName || 'Verified Owner'}</Text>
              <View style={styles.ownerMeta}>
                 <Ionicons name="star" size={12} color="#f59e0b" />
                 <Text style={styles.metaText}>{equipment.rating || 'New'} • {equipment.locationString || 'Durban'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.chatIcon}>
               <Ionicons name="chatbubble-ellipses-outline" size={22} color="#4f46e5" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Rental Timing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Timeline</Text>
            
            <TouchableOpacity 
              style={styles.dateCard} 
              activeOpacity={0.7}
              onPress={() => setShowCalendar(true)} // 👈 ADD THIS LINE
            >
              <View style={styles.dateInfo}>
                <Ionicons name="calendar-clear-outline" size={20} color="#4f46e5" />
                <View style={styles.dateTextGroup}>
                  <Text style={styles.dateMain}>{formatDateLabel()}</Text>
                  <Text style={styles.dateSub}>{days} Day(s) Selected</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Insurance Card */}
          <LinearGradient colors={['#f5f3ff', '#eff6ff']} style={styles.insuranceCard}>
            <View style={styles.insuranceIconBg}>
               <Ionicons name="shield-outline" size={24} color="#4f46e5" />
            </View>
            <View style={styles.insuranceTextContent}>
              <Text style={styles.insuranceTitle}>Damage Protection</Text>
              <Text style={styles.insuranceSub}>Full cover for dents & failure</Text>
            </View>
            <View style={styles.insurancePriceGroup}>
               <Text style={styles.insPrice}>R{insuranceFee}</Text>
               <Switch 
                value={hasInsurance} 
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHasInsurance(val);
                }} 
                trackColor={{ false: "#cbd5e1", true: "#4f46e5" }}
                ios_backgroundColor="#cbd5e1"
              />
            </View>
          </LinearGradient>

          {/* Price Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.breakdownContainer}>
              <PriceLine label="Rental Duration" value={`R${subtotal}`} />
              <PriceLine label="Security Deposit" value={`R${securityDeposit}`} isRefundable />
              {hasInsurance && <PriceLine label="Insurance" value={`R${insuranceFee}`} />}
              <PriceLine label="Service Fee" value={`R${serviceFee}`} />
              <View style={styles.divider} />
              <View style={styles.totalLine}>
                 <Text style={styles.totalLabel}>Grand Total</Text>
                 <Text style={styles.totalValue}>R{total}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerText}>
           <Text style={styles.footerPrice}>R{total}</Text>
           <Text style={styles.footerLabel}>Secure with Deposit</Text>
        </View>
        <TouchableOpacity 
          style={styles.confirmBtn} 
          onPress={handleBooking} 
          disabled={isSubmitting}
          activeOpacity={0.9}
        >
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.confirmGradient}>
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.confirmBtnText}>Request Rental</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
     {/* 🚀 NEW: Calendar Modal */}
      <Modal visible={showCalendar} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Rental Dates</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={onDayPress}
              markingType={'period'}
              markedDates={markedDates}
              theme={{
                todayTextColor: '#4f46e5',
                arrowColor: '#4f46e5',
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '700'
              }}
            />

            <TouchableOpacity 
              style={styles.saveDatesBtn} 
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.saveDatesText}>Confirm {days} Day{days > 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>      
    </View>
  );
}

interface PriceLineProps {
  label: string;
  value: string;
  isRefundable?: boolean;
}

function PriceLine({ label, value, isRefundable }: PriceLineProps) {
  return (
    <View>
      <View style={styles.priceLine}>
        <Text style={styles.pLabel}>{label}</Text>
        <Text style={styles.pValue}>{value}</Text>
      </View>
      {isRefundable && <Text style={styles.refundableText}>Refundable</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  imageContainer: { width: '100%', height: 380, position: 'relative' },
  mainImage: { width: width, height: 380 }, // Must be fixed width for carousel snapping
  imageOverlay: { ...StyleSheet.absoluteFillObject, pointerEvents: 'none' },
  backButton: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 16, zIndex: 10 },
  
  paginationContainer: { position: 'absolute', bottom: 70, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  paginationDotActive: { width: 16, backgroundColor: 'white' },

  iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  editBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  editText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  calendarContainer: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  saveDatesBtn: { backgroundColor: '#0f172a', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveDatesText: { color: 'white', fontSize: 16, fontWeight: '800' },

  floatingPrice: { position: 'absolute', bottom: 50, right: 20, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'baseline', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  floatPriceText: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  floatDayText: { fontSize: 12, color: '#64748b', marginLeft: 2 },
  
  content: { marginTop: -40, backgroundColor: '#f8fafc', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, flex: 1 },
  indicator: { width: 40, height: 5, backgroundColor: '#e2e8f0', alignSelf: 'center', borderRadius: 10, marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  categoryText: { fontSize: 10, fontWeight: '800', color: '#6366f1', letterSpacing: 1.5 },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 6 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#059669', marginLeft: 6 },
  descriptionText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 24 },

  ownerProfile: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 24, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 18 },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 3, borderColor: 'white' },
  ownerTextContent: { flex: 1, marginLeft: 15 },
  ownerName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ownerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { fontSize: 11, color: '#64748b', marginLeft: 5 },
  chatIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' },

  section: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  dateCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  dateInfo: { flexDirection: 'row', alignItems: 'center' },
  dateTextGroup: { marginLeft: 15 },
  dateMain: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  dateSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  insuranceCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, marginTop: 24 },
  insuranceIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  insuranceTextContent: { flex: 1, marginLeft: 15 },
  insuranceTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  insuranceSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  insurancePriceGroup: { alignItems: 'flex-end' },
  insPrice: { fontSize: 14, fontWeight: '800', color: '#4f46e5', marginBottom: 4 },

  breakdownContainer: { backgroundColor: 'white', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  pLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  pValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  refundableText: { fontSize: 10, color: '#10b981', fontWeight: '700', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#4f46e5' },

  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(255,255,255,0.95)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerText: { flex: 1 },
  footerPrice: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  footerLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  confirmBtn: { width: '60%' },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, gap: 10 },
  confirmBtnText: { color: 'white', fontWeight: '800', fontSize: 16 }
});