// Only the Firebase pieces No2 uses: sign-in (Google) and the member database.
export { initializeApp } from 'firebase/app';
export {
  initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, indexedDBLocalPersistence,
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
  connectAuthEmulator, signInWithCredential,
} from 'firebase/auth';
export {
  initializeFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, addDoc, updateDoc, writeBatch,
  collection, query, where, orderBy, limit, getDocs, onSnapshot, serverTimestamp, increment,
} from 'firebase/firestore';
