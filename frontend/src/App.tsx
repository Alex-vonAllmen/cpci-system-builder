import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TopologyPage } from './pages/TopologyPage';
import { ComponentsPage } from './pages/ComponentsPage';
import { ChassisPage } from './pages/ChassisPage';
import { QuotePage } from './pages/QuotePage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './store/authStore';

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TopologyPage />} />
          <Route path="components" element={<ComponentsPage />} />
          <Route path="chassis" element={<ChassisPage />} />
          <Route path="quote" element={<QuotePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route
            path="admin"
            element={
              <RequireAuth>
                <AdminPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
