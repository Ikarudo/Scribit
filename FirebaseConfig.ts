// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth } from "firebase/auth";
import ReactNativeAsyncStorage, { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    }
);
const analytics = getAnalytics(app);

function getReactNativePersistence(ReactNativeAsyncStorage: AsyncStorageStatic): import("firebase/auth").Persistence | import("firebase/auth").Persistence[] | undefined {
    throw new Error("Function not implemented.");
}
