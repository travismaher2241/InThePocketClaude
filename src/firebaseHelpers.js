import { app } from "./firebaseConfig";
import { getFirestore, doc, deleteDoc, writeBatch } from "firebase/firestore";

const db = getFirestore(app);

/**
 * Deletes a single player document from the Firestore database.
 * @param {string} playerId 
 */
export async function deletePlayerFromFirestore(playerId) {
  const playerRef = doc(db, "players", playerId);
  await deleteDoc(playerRef);
}

/**
 * Deletes multiple player documents from the Firestore database in a single batch.
 * @param {string[]} playerIds 
 */
export async function bulkDeletePlayersFromFirestore(playerIds) {
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
