import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native"; // 👈 Added AppState
import { useRouter, useSegments, useRootNavigationState } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithCredential,
  User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  role: Role | null;
  googleRequest: ReturnType<typeof Google.useAuthRequest>[0];
  promptGoogleAsync: ReturnType<typeof Google.useAuthRequest>[2];
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_EXPO_CLIENT_ID    = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-web-id";
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "missing-ios-id";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "missing-android-id";

// 🛡️ 1. The Upgraded Gatekeeper Hook
export function useProtectedRoute(user: any, role: string | null, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    // Prevent routing decisions while Firebase is still loading
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isVerifyScreen = segments[1] === "verify-email";

    if (!user) {
      if (!inAuthGroup) {
        // Fallback directly to the login screen if they aren't authenticated
        router.replace("/(auth)/login");
      }
      return;
    } 

    const isEmailLogin = user.providerData?.some((p: any) => p.providerId === "password");
    
    // Trap them on the verify screen if email is unverified
    if (isEmailLogin && !user.emailVerified) {
      if (!isVerifyScreen) {
        router.replace("/(auth)/verify-email");
      }
      return; 
    }

    // Wait for the role to load from Firestore before making final routing decisions.
    // This stops the app from panicking and kicking them to the login screen early.
    if (!role) return;

    if (inAuthGroup || segments.length === 0 || segments[0] === "index") {
      if (role === "customer") {
        router.replace("/(customer)");
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

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_EXPO_CLIENT_ID, 
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { id_token } = googleResponse.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch((err) => {
        console.error("Google credential sign-in error:", err);
      });
    }
  }, [googleResponse]);

  // 🚀 FIXED: The "Magic Reload" for Email Verification
  useEffect(() => {
    // Listens for the user returning to the app from their Email client
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active" && auth.currentUser) {
        // Force Firebase to grab the latest verification status from the server
        await auth.currentUser.reload();
        // Clone the user object to force React to trigger a state update and run the Gatekeeper
        setUser({ ...auth.currentUser } as User);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);

        const unsubDoc = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setRole(data.role as Role);
              setIsOnboarded(
                data.role === "customer" ? true : (data.hasCompletedOnboarding ?? false)
              );
            }
            setUser(firebaseUser);
            setLoading(false);
          },
          (err) => {
            console.error("Firestore Auth Listener Error:", err);
            setLoading(false);
          }
        );

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

      await sendEmailVerification(newUser);

      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        role: selectedRole,
        hasCompletedOnboarding: selectedRole === "customer",
        createdAt: serverTimestamp(),
      });

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

  const signInWithGoogle = async () => {};

  useEffect(() => {
    if (!user) return;

    const provision = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName ?? "",
            photoURL: user.photoURL ?? "",
            role: "customer",
            hasCompletedOnboarding: true,
            provider: "google",
            createdAt: serverTimestamp(),
          });

          await setDoc(doc(db, "customers", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName ?? "",
            photoURL: user.photoURL ?? "",
            startPin: Math.floor(1000 + Math.random() * 9000).toString(),
            savedAddresses: [],
            createdAt: serverTimestamp(),
          });

          setRole("customer");
          setIsOnboarded(true);
        }
      } catch (err: any) {
        console.error("Google provisioning error:", err);
        if (err.code === 'unavailable' || err.message?.includes('offline')) {
          console.warn("Bypassing provisioning due to offline network state.");
          setRole("customer");
          setIsOnboarded(true);
        }
      }
    };

    provision();
  }, [user]);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        activeJobId,
        setActiveJobId,
        user,
        loading,
        isOnboarded,
        setIsOnboarded,
        signIn,
        signUp,
        signInWithGoogle,
        signOut, 
        role,
        googleRequest,
        promptGoogleAsync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}