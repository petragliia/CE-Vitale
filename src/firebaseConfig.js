// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQevQiHBE8N0slgDf7xjaFhIBmxZ0UwB4",
  authDomain: "controleestoquevitale.firebaseapp.com",
  projectId: "controleestoquevitale",
  storageBucket: "controleestoquevitale.appspot.com",
  messagingSenderId: "454943180156",
  appId: "1:454943180156:web:2f849fa0094fe4b7e5d0f9",
  measurementId: "G-EZSRPE3TNJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
