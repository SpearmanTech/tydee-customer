import { auth } from "@/firebase/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { reload, sendEmailVerification } from "firebase/auth";
import { CheckCircle2, LogOut, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function VerifyEmailScreen() {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();

  const checkVerification = async () => {
    if (!user) return;
    
    setChecking(true);
    try {
      await reload(user);
      await user.getIdToken(true); // Force token refresh

      if (user.emailVerified) {
        Alert.alert("Success", "Your email is verified! Welcome to Tydee.");
        // The gatekeeper in AuthContext will automatically route them to /(customer)
      } else {
        Alert.alert("Pending", "We haven't detected your verification yet. Please check your inbox and spam folder.");
      }
    } catch (error: any) {
      Alert.alert("Error", "Could not verify your status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!user) return;
    
    setResending(true);
    try {
      await sendEmailVerification(user);
      Alert.alert(
        "Sent!",
        "A new verification link has been sent to your inbox."
      );
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        Alert.alert(
          "Limit Reached",
          "Please wait a moment before requesting another link."
        );
      } else {
        Alert.alert("Error", "Could not send the email.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Mail size={40} color="#6366f1" />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to{"\n"}
          <Text style={styles.emailText}>{user?.email}</Text>
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={checkVerification}
          disabled={checking}
        >
          <LinearGradient
            colors={["#6366f1", "#4f46e5"]}
            style={styles.buttonGradient}
          >
            {checking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <CheckCircle2
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>I've Verified My Email</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={resending}
          style={styles.resendButton}
        >
          {resending ? (
            <ActivityIndicator color="#6366f1" size="small" />
          ) : (
            <Text style={styles.resendText}>
              Didn't get an email?{" "}
              <Text style={styles.resendTextBold}>Resend</Text>
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => signOut()}
      >
        <LogOut size={18} color="#94a3b8" />
        <Text style={styles.logoutText}>Cancel & Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 32 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 35,
    backgroundColor: "#f5f3ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 12,
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 40,
  },
  emailText: { color: "#1e293b", fontWeight: "700" },
  primaryButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
  },
  buttonGradient: { paddingVertical: 18, alignItems: "center" },
  buttonContent: { flexDirection: "row", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  resendButton: { marginTop: 24 },
  resendText: { color: "#64748b", fontSize: 14 },
  resendTextBold: { color: "#6366f1", fontWeight: "700" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  logoutText: { color: "#94a3b8", fontWeight: "600", marginLeft: 8 },
});