import { db } from "@/firebase/firebase";
import { useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const FEATURES = [
  "AI skill–job matching in real time",
  "Background-verified professionals",
  "Live proximity & ETA calculation",
  "Price fairness & bid quality scoring",
  "Fraud & spam bid filtering",
  "Professional reliability index",
  "Smart bid ranking engine",
  "Historical performance analysis",
  "Availability confidence scoring",
  "Auto-negotiation readiness",
  "SLA & response-time prediction",
  "Dynamic pricing intelligence",
  "Dispute-risk minimization checks",
  "Secure escrow readiness",
  "Continuous market calibration",
];

export default function JobSearching({ navigation }: any) {
  const route = useRoute<any>();
  const { jobId } = route.params;

  const [featureIndex, setFeatureIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const q = query(collection(db, "bids"), where("jobId", "==", jobId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        navigation.replace("SelectBidScreen", { jobId });
      }
    });

    return () => unsubscribe();
  }, [jobId]);

  return (
    <LinearGradient colors={["#14b8a6", "#0f766e"]} style={styles.container}>
      <Text style={styles.header}>Searching for professionals</Text>

      <View style={styles.spinnerWrapper}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>

      <Text style={styles.status}>Activating intelligent matching systems</Text>

      <View style={styles.featureContainer}>
        <Animated.Text
          key={featureIndex}
          entering={FadeInDown.duration(500)}
          exiting={FadeOutUp.duration(500)}
          style={styles.featureText}
        >
          {FEATURES[featureIndex]}
        </Animated.Text>
      </View>

      <Text style={styles.footer}>
        You’ll be redirected automatically once bids arrive
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ecfeff",
    textAlign: "center",
    marginBottom: 32,
  },
  spinnerWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  status: {
    fontSize: 14,
    color: "#ccfbf1",
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  featureContainer: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 48,
  },
  featureText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    width: width * 0.8,
  },
  footer: {
    fontSize: 12,
    color: "#99f6e4",
    textAlign: "center",
  },
});

// Add a default export for the JobSearchingScreen component
