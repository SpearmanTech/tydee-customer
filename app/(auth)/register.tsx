import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Lock, ArrowLeft, ChevronRight } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import Animated, { FadeInDown } from "react-native-reanimated";
import React from "react";

export default function RegisterScreen() {
  const router = useRouter();
  const { mode = "signin" } = useLocalSearchParams<{ mode: "signin" | "signup" }>();
  const { signIn, signUp, promptGoogleAsync, googleRequest } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "signup";

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Please enter both email and password.");
      return;
    }

    if (isSignUp && password.length < 6) {
      Alert.alert("Security", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, "customer");
      } else {
        await signIn(email.trim(), password);
      }
      router.replace("/");
    } catch (err: any) {
      let msg = "An unexpected error occurred.";
      if (err.code === "auth/email-already-in-use") msg = "This email is already registered.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      if (err.code === "auth/user-not-found") msg = "No account found with this email.";
      Alert.alert("Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await promptGoogleAsync();
      // Auth listener + provisioning in AuthContext handles the rest
    } catch (err) {
      Alert.alert("Google Sign-In Failed", "Something went wrong. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.inner} bounces={false}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={styles.title}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? "Join Tydee to find top pros for your home."
                : "Sign in to manage your bookings."}
            </Text>
          </Animated.View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.85}
            disabled={!googleRequest}
            onPress={handleGoogleSignIn}
          >
            <Image
              source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleBtnText}>
              {isSignUp ? "Sign up with Google" : "Sign in with Google"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / Password form */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email Address"
                autoCapitalize="none"
                style={styles.input}
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={["#1e293b", "#0f172a"]}
                style={styles.btnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>
                      {isSignUp ? "Create Account" : "Sign In"}
                    </Text>
                    <ChevronRight size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() =>
                router.replace({
                  pathname: "/(auth)/register",
                  params: { mode: isSignUp ? "signin" : "signup" },
                })
              }
            >
              <Text style={styles.linkText}>
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "New to Tydee? Create an account"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { paddingHorizontal: 32, paddingTop: 60, flexGrow: 1 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: { fontSize: 32, fontWeight: "900", color: "#1e293b", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748b", marginBottom: 28, fontWeight: "500" },

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
    marginBottom: 20,
  },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { fontSize: 15, fontWeight: "700", color: "#1e293b" },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#f1f5f9" },
  dividerText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },

  form: { width: "100%", gap: 16 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
  primaryBtn: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 10,
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
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.8 },
  footer: { marginTop: 40, alignItems: "center", paddingBottom: 40 },
  linkText: { color: "#6366f1", fontWeight: "700", fontSize: 14 },
});