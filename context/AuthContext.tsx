import React, { createContext, useContext, useEffect, useState } from "react";
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
  isOnboarded: boolean; // Kept for Professional compatibility
  setIsOnboarded: (val: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, selectedRole: Role) => Promise<void>;
  signOut: () => Promise<void>;
  role: Role | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Real-time listener for the user's role and onboarding status
        const userRef = doc(db, "users", firebaseUser.uid);
        
        const unsubDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setRole(data.role as Role);
            // If customer, we treat them as "onboarded" by default
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
        // Customers are ready to go immediately
        hasCompletedOnboarding: selectedRole === "customer" ? true : false,
        createdAt: serverTimestamp(),
      });

      // 2. Customer Specialized Skeleton
      if (selectedRole === "customer") {
        await setDoc(doc(db, "customers", newUser.uid), {
          uid: newUser.uid,
          email: newUser.email,
          // Generate the unique start-job PIN for the customer
          startPin: Math.floor(1000 + Math.random() * 9000).toString(),
          savedAddresses: [],
          createdAt: serverTimestamp(),
        });
      }
      
      // Local state will be updated via onSnapshot
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}