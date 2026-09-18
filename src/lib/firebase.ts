import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicializar la aplicación de Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializar Firestore con la base de datos específica si está configurada
export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');
export default app;
