
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: PASTE YOUR FIREBASE CONFIG HERE FROM THE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyAmsnmnoFZlQGq1fIUHlPK1xqHfBhc28Jo",
  authDomain: "frantic-search.firebaseapp.com",
  projectId: "frantic-search",
  storageBucket: "frantic-search.firebasestorage.app",
  messagingSenderId: "32084700416",
  appId: "1:32084700416:web:ce11a36fea6baaf23797e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
