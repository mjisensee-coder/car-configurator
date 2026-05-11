import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LoginPage } from '@/auth/LoginPage';
import { ConfiguratorProvider } from '@/configurator/ConfiguratorContext';
import { GalleryPage } from '@/gallery/GalleryPage';
import { CatalogPage } from '@/catalog/CatalogPage';
import { NavBar } from '@/components/NavBar';

// Lazy-load the configurator route — three.js + drei + the GLB account for
// most of the bundle. Users who land on /gallery or /catalog don't pay for
// the 3D stack until they navigate to /configure.
const ConfiguratorPage = lazy(() =>
  import('@/configurator/ConfiguratorPage').then((m) => ({
    default: m.ConfiguratorPage,
  })),
);
// Admin pulls in three for the wheel preview — also lazy.
const AdminPage = lazy(() =>
  import('@/admin/AdminPage').then((m) => ({ default: m.AdminPage })),
);
// Heritage is a magazine-style feature page (large images, animated reveals);
// lazy-loaded so the main shell stays light.
const HeritagePage = lazy(() =>
  import('@/heritage/HeritagePage').then((m) => ({ default: m.HeritagePage })),
);

export function App() {
  return (
    <AuthProvider>
      <ConfiguratorProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Shell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ConfiguratorProvider>
    </AuthProvider>
  );
}

function Shell() {
  return (
    <div className="min-h-screen bg-garage-950 text-garage-100">
      <NavBar />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/configure" replace />} />
          <Route path="/configure" element={<ConfiguratorPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/heritage" element={<HeritagePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/configure" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="h-[calc(100vh-56px)] flex items-center justify-center">
      <div className="flex items-center gap-2 text-garage-300 text-sm">
        <svg
          className="animate-spin"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" opacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
        </svg>
        Loading studio…
      </div>
    </div>
  );
}
