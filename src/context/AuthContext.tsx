import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";

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
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          let userData = userDoc.exists() ? userDoc.data() : null;

          // Check if an admin pre-provisioned this user by email
          if (!userData && firebaseUser.email) {
            try {
              const emailQ = query(
                collection(db, "users"),
                where("email", "==", firebaseUser.email.toLowerCase())
              );
              const emailSnap = await getDocs(emailQ);
              if (!emailSnap.empty) {
                const preDoc = emailSnap.docs[0];
                const preData = preDoc.data();
                userData = {
                  ...preData,
                  email: firebaseUser.email.toLowerCase(),
                  displayName: preData.displayName || firebaseUser.displayName || "",
                  updatedAt: serverTimestamp(),
                  preAuthorized: false
                };
                await setDoc(userDocRef, userData, { merge: true });
                if (preDoc.id !== firebaseUser.uid) {
                  await deleteDoc(preDoc.ref).catch(() => {});
                }
              }
            } catch (queryErr) {
              console.warn("Could not query pre-authorized user doc:", queryErr);
            }
          }

          // Provision default user doc if still doesn't exist
          if (!userData) {
            userData = {
              email: firebaseUser.email?.toLowerCase(),
              displayName: firebaseUser.displayName,
              role: firebaseUser.email === "barringtonr@gmail.com" ? "admin" : "user",
              createdAt: serverTimestamp(),
              isPro: firebaseUser.email === "barringtonr@gmail.com" ? true : false
            };
            await setDoc(userDocRef, userData);
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
