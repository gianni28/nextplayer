import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { firebaseEnabled, getFirebase, type FirebaseKit } from "../lib/firebase";

interface AuthState {
  enabled: boolean;
  /** undefined mientras Firebase resuelve la sesión. */
  user: User | null | undefined;
  favorites: Set<number>;
  toggleFavorite: (playerId: number) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  enabled: false,
  user: null,
  favorites: new Set(),
  toggleFavorite: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<FirebaseKit | null>(null);
  const [user, setUser] = useState<User | null | undefined>(firebaseEnabled ? undefined : null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      ?.then((k) => {
        if (cancelled) return;
        setKit(k);
        unsub = k.authMod.onAuthStateChanged(k.auth, setUser);
      })
      .catch(() => setUser(null));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  // Favoritos en tiempo real: users/{uid} → { favorites: number[] }
  useEffect(() => {
    if (!kit || !user) {
      setFavorites(new Set());
      return;
    }
    const { doc, onSnapshot } = kit.storeMod;
    return onSnapshot(doc(kit.db, "users", user.uid), (snap) => {
      const list = (snap.data()?.favorites as number[] | undefined) ?? [];
      setFavorites(new Set(list));
    });
  }, [kit, user]);

  const toggleFavorite = useCallback(
    async (playerId: number) => {
      if (!kit || !user) return;
      const { doc, setDoc, arrayRemove, arrayUnion } = kit.storeMod;
      const isFav = favorites.has(playerId);
      // Actualización optimista: la UI responde al instante.
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(playerId);
        else next.add(playerId);
        return next;
      });
      await setDoc(doc(kit.db, "users", user.uid), { favorites: isFav ? arrayRemove(playerId) : arrayUnion(playerId) }, { merge: true });
    },
    [kit, favorites, user],
  );

  const logout = useCallback(async () => {
    if (kit) await kit.authMod.signOut(kit.auth);
  }, [kit]);

  const value = useMemo(
    () => ({ enabled: firebaseEnabled, user, favorites, toggleFavorite, logout }),
    [user, favorites, toggleFavorite, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
