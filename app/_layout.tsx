import "react-native-gesture-handler";
import "react-native-reanimated";
import { Stack } from "expo-router";
import { AuthProvider, useAuth, useProtectedRoute } from "../context/AuthContext";
import React from "react";

// 1. Create a separate component for the navigation logic
function NavigationStack() {
  const { user, role, loading } = useAuth();
  
  // 🛡️ Run the protection logic here
  useProtectedRoute(user, role, loading);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
    </Stack>
  );
}

// 2. The Root Layout only provides the Context
export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationStack />
    </AuthProvider>
  );
}