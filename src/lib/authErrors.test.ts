import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { authErrorMessage } from "./authErrors";

describe("authErrorMessage", () => {
  it("no revela si el correo existe", () => {
    const a = authErrorMessage(new FirebaseError("auth/user-not-found", ""));
    const b = authErrorMessage(new FirebaseError("auth/wrong-password", ""));
    expect(a).toBe(b);
  });
  it("tiene un mensaje por defecto", () => {
    expect(authErrorMessage(new Error("x"))).toMatch(/No se pudo/);
  });
});
