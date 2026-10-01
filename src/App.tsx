import { Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { Footer, Header } from "./components/Layout";
import { NotFoundPage, StatusScreen } from "./components/Status";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazyPage } from "./lib/lazyPage";
import { ExplorePage } from "./pages/ExplorePage";
import { PlayerPage } from "./pages/PlayerPage";

const FavoritesPage = lazyPage(() => import("./pages/FavoritesPage").then((m) => m.FavoritesPage));
const LoginPage = lazyPage(() => import("./pages/LoginPage").then((m) => m.LoginPage));
const AboutPage = lazyPage(() => import("./pages/AboutPage").then((m) => m.AboutPage));

/** Al cambiar de página (no de filtros), vuelve arriba. */
function ScrollToTop() {
  const { pathname } = useLocation();
  // Ojo: la función no debe devolver nada. En Edge/Chrome recientes scrollTo devuelve una
  // promesa y React la tomaría como función de limpieza ("n is not a function").
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Las páginas, aisladas: si una falla, no se cae toda la app. */
function Pages() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<StatusScreen state={{ status: "loading" }} />}>
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/jugador/:id" element={<PlayerPage />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/datos" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AuthProvider>
          <ScrollToTop />
          <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-ink">
            Saltar al contenido
          </a>
          <Header />
          <main id="contenido" className="min-h-[70vh]">
            <Pages />
          </main>
          <Footer />
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
  );
}
