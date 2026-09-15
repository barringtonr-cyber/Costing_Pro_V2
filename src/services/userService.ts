import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase";
import firebaseConfig from "../../firebase-applet-config.json";

export interface NewUserData {
  email: string;
  displayName: string;
  role: "user" | "admin";
  isPro: boolean;
  companyName?: string;
  password?: string;
}

export interface CreateUserResult {
  success: boolean;
  uid: string;
  authCreated: boolean;
  message?: string;
}

/**
 * Creates a new user profile and optional Firebase Auth credentials.
 * Uses an isolated secondary Firebase App instance so the current Admin session is never signed out.
 */
export async function createUserByAdmin(data: NewUserData): Promise<CreateUserResult> {
  const email = data.email.trim().toLowerCase();
  const displayName = data.displayName.trim();
  const role = data.role || "user";
  const isPro = Boolean(data.isPro);
  const companyName = data.companyName?.trim() || "";
  const password = data.password?.trim() || "";

  if (!email) {
    throw new Error("Email address is required.");
  }

  // Check if a user with this email already exists in Firestore users collection
  const existingUserQuery = query(
    collection(db, "users"),
    where("email", "==", email)
  );
  const existingDocs = await getDocs(existingUserQuery);
  if (!existingDocs.empty) {
    throw new Error(`A user with email "${email}" already exists in the system.`);
  }

  let uid = "";
  let authCreated = false;

  if (password) {
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Initialize an isolated secondary Firebase app to create auth credentials
    const secondaryAppName = `admin-create-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);

    try {
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      uid = userCredential.user.uid;
      authCreated = true;
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        throw new Error("This email is already registered in Firebase Authentication.");
      } else if (err.code === "auth/weak-password") {
        throw new Error("Password is too weak. Please use at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        throw new Error("The provided email address is invalid.");
      } else if (err.code === "auth/operation-not-allowed") {
        throw new Error(
          "Email/Password sign-in is not enabled in your Firebase project. Please select 'Google SSO Pre-Authorization' or enable Email/Password provider in Firebase Console."
        );
      } else {
        throw new Error(err.message || "Failed to create authentication user.");
      }
    } finally {
      // Always safely clean up the secondary app instance
      await deleteApp(secondaryApp).catch((e) => console.warn("Error deleting secondary app:", e));
    }
  }

  // Create or set the Firestore user record
  // If auth was created, use the exact auth uid as the doc ID.
  // Otherwise, create a placeholder document under `doc(collection(db, "users"))`.
  const userDocRef = uid ? doc(db, "users", uid) : doc(collection(db, "users"));
  const finalUid = uid || userDocRef.id;

  const userProfilePayload: Record<string, any> = {
    email,
    displayName: displayName || (email.split("@")[0] || "User"),
    role,
    isPro,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.email || "admin",
    onboardingComplete: false
  };

  if (companyName) {
    userProfilePayload.companyName = companyName;
  }

  if (!authCreated) {
    userProfilePayload.preAuthorized = true;
  }

  await setDoc(userDocRef, userProfilePayload);

  return {
    success: true,
    uid: finalUid,
    authCreated,
    message: authCreated
      ? `User created with login credentials for ${email}.`
      : `User profile pre-authorized for ${email}. They can sign in with Google to activate.`
  };
}
