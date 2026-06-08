import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Dimensions, View, ActivityIndicator } from "react-native";
import { useAuth } from "../../context/AuthContext";
import CustomerDrawer from "./customerDrawer";
import React from "react";

const { width } = Dimensions.get("window");

export default function CustomerLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(15, 23, 42, 0.4)",
        drawerStyle: {
          width: width * 0.75,
          backgroundColor: "#fff",
          borderTopRightRadius: 32,
          borderBottomRightRadius: 32,
        },
        swipeEnabled: true,
      }}
      drawerContent={(props) => <CustomerDrawer {...props} />}
    >
      {/* IMPORTANT: If you see "No route named index", 
          ensure you have an index.tsx file in app/(customer)/ 
      */}
      <Drawer.Screen 
        name="index" 
        options={{
          drawerLabel: "Home",
        }}
      />

      <Drawer.Screen 
        name="History" 
        options={{
          drawerLabel: "My Bookings",
        }}
      />

      {/* Adding the Payment Screen to the Layout */}
      <Drawer.Screen 
        name="update-payment" 
        options={{
          drawerLabel: "Billing",
          drawerItemStyle: { display: 'none' }, // Hides it from the menu, keeps it navigable
        }}
      />

      <Drawer.Screen 
        name="profile" 
        options={{
          drawerLabel: "Account",
        }}
      />

      <Drawer.Screen 
        name="(stack)" 
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}