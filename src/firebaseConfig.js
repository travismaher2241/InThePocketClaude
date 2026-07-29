import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC6hmnm8IFSl6IwvEjUmo2tLDa7PsDKpn8",
  authDomain: "com-example-coachcore-16e8b.firebaseapp.com",
  projectId: "com-example-coachcore-16e8b",
  storageBucket: "com-example-coachcore-16e8b.firebasestorage.app",
  messagingSenderId: "985562564445",
  appId: "1:985562564445:web:d7b0c51f3a1682ec7d8ab4",
  measurementId: "G-19ZQNK1FZE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// In local dev, point at the Firebase Emulator Suite instead of production
// (run `firebase emulators:start` from the CoachCore/functions setup) so
// tester login, AI generation, and subscription changes can be tested
// without deploying. Never activates in a production build.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Export the app, auth & functions so other files can use them
export { app, auth, functions };
