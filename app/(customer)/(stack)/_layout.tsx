import { Stack } from "expo-router";

export default function CustomerStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // This hides the default white bar for ALL screens in this stack
      }}
    >  
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="SafetySecurity" />
      <Stack.Screen name="Support" />
      <Stack.Screen name="About" />
      <Stack.Screen name="update-payment" />
      <Stack.Screen name="account" />
    </Stack>
  );
}