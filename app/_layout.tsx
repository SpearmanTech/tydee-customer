import { AuthProvider } from "../context/AuthContext";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Stack must be a CHILD of AuthProvider */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
      </Stack>
    </AuthProvider>
  );
}