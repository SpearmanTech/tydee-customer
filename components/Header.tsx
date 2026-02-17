import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate("Home" as never)}>
        <Text style={styles.logo}>Tydee</Text>
      </TouchableOpacity>

      <View style={styles.right}>
        {user?.google_user_data?.picture ? (
          <Image
            source={{ uri: user.google_user_data?.picture }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user?.displayName?.[0] || (user?.email?.[0] ?? "U")}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={() => logout()}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { fontSize: 18, fontWeight: "700" },
  right: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#111827", fontWeight: "700" },
  logout: { marginLeft: 12, color: "#ef4444", fontWeight: "600" },
});
