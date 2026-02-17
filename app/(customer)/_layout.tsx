import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Dimensions, View, ActivityIndicator } from "react-native";
import { useAuth } from "../../context/AuthContext";
import CustomerDrawer from "./customerDrawer";

const { width } = Dimensions.get("window");

export default function CustomerLayout() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  
  // Enforce customer-only domain
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
      {/* 1. This points to index.tsx in the (customer) root */}
      <Drawer.Screen 
        name="index" 
        options={{
          drawerLabel: "Home",
        }}
      />

      {/* 2. This points to History.tsx in the (customer) root */}
      <Drawer.Screen 
        name="History" 
        options={{
          drawerLabel: "My Bookings",
        }}
      />

      {/* 3. This points to profile.tsx in the (customer) root */}
      <Drawer.Screen 
        name="profile" 
        options={{
          drawerLabel: "Account",
        }}
      />

      {/* 4. This handles all the utility screens inside your (stack) folder */}
      <Drawer.Screen 
        name="(stack)" 
        options={{
          drawerItemStyle: { display: 'none' }, // Hides the stack folder from the sidebar menu
        }}
      />
    </Drawer>
  );
}