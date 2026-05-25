// Importaciones Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
  
  import {
    getFirestore,
    setDoc,
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    updateDoc
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAePGRR9dxTwRhhf0LvF3yB8EYym4nmzko",
  authDomain: "street-training-88715.firebaseapp.com",
  projectId: "street-training-88715",
  storageBucket: "street-training-88715.firebasestorage.app",
  messagingSenderId: "1004305021286",
  appId: "1:1004305021286:web:f402f023480cada913b0a7"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setDoc,
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    updateDoc
  };