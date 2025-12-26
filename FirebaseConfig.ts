// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, browserLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
// Only import AsyncStorage and Platform on native
let ReactNativeAsyncStorage, getReactNativePersistence, Platform;
if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  ReactNativeAsyncStorage = require("@react-native-async-storage/async-storage").default;
  Platform = require("react-native").Platform;
  getReactNativePersistence = require("firebase/auth").getReactNativePersistence;
}
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
  apiKey: "AIzaSyC1fqRDzI1R0_FCJMaTmP3sKi4OJsZRixo",
  authDomain: "scribit-ea02a.firebaseapp.com",
  projectId: "scribit-ea02a",
  storageBucket: "scribit-ea02a.firebasestorage.app",
  messagingSenderId: "48147729944",
  appId: "1:48147729944:web:7a0e03d6017635de527d6d",
  measurementId: "G-7K8V37ET4Q"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

let auth: Auth;
if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
  // Web
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
} else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
  // React Native
  auth = initializeAuth(app, { persistence: getReactNativePersistence(ReactNativeAsyncStorage) });
} else {
  // Fallback (could be SSR or unknown)
  auth = initializeAuth(app);
}
export { auth };

const analytics = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? getAnalytics(app) : undefined;

// Initialize Firestore and enable offline persistence
export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
    console.warn('Firestore persistence failed: Multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firestore persistence is not available in this browser.');
  }
});
