import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Image,
  Animated,
  Easing,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { uploadEquipmentImage } from "../../../../utils/storage";
import { useAuth } from "../../../../context/AuthContext";

const { width } = Dimensions.get('window');

// 📸 Scanning Overlay Component
const ScanningOverlay = () => {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 110],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
      <View style={styles.scanTint} />
    </View>
  );
};

const PHOTO_SLOTS = [
  { id: 'front', label: 'Front View', icon: 'camera-outline' },
  { id: 'side', label: 'Side Profile', icon: 'cube-outline' },
  { id: 'serial', label: 'Serial Number', icon: 'barcode-outline' },
  { id: 'extra', label: 'Additional', icon: 'add-circle-outline' },
];

export default function ListStepTwo() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<Record<string, string>>({});
  const [scanningSlot, setScanningSlot] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const incomingParams = useLocalSearchParams();

  const handlePickImage = async (slotId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Tydee needs access to your photos to list gear.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });

    if (!result.canceled) {
      setSelectedImages(prev => ({ ...prev, [slotId]: result.assets[0].uri }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGammaVerifyAndSubmit = async () => {
    if (!user) return;
    setIsUploading(true);

    const uploadedUrls: string[] = [];
    
    try {
      // 1. Run through the "Scanning" animation for each slot sequentially
      for (const slot of PHOTO_SLOTS) {
        setScanningSlot(slot.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // 🔥 Real Upload to Firebase Storage
        const localUri = selectedImages[slot.id];
        const firebaseUrl = await uploadEquipmentImage(localUri, user.uid);
        uploadedUrls.push(firebaseUrl);
        
        // Brief pause for visual effect (Gamma "Analyzing")
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setScanningSlot(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 2. Proceed to next step with Firebase URLs
      router.push({
        pathname: "/equipment/List/list-pricing",
        params: { 
          category: incomingParams.category,
          title,
          description,
          images: JSON.stringify(uploadedUrls) 
        }
      });

    } catch (error) {
      console.error("Batch Upload Error:", error);
      Alert.alert("Gamma Sync Failed", "We couldn't verify your images. Check your connection.");
    } finally {
      setScanningSlot(null);
      setIsUploading(false);
    }
  };

  const isComplete = title.length > 5 && description.length > 10 && Object.keys(selectedImages).length === 4;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: '50%' }]} />
          </View>
          <Text style={styles.stepText}>STEP 2 OF 4</Text>
          <Text style={styles.title}>Describe your gear</Text>
        </View>

        <View style={styles.mediaSection}>
          <Text style={styles.sectionLabel}>CONDITION PHOTOS (4 REQUIRED)</Text>
          <View style={styles.photoGrid}>
            {PHOTO_SLOTS.map((slot) => (
              <TouchableOpacity 
                key={slot.id} 
                style={[styles.slotCard, scanningSlot === slot.id && styles.scanningCard]}
                onPress={() => handlePickImage(slot.id)}
                disabled={isUploading}
              >
                {selectedImages[slot.id] ? (
                  <Image source={{ uri: selectedImages[slot.id] }} style={styles.capturedImage} />
                ) : (
                  <View style={styles.placeholderContent}>
                    <Ionicons name={slot.icon as any} size={24} color="#6366f1" />
                    <Text style={styles.slotText}>{slot.label}</Text>
                  </View>
                )}
                
                {scanningSlot === slot.id && <ScanningOverlay />}

                {selectedImages[slot.id] && !scanningSlot && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.fieldLabel}>Listing Title</Text>
          <TextInput 
            style={styles.textInput}
            placeholder="e.g. Bosch Industrial Pressure Washer"
            value={title}
            onChangeText={setTitle}
            editable={!isUploading}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput 
            style={[styles.textInput, styles.textArea]}
            placeholder="Mention condition, power requirements, etc..."
            multiline
            value={description}
            onChangeText={setDescription}
            editable={!isUploading}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, (!isComplete || isUploading) && styles.disabledBtn]}
          disabled={!isComplete || isUploading}
          onPress={handleGammaVerifyAndSubmit}
        >
          <LinearGradient colors={isComplete ? ['#6366f1', '#4f46e5'] : ['#e2e8f0', '#cbd5e1']} style={styles.gradient}>
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.nextText}>Verify & Sync with Gamma</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scroll: { 
    paddingBottom: 140 
  },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 24, 
    marginBottom: 10 
  },
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
  progressContainer: { 
    height: 6, 
    backgroundColor: '#e2e8f0', 
    borderRadius: 3, 
    marginBottom: 15, 
    overflow: 'hidden' 
  },
  progressBar: { 
    height: '100%', 
    backgroundColor: '#10b981' 
  },
  stepText: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#64748b', 
    letterSpacing: 1 
  },
  title: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#0f172a', 
    marginTop: 8 
  },

  /* MEDIA SECTION & PHOTO GRID */
  mediaSection: { 
    paddingHorizontal: 24, 
    marginTop: 25 
  },
  sectionLabel: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#6366f1', 
    letterSpacing: 1, 
    marginBottom: 15 
  },
  photoGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  slotCard: { 
    width: (width - 64) / 2, 
    height: 120, 
    backgroundColor: 'white', 
    borderRadius: 24, 
    marginBottom: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1
  },
  scanningCard: { 
    borderColor: '#6366f1',
    backgroundColor: '#f5f3ff' 
  },
  placeholderContent: { 
    alignItems: 'center',
    zIndex: 2
  },
  slotText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#94a3b8', 
    marginTop: 8 
  },
  capturedImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 24 
  },
  checkBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 8, 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    backgroundColor: '#10b981', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: 'white',
    zIndex: 10
  },

  /* SCAN ANIMATION OVERLAY */
  scanLine: {
    height: 3,
    width: '100%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 5,
    shadowColor: '#6366f1',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  scanTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    zIndex: 1
  },

  /* INPUT FIELDS */
  inputSection: { 
    paddingHorizontal: 24, 
    marginTop: 10 
  },
  fieldLabel: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#475569', 
    marginBottom: 10, 
    marginLeft: 4 
  },
  textInput: { 
    backgroundColor: 'white', 
    padding: 18, 
    borderRadius: 20, 
    fontSize: 16, 
    color: '#0f172a', 
    borderWidth: 1, 
    borderColor: '#f1f5f9', 
    marginBottom: 20 
  },
  textArea: { 
    height: 120, 
    textAlignVertical: 'top' 
  },

  /* FOOTER & BUTTON */
  footer: { 
    position: 'absolute', 
    bottom: 40, 
    width: '100%', 
    paddingHorizontal: 24 
  },
  nextBtn: { 
    borderRadius: 24, 
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4
  },
  disabledBtn: { 
    opacity: 0.5 
  },
  gradient: { 
    paddingVertical: 20, 
    alignItems: 'center',
    justifyContent: 'center' 
  },
  nextText: { 
    color: 'white', 
    fontWeight: '800', 
    fontSize: 16,
    letterSpacing: 0.5 
  }
});