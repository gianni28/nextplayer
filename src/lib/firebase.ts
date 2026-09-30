/**
 * Firebase es opcional: si faltan las variables VITE_FIREBASE_*, la app
 * funciona igual pero sin cuentas ni favoritos.
 *
 * Además se carga bajo demanda (import dinámico) para que el ranking no
 * tenga que esperar a descargar el SDK.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

async function load() {
  const [appMod, authMod, storeMod] = await Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore")]);
  const app = appMod.initializeApp(config);
  return { auth: authMod.getAuth(app), db: storeMod.getFirestore(app), authMod, storeMod };
}

export type FirebaseKit = Awaited<ReturnType<typeof load>>;

let kit: Promise<FirebaseKit> | null = null;

export function getFirebase(): Promise<FirebaseKit> | null {
  if (!firebaseEnabled) return null;
  kit ??= load();
  return kit;
}
