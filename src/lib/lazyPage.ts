import { lazy, type ComponentType } from "react";

const FLAG = "nextplayer:recargado-por-version";

/**
 * Como `React.lazy`, pero tolera despliegues nuevos: si la pestaña quedó con una
 * versión vieja, el archivo de la página ya no existe en el servidor. En ese caso
 * reintenta una vez y, si sigue fallando, recarga la página para traer la versión
 * actual (una sola vez por sesión, para no entrar en un bucle).
 */
export function lazyPage<T extends ComponentType<object>>(load: () => Promise<T>) {
  return lazy(async () => {
    try {
      const Component = await load().catch(() => load());
      sessionStorage.removeItem(FLAG);
      return { default: Component };
    } catch (err) {
      if (!sessionStorage.getItem(FLAG)) {
        sessionStorage.setItem(FLAG, "1");
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}
