import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { Footer, Header } from "./components/Layout";
import { NotFoundPage } from "./components/Status";
import { ExplorePage } from "./pages/ExplorePage";
import { PlayerPage } from "./pages/PlayerPage";

const FavoritesPage = lazy(() => import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));

/** Al cambiar de página (no de filtros), vuelve arriba. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
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
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<ExplorePage />} />
                <Route path="/jugador/:id" element={<PlayerPage />} />
                <Route path="/favoritos" element={<FavoritesPage />} />
                <Route path="/entrar" element={<LoginPage />} />
                <Route path="/datos" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
  );
}
