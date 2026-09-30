import { FirebaseError } from "firebase/app";

/** Traduce los códigos de Firebase a mensajes que dicen qué hacer. */
export function authErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "El correo o la contraseña no coinciden. Revísalos o restablece tu contraseña.";
    case "auth/email-already-in-use":
      return "Ya hay una cuenta con ese correo. Inicia sesión en su lugar.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "Ese correo no tiene un formato válido.";
    case "auth/too-many-requests":
      return "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Se cerró la ventana de Google antes de terminar.";
    case "auth/network-request-failed":
      return "No hay conexión con el servidor. Revisa tu internet.";
    default:
      return "No se pudo completar el inicio de sesión. Inténtalo de nuevo.";
  }
}
