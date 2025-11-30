import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TopologyPage } from './pages/TopologyPage';
import { ComponentsPage } from './pages/ComponentsPage';
import { ChassisPage } from './pages/ChassisPage';
import { QuotePage } from './pages/QuotePage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/ui/Toast';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<TopologyPage />} />
            <Route path="/components" element={<ComponentsPage />} />
            <Route path="/chassis" element={<ChassisPage />} />
            <Route path="/quote" element={<QuotePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
}

export default App;
