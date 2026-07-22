import { app } from "./firebaseConfig";
import { 
  getFirestore, 
  doc, 
  deleteDoc, 
  writeBatch, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  updateDoc,
  setDoc
} from "firebase/firestore";

const db = getFirestore(app);

/**
 * Fetches all active players owned by the authenticated user from Firestore.
 * @param {string} uid 
 * @returns {Promise<object[]>}
 */
export async function getPlayers(uid) {
  if (!uid) return [];
  const playersRef = collection(db, "players");
  const q = query(playersRef, where("ownerId", "==", uid));
  const querySnapshot = await getDocs(q);
  
  const players = [];
  querySnapshot.forEach((doc) => {
    players.push({ id: doc.id, ...doc.data() });
  });
  return players;
}

/**
 * Adds a new player document to Firestore, linking it to the user's ownerId.
 * @param {object} player 
 * @param {string} uid 
 * @returns {Promise<string>} docId
 */
export async function addPlayer(player, uid) {
  if (!uid) throw new Error("Authenticated user uid is required to add players.");
  const playersRef = collection(db, "players");
  const docRef = await addDoc(playersRef, {
    ...player,
    ownerId: uid
  });
  return docRef.id;
}

/**
 * Updates a player document in Firestore after verifying the ownerId.
 * @param {string} playerId 
 * @param {object} updatedFields 
 * @param {string} uid 
 */
export async function updatePlayerInFirestore(playerId, updatedFields, uid) {
  if (!uid) throw new Error("Authenticated user uid is required to update players.");
  const playerRef = doc(db, "players", playerId);
  const docSnap = await getDoc(playerRef);
  
  if (docSnap.exists()) {
    if (docSnap.data().ownerId === uid) {
      await updateDoc(playerRef, updatedFields);
    } else {
      throw new Error("Unauthorized: You do not own this player record.");
    }
  }
}

/**
 * Deletes a single player document from Firestore after confirming ownerId.
 * @param {string} playerId 
 * @param {string} uid 
 */
export async function deletePlayerFromFirestore(playerId, uid) {
  if (!uid) throw new Error("Authenticated user uid is required to delete players.");
  const playerRef = doc(db, "players", playerId);
  const docSnap = await getDoc(playerRef);
  
  if (docSnap.exists()) {
    if (docSnap.data().ownerId === uid) {
      await deleteDoc(playerRef);
    } else {
      throw new Error("Unauthorized: You do not own this player record.");
    }
  }
}

export async function bulkDeletePlayersFromFirestore(playerIds, uid) {
  if (!uid) throw new Error("UID required");
  const batch = writeBatch(db);
  
  for (const id of playerIds) {
    const playerRef = doc(db, "players", id);
    // Add the delete to the batch
    batch.delete(playerRef);
  }
  
  try {
    await batch.commit();
    console.log("Batch successfully deleted.");
  } catch (error) {
    console.error("Batch failed - check your Security Rules:", error);
    throw error; // This will show you exactly which rule is blocking it
  }
}

/**
 * Moves multiple players to the 'archived_players' collection and deletes them from the main 'players' collection in a single batch.
 * @param {object[]} players 
 */
export async function archivePlayersInFirestore(players) {
  const batch = writeBatch(db);
  players.forEach((player) => {
    // Write copy of the player profile to 'archived_players'
    const archiveRef = doc(db, "archived_players", player.id);
    batch.set(archiveRef, {
      ...player,
      archivedAt: new Date().toISOString()
    });

    // Delete player from main 'players' collection
    const playerRef = doc(db, "players", player.id);
    batch.delete(playerRef);
  });
  await batch.commit();
}

/**
 * Fetches the squad settings document for the authenticated user.
 * @param {string} uid 
 * @returns {Promise<object>}
 */
export async function getSquadSettings(uid) {
  if (!uid) return { squadName: "My Squad", ageGroup: "U14" };
  const docRef = doc(db, "squad_settings", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return { squadName: "My Squad", ageGroup: "U14" };
}

/**
 * Updates the squad settings document in Firestore for the authenticated user.
 * @param {object} settings 
 * @param {string} uid 
 */
export async function updateSquadSettings(settings, uid) {
  if (!uid) throw new Error("Authenticated user uid is required to save squad settings.");
  const docRef = doc(db, "squad_settings", uid);
  await setDoc(docRef, {
    ...settings,
    ownerId: uid,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Saves a completed training session to Firestore.
 * @param {object} sessionData 
 * @param {string} uid 
 * @returns {Promise<string>} sessionId
 */
export async function saveTrainingSession(sessionData, uid) {
  if (!uid) throw new Error("Authenticated user uid is required to save training sessions.");
  const sessionsRef = collection(db, "training_sessions");
  const docRef = await addDoc(sessionsRef, {
    ...sessionData,
    ownerId: uid,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

/**
 * Fetches all training sessions for the user, sorted newest first.
 * @param {string} uid 
 * @returns {Promise<object[]>}
 */
export async function getTrainingSessions(uid) {
  if (!uid) return [];
  const sessionsRef = collection(db, "training_sessions");
  const q = query(sessionsRef, where("ownerId", "==", uid));
  const querySnapshot = await getDocs(q);
  
  const sessions = [];
  querySnapshot.forEach((doc) => {
    sessions.push({ id: doc.id, ...doc.data() });
  });
  
  // Sort locally by createdAt desc to avoid composite index configuration requirement
  sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return sessions;
}

/**
 * Deletes a completed training session document from Firestore after confirming ownerId.
 * @param {string} sessionId 
 * @param {string} uid 
 */
export async function deleteSession(sessionId, uid) {
  if (!uid) throw new Error("Authenticated user uid is required to delete sessions.");
  const sessionRef = doc(db, "training_sessions", sessionId);
  const docSnap = await getDoc(sessionRef);
  
  if (docSnap.exists()) {
    if (docSnap.data().ownerId === uid) {
      await deleteDoc(sessionRef);
    } else {
      throw new Error("Unauthorized: You do not own this training session.");
    }
  }
}

const TIER_HIERARCHY = {
  'free': 0,
  'pro': 1,
  'ultra': 2,
  'b2b': 2,
  'team': 2,
  'club': 2,
  'ultra- club': 2,
  'ultra-club': 2
};

/**
 * Validates if the user's tier has access to the required tier.
 * @param {string} userTier 
 * @param {string} requiredTier 
 * @returns {boolean}
 */
export function hasAccess(userTier, requiredTier) {
  const uTier = (userTier || 'free').toLowerCase();
  const rTier = (requiredTier || 'free').toLowerCase();
  
  const userVal = TIER_HIERARCHY[uTier] ?? 0;
  const reqVal = TIER_HIERARCHY[rTier] ?? 0;
  
  return userVal >= reqVal;
}

/**
 * Fetches the user profile document from Firestore.
 * If it doesn't exist, initializes it with Free tier.
 * @param {string} uid 
 * @returns {Promise<object>}
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  // Initialize default Free profile
  const defaultProfile = {
    subscriptionTier: "free",
    isActive: true,
    aiGensCount: 0,
    createdAt: new Date().toISOString()
  };
  await setDoc(userRef, defaultProfile);
  return defaultProfile;
}

/**
 * Updates the user profile document in Firestore.
 * @param {string} uid 
 * @param {object} fields 
 */
export async function updateUserProfile(uid, fields) {
  if (!uid) throw new Error("UID required to update profile");
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, fields, { merge: true });
}

/**
 * Backend-secured helper to generate training plans.
 * Verifies subscription tier directly from Firestore database before calling Gemini.
 * @param {string} uid 
 * @param {string} promptText 
 * @param {string} apiKey 
 * @returns {Promise<object>}
 */
export async function generateAIPlanSecure(uid, promptText, apiKey) {
  if (!uid) throw new Error("Authenticated user required.");
  
  // 1. Fetch user profile from Firestore to verify their subscription
  const profile = await getUserProfile(uid);
  if (!profile || !profile.isActive) {
    throw new Error("Unauthorized: Inactive user profile.");
  }
  
  const userTier = (profile.subscriptionTier || 'free').toLowerCase();
  if (userTier === 'free') {
    const currentCount = profile.aiGensCount || 0;
    if (currentCount >= 2) {
      throw new Error("Upgrade Required: Free tier is limited to exactly 2 AI generations.");
    }
    // Increment count on Firestore
    await updateUserProfile(uid, { aiGensCount: currentCount + 1 });
  } else {
    if (!hasAccess(profile.subscriptionTier, "pro")) {
      throw new Error("Unauthorized: Active Pro, Ultra, or B2B subscription required to generate AI plans.");
    }
  }
  
  // 2. Perform AI Generation
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              duration: { type: "NUMBER" },
              instructions: { type: "STRING" },
              goal: { type: "STRING" },
              phase: { type: "STRING" }
            },
            required: ["title", "duration", "instructions", "goal", "phase"]
          }
        }
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }
  
  return await response.json();
}
