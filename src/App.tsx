import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { LoginPage } from '@/auth/LoginPage';
import { ConfiguratorProvider } from '@/configurator/ConfiguratorContext';
import { ConfiguratorPage } from '@/configurator/ConfiguratorPage';
import { GalleryPage } from '@/gallery/GalleryPage';
import { CatalogPage } from '@/catalog/CatalogPage';
import { NavBar } from '@/components/NavBar';

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
      <Routes>
        <Route path="/" element={<Navigate to="/configure" replace />} />
        <Route path="/configure" element={<ConfiguratorPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="*" element={<Navigate to="/configure" replace />} />
      </Routes>
    </div>
  );
}
