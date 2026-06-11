import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  sendEmailVerification, // <-- Add this
  signInWithCredential,
  User,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Required for OAuth redirect to complete properly on Android
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

// ─────────────────────────────────────────────────────────────────────────────
// Replace these with your actual client IDs from Google Cloud Console
// iOS:     Bundle ID client from your app's credentials
// Android: Package name client from your app's credentials
// Web:     Web client ID (also used as the Firebase OAuth client ID)
// ─────────────────────────────────────────────────────────────────────────────
const GOOGLE_EXPO_CLIENT_ID    = "492837492837-asdfghjkl123456789.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID     = "492837492837-qwertyuiop123456.apps.googleusercontent.com";
const GOOGLE_ANDROID_CLIENT_ID = "492837492837-zxcvbnm987654.apps.googleusercontent.com";

// 🛡️ 1. The Gatekeeper Hook
// 🛡️ 1. The Gatekeeper Hook
export function useProtectedRoute(user: any, role: string | null, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user) {
      if (!inAuthGroup) {
        router.replace("/(auth)/register");
      }
    } else if (user) {
      // 🔒 NEW: The Email Verification Blockade
      // Check if they signed up with email/password instead of Google
      const isEmailLogin = user.providerData?.some((p: any) => p.providerId === "password");
      
      if (isEmailLogin && !user.emailVerified) {
        // If they are not already on the verify screen, force them there
        if (segments[1] !== "verify-email") {
          router.replace("/(auth)/verify-email");
        }
        return; // Abort further routing so they stay trapped here
      }

      // Allow verified users or Google users to proceed to the app
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

  // ── Google OAuth session ──────────────────────────────────────────────────
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_EXPO_CLIENT_ID, // Changed from clientId to webClientId
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle the OAuth response when it arrives
  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { id_token } = googleResponse.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch((err) => {
        console.error("Google credential sign-in error:", err);
      });
    }
  }, [googleResponse]);

  // ── Firebase Auth Listener ────────────────────────────────────────────────
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

  // ── Auth Methods ──────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

 const signUp = async (email: string, password: string, selectedRole: Role = "customer") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // ✉️ Send the verification email instantly
      await sendEmailVerification(newUser);

      // Create the global user document
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        role: selectedRole,
        hasCompletedOnboarding: selectedRole === "customer",
        createdAt: serverTimestamp(),
      });

      // Create the specific customer document
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

  /**
   * signInWithGoogle — provisions Firestore records for first-time Google users,
   * then lets the auth listener handle routing. Call promptGoogleAsync() from the
   * UI to trigger the OAuth sheet; this method is invoked automatically via the
   * googleResponse effect above, but is also exposed for manual use if needed.
   */
  const signInWithGoogle = async () => {
    // The actual credential exchange is handled in the googleResponse effect.
    // This method is exposed so UI code can await the Firestore provisioning
    // after signInWithCredential resolves — we handle that here by watching
    // for a new firebase user in onAuthStateChanged and checking if a Firestore
    // record already exists.
    //
    // Provisioning logic lives inside onAuthStateChanged's snapshot callback:
    // if the user doc doesn't exist yet, we create it below.
  };

  // ── Firestore Auto-Provisioning for Google sign-ins ───────────────────────
  // Runs inside the auth listener when a new Google user arrives with no doc.
  useEffect(() => {
    if (!user) return;

    const provision = async () => {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // First Google sign-in — create records
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

        // Manually update local state so the gatekeeper fires immediately
        setRole("customer");
        setIsOnboarded(true);
      }
    };

    provision().catch((err) => console.error("Google provisioning error:", err));
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

// 🎣 3. The Context Consumer
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}