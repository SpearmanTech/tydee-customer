import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, ChevronRight } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { promptGoogleAsync, googleRequest } = useAuth();

  const handleAction = (mode: "signin" | "signup") => {
    router.push({
      pathname: "/(auth)/register",
      params: { role: "customer", mode },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* BRANDING HERO */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.hero}>
          <LinearGradient
            colors={["#6366f1", "#4f46e5"]}
            style={styles.logoBadge}
          >
            <Sparkles color="#fff" size={32} />
          </LinearGradient>
          <Text style={styles.brandName}>Foona</Text>
          <Text style={styles.title}>Your home,{"\n"}reimagined.</Text>
          <Text style={styles.subtitle}>
            Connect with top-rated professionals for cleaning, plumbing, and
            more.
          </Text>
        </Animated.View>

        {/* ACTIONS */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(800)}
          style={styles.actions}
        >
          {/* Google Sign-In */}
          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.85}
            disabled={!googleRequest}
            onPress={() => promptGoogleAsync()}
          >
            <Image
              source={{
                uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
              }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Sign In */}
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.8}
            onPress={() => handleAction("signin")}
          >
            <LinearGradient
              colors={["#1e293b", "#0f172a"]}
              style={styles.btnGradient}
            >
              <Text style={styles.primaryBtnText}>Sign In with Email</Text>
              <ChevronRight color="#fff" size={18} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => handleAction("signup")}
          >
            <Text style={styles.secondaryBtnText}>Create a new account</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Secure booking for your peace of mind
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: "center" },

  hero: { alignItems: "center", marginBottom: 52 },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    transform: [{ rotate: "-10deg" }],
  },
  brandName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6366f1",
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
    fontWeight: "500",
  },

  actions: { width: "100%", gap: 12 },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { fontSize: 15, fontWeight: "700", color: "#1e293b" },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#f1f5f9" },
  dividerText: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },

  primaryBtn: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnGradient: {
    flexDirection: "row",
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  secondaryBtn: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  secondaryBtnText: { color: "#1e293b", fontWeight: "700", fontSize: 15 },

  footer: { paddingBottom: 40, alignItems: "center" },
  footerText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
});
