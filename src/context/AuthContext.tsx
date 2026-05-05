import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthUser extends User {
  role?: string;
  isPro?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isPro: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isPro: false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check for admin/pro status in Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          let userData = userDoc.exists() ? userDoc.data() : null;

          // Provision user doc if it doesn't exist
          if (!userData) {
            userData = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: firebaseUser.email === "barringtonr@gmail.com" ? "admin" : "user",
              createdAt: serverTimestamp(),
              isPro: firebaseUser.email === "barringtonr@gmail.com" ? true : false
            };
            await setDoc(doc(db, "users", firebaseUser.uid), userData);
          }

          const authUser = {
            ...firebaseUser,
            role: userData.role || (firebaseUser.email === "barringtonr@gmail.com" ? "admin" : "user"),
            isPro: userData.isPro || firebaseUser.email === "barringtonr@gmail.com"
          } as AuthUser;

          setUser(authUser);
        } catch (err) {
          console.error("Error fetching user data:", err);
          setUser(firebaseUser as AuthUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isPro: user?.isPro || false }}>
      {children}
    </AuthContext.Provider>
  );
};
