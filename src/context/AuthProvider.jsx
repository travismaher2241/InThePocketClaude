import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import { deleteAllUserFirestoreData } from '../firebaseHelpers';
import { getVideoClipsFromIDB, deleteVideoClipFromIDB } from '../utils/videoStore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign In function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign Up function
  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // Logout function
  async function logout() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('inthepocket_training_draft') || key.startsWith('inthepocket_active_plan') || key.startsWith('inthepocket_active_matchday') || key.startsWith('inthepocket_training_lab_state'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {
      console.error("Failed to clear localStorage on logout:", err);
    }
    return signOut(auth);
  }

  // Password reset function
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Permanently deletes the signed-in user's data and account.
  // Firebase requires a recent sign-in for account deletion - if this fails with
  // auth/requires-recent-login, the caller should ask the user to log out, log back
  // in, and retry immediately.
  async function deleteAccount() {
    const user = auth.currentUser;
    if (!user) throw new Error("No signed-in user to delete.");
    const uid = user.uid;

    await deleteAllUserFirestoreData(uid);

    try {
      const clips = await getVideoClipsFromIDB(uid);
      await Promise.all(clips.map(clip => deleteVideoClipFromIDB(clip.id, uid)));
    } catch (err) {
      console.warn("Failed to clear local video clips during account deletion:", err);
    }

    await deleteUser(user);

    try {
      localStorage.clear();
    } catch (err) {
      console.warn("Failed to clear localStorage after account deletion:", err);
    }
  }

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    deleteAccount,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
