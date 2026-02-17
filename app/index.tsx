import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import Animated, { FadeIn } from "react-native-reanimated";

export default function Index() {
  const { user, loading, role } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    // 1. Wait for Auth state to initialize
    if (loading) return;

    // 2. GATE 1: Authentication check
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    const trafficControl = async () => {
      try {
        // 3. GATE 2: Role Security (Enforce Customer Domain)
        // If a pro somehow logs in, we can either block them or handle gracefully.
        // For a customer-only app, we treat everyone as a customer.
        
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
 {
            // Success: Send to Customer Dashboard
            router.replace("/(customer)");
          }
                }
      } catch (error) {
        console.error("Traffic Control Error:", error);
        // On error, try to send back to login to clear state
        router.replace("/(auth)/login");
      }
    };

    trafficControl();
  }, [user, loading, role]);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        <ActivityIndicator size="large" color="#6366f1" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#fff" 
  },
  inner: {
    alignItems: 'center',
    gap: 15
  }
});