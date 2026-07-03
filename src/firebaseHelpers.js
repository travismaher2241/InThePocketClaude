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
  updateDoc
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
  if (!uid) throw new Error("Authenticated user uid is required for batch deletions.");
  const batch = writeBatch(db);
  playerIds.forEach((id) => {
    const playerRef = doc(db, "players", id);
    batch.delete(playerRef);
  });
  await batch.commit();
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
