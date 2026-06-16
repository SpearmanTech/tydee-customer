import { Stack } from "expo-router";
import React from "react";

export default function RentalManagementLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // Hides Expo's default headers so your custom NavCards and headers shine
        animation: "slide_from_right", // Provides that premium native app feel
      }}
    >
      {/* 1. The Command Center (Loaded by default when hitting /rental-management) */}
      <Stack.Screen name="index" />
      
      {/* 2. The Core Management Pipelines */}
      <Stack.Screen name="inventory" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="new-listing" />
      
      {/* 3. The Dynamic Edit Bay (Passes the specific equipment ID via the URL) */}
      <Stack.Screen 
        name="item/[id]" 
        options={{
          // Optional: You can override specific animation behaviors for deeper screens here
          animation: "fade", 
        }}
      />
    </Stack>
  );
}