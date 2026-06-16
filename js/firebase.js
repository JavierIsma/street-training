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
    initializeFirestore, // Cambiado getFirestore por initializeFirestore para configuración avanzada
    persistentLocalCache, // Módulo para activar el almacenamiento local en disco
    persistentMultipleTabManager, // Permite que el caché funcione aunque la alumna tenga varias pestañas abiertas
    setDoc,
    doc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    updateDoc,
    onSnapshot
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

// Inicializar Firestore con Caché Local Permanente habilitado
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

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
    updateDoc,
    onSnapshot
  };