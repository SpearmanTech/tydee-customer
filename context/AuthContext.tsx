import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";

type Role = "customer";

type AuthContextType = {
  user: User | null;
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  loading: boolean;
  isOnboarded: boolean;
  setIsOnboarded: (val: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, selectedRole: Role) => Promise<void>;
  signOut: () => Promise<void>;
  role: Role | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🛡️ 1. The Gatekeeper Hook (Exported so _layout.tsx can use it)
export function useProtectedRoute(user: any, role: string | null, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Wait for Firebase to finish its initial check
    if (loading) return;

    // 2. Check if the user is currently navigating inside the (auth) group
    const inAuthGroup = segments[0] === "(auth)";

    if (!user) {
      // 3. If NOT logged in and NOT already in the auth screens, kick them to login
      if (!inAuthGroup) {
        router.replace("/(auth)/register"); 
      }
    } else if (user) {
      // 4. If LOGGED IN but sitting on an auth screen or root, push them into the app
      if (inAuthGroup || segments.length === 0 || segments[0] === "index") { 
        if (role === "customer") {
          router.replace("/(customer)");
        }
      }
    }
  }, [user, role, loading, segments, router]);
}

// 🧠 2. The State Manager Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        
        const unsubDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setRole(data.role as Role);
            setIsOnboarded(data.role === 'customer' ? true : (data.hasCompletedOnboarding ?? false));
          }
          setUser(firebaseUser);
          setLoading(false);
        }, (err) => {
          console.error("Firestore Auth Listener Error:", err);
          setLoading(false);
        });

        return () => unsubDoc();
      } else {
        setUser(null);
        setRole(null);
        setIsOnboarded(false);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
 
  const signUp = async (email: string, password: string, selectedRole: Role = "customer") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // 1. Create Base User record
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        role: selectedRole,
        hasCompletedOnboarding: selectedRole === "customer",
        createdAt: serverTimestamp(),
      });

      // 2. Customer Specialized Skeleton
      if (selectedRole === "customer") {
        await setDoc(doc(db, "customers", newUser.uid), {
          uid: newUser.uid,
          email: newUser.email,
          startPin: Math.floor(1000 + Math.random() * 9000).toString(),
          savedAddresses: [],
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("SignUp Error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      activeJobId, 
      setActiveJobId,
      user, 
      loading, 
      isOnboarded, 
      setIsOnboarded, 
      signIn, 
      signUp, 
      signOut, 
      role 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// 🎣 3. The Context Consumer
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}