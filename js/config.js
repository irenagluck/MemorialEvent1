// =============================================
//  FIREBASE CONFIGURATION & INITIALIZATION
//
//  Loaded first. Exposes `auth` and `db` globals
//  used throughout all other JS files.
// =============================================

const firebaseConfig = {
  apiKey:            "AIzaSyCGRbzgxdKA2fiG8BJaYWIOdvOlALoKOqs",
  authDomain:        "memorialevent.firebaseapp.com",
  projectId:         "memorialevent",
  storageBucket:     "memorialevent.firebasestorage.app",
  messagingSenderId: "132399885238",
  appId:             "1:132399885238:web:ac6671f39417d093ceef17"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();
