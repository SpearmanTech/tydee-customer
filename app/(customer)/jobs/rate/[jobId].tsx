import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Alert, 
  TextInput, 
  ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '@/firebase/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Star, Award, MessageSquare } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export default function RateProPage() {
  // Grab the jobId and the pre-selected stars from the email deep link!
  const { jobId, stars } = useLocalSearchParams();
  const router = useRouter();

  const [rating, setRating] = useState(Number(stars) || 5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!jobId) {
      Alert.alert("Error", "Missing job information.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "jobs", jobId as string), {
        review: {
          rating: rating,
          text: comment,
          submittedAt: serverTimestamp(),
        }
      });
      
      Alert.alert("Thank you!", "Your feedback keeps the Foona community safe and high-quality.");
      router.replace("/(customer)");
    } catch (error) {
      console.error("Review Error:", error);
      Alert.alert("Error", "Could not submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER SECTION */}
      <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
        <View style={styles.iconCircle}>
          <Award size={40} color="#6366f1" />
        </View>
        <Text style={styles.title}>Rate Your Pro</Text>
        <Text style={styles.subtitle}>How was your service experience?</Text>
      </Animated.View>

      <View style={styles.content}>
        {/* INTERACTIVE STARS CARD */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity 
                key={star} 
                onPress={() => setRating(star)}
                activeOpacity={0.7}
              >
                <Star 
                  size={42} 
                  fill={star <= rating ? "#fbbf24" : "transparent"} 
                  color={star <= rating ? "#fbbf24" : "#cbd5e1"} 
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating} out of 5 stars
          </Text>
        </Animated.View>

        {/* FEEDBACK INPUT CARD */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
          <View style={styles.row}>
            <MessageSquare size={20} color="#6366f1" />
            <Text style={styles.cardLabel}>Leave a Comment (Optional)</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Tell us what you loved, or what could be better..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />
        </Animated.View>
      </View>

      {/* FOOTER SECTION */}
      <Animated.View entering={FadeInDown.delay(600)} style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryBtn} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  header: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 8, textAlign: 'center' },
  
  content: { flex: 1, padding: 25, gap: 20 },
  
  card: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 10 },
  ratingText: { textAlign: 'center', marginTop: 10, fontSize: 14, fontWeight: '700', color: '#64748b' },
  
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' },
  
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    color: '#1e293b',
  },
  
  footer: { padding: 25 },
  primaryBtn: { backgroundColor: '#111827', padding: 20, borderRadius: 20, alignItems: 'center', minHeight: 64, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});