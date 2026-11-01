// Only the Firebase pieces No2 uses: sign-in (Google) and the member database.
export { initializeApp } from 'firebase/app';
export {
  initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, indexedDBLocalPersistence,
  GoogleAuthProvider, onAuthStateChanged, connectAuthEmulator, signInWithPopup, signInWithRedirect, signInWithCredential, getRedirectResult, signOut,
} from 'firebase/auth';
export {
  initializeFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, writeBatch, collection, query, where, orderBy, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';
