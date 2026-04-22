// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc };

// Your config (PASTE YOURS HERE)
const firebaseConfig = {
  apiKey: "AIzaSyBx9i4gh9rUx_46j0o3_QF1BOpibGdT1lE",
  authDomain: "sales-management-app-3fea5.firebaseapp.com",
  projectId: "sales-management-app-3fea5",
  storageBucket: "sales-management-app-3fea5.firebasestorage.app",
  messagingSenderId: "333962781232",
  appId: "1:333962781232:web:7d4e0bff740f477ffac3f5"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);