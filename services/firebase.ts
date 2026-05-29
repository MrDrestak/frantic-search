
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

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
// Check if apps are already initialized to avoid "already exists" error in dev hot-reload
const app = !firebase.apps.length 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.app();

// Export services
export const auth = app.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const db = app.firestore();
export default app;
