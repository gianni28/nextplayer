import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { getFirebase } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage } from "../lib/authErrors";

type Mode = "entrar" | "crear";

export function LoginPage() {
  const { enabled, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [auth, setAuth] = useState<import("firebase/auth").Auth | null>(null);
  useEffect(() => {
    void getFirebase()?.then((k) => setAuth(k.auth));
  }, []);

  if (!enabled) return <Navigate to="/" replace />;
  if (user) return <Navigate to={from} replace />;

  const run = async (fn: () => Promise<unknown>) => {
    if (!auth) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      navigate(from, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    void run(() =>
      mode === "entrar"
        ? signInWithEmailAndPassword(auth, email.trim(), password)
        : createUserWithEmailAndPassword(auth, email.trim(), password),
    );
  };

  const onReset = async () => {
    if (!auth) return;
    if (!email.trim()) {
      setError("Escribe tu correo arriba y vuelve a tocar «Olvidé mi contraseña».");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError("");
      setNotice(`Si existe una cuenta con ${email.trim()}, te llegará un correo para crear una nueva contraseña.`);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <div className="page flex justify-center pt-12 sm:pt-20">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight">{mode === "entrar" ? "Inicia sesión" : "Crea tu cuenta"}</h1>
        <p className="mt-2 text-sm text-muted">No necesitas cuenta para ver el ranking. Sirve para guardar a tus jugadores favoritos.</p>

        <button type="button" className="btn-quiet mt-8 w-full" disabled={busy || !auth} onClick={() => auth && void run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
          </svg>
          Continuar con Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />o con tu correo<span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Correo</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Contraseña</span>
            <input
              type="password"
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-up/10 px-3 py-2 text-sm">
              {notice}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy || !auth || !email || !password}>
            {busy ? "Un momento…" : mode === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-sm">
          {mode === "entrar" && (
            <button type="button" onClick={() => void onReset()} className="text-muted underline-offset-2 hover:text-ink hover:underline">
              Olvidé mi contraseña
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "entrar" ? "crear" : "entrar");
              setError("");
              setNotice("");
            }}
            className="font-semibold text-brand hover:underline"
          >
            {mode === "entrar" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
