import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import DailyRoutinePage from './pages/DailyRoutinePage';
import ContentLibraryPage from './pages/ContentLibraryPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import ProductsPage from './pages/ProductsPage';
import CampaignsPage from './pages/CampaignsPage';
import LeadsPage from './pages/LeadsPage';
import ReportsPage from './pages/ReportsPage';
import AlertsPage from './pages/AlertsPage';
import SeasonalDatesPage from './pages/SeasonalDatesPage';

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/rotina/:id" element={<DailyRoutinePage />} />
        <Route path="/conteudos" element={<ContentLibraryPage />} />
        <Route path="/midias" element={<MediaLibraryPage />} />
        <Route path="/produtos" element={<ProductsPage />} />
        <Route path="/campanhas" element={<CampaignsPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="/sazonais" element={<SeasonalDatesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
