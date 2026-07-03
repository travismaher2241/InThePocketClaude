import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

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

// Export the app so other files can use it
export { app };
