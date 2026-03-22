import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store/storeModel";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "react-hot-toast";
import SeoManager from "./components/seo/SeoManager";

// Layouts
import { MainLayout } from "./components/layout/MainLayout";

// High-Level Pages
import { LandingPage } from "./pages/LandingPage";
import { MarketPage } from "./pages/MarketPage";
import { MarketDetailPage } from "./pages/MarketDetailPage";
import {
  DashboardPage,
  AdminPage,
  HealthPage,
  SettingsPage,
  AlertsPage
} from "./pages/wrappers";

// Auth & Social
import { SignInPage, SignUpPage, EmailVerificationPrompt } from "./pages/AuthPages";
import { ActivityPage, LeaderboardPage, HowItWorksPage, TransparencyPage } from "./pages/StaticPages";
import UserProfilePage from "./pages/UserProfilePage";
import AdminZMGPage from "./pages/AdminZMGPage";
import AdminOpsPage from "./pages/AdminOpsPage";
import EpochHistoryPage from "./pages/EpochHistoryPage";
import { EmailVerificationGuard } from "./components/auth/EmailVerificationGuard";
import { LegalModal } from "./components/LegalModal";

// Legal Policies
import { TermsPage } from "./pages/legal/TermsPage";
import { PrivacyPage } from "./pages/legal/PrivacyPage";
import { ResponsiblePlayPage } from "./pages/legal/ResponsiblePlayPage";
import { AVDCompliancePage } from "./pages/legal/AVDCompliancePage";

// Resource Pages
import { APIDocsPage } from "./pages/APIDocsPage";
import { BetaFAQPage } from "./pages/BetaFAQPage";

function App() {
  const {
    isAuthLoading,
    syncUser,
    user,
    tier
  } = useStore();

  useEffect(() => {
    // Only call syncUser once on mount
    syncUser();
    useStore.getState().fetchCategories();
    useStore.getState().fetchCurrentEpoch();
    useStore.getState().fetchRates();
  }, [syncUser]);

  useEffect(() => {
    // Secondary effects when user profile is ready
    if (user) {
      useStore.getState().fetchNotifications();
    }
  }, [user]);

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full bg-brand-bg flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#38bdf8] animate-spin" />
        <div className="text-[#38bdf8] font-black tracking-widest text-[10px] uppercase animate-pulse">
          Establishing Secure Link...
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SeoManager />
        <Toaster position="bottom-center" toastOptions={{
          style: { background: '#0f172a', color: '#fff', border: '1px solid #1e293b', fontSize: '12px', fontWeight: 'bold' }
        }} />
        <LegalModal />
        <Routes>
          {/* Landing Page is Standalone */}
          <Route path="/" element={<LandingPage />} />

          {/* Legal Policies (Standalone) */}
          <Route path="/legal/terms" element={<TermsPage />} />
          <Route path="/legal/privacy" element={<PrivacyPage />} />
          <Route path="/legal/responsible-play" element={<ResponsiblePlayPage />} />

          {/* Console Surfaces (Inside MainLayout) */}
          <Route element={<MainLayout />}>

            <Route path="/markets" element={<MarketPage />} />
            <Route path="/market/:id" element={<MarketDetailPage />} />
            <Route path="/category/:slug" element={<MarketPage />} />

            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/leaderboards" element={<LeaderboardPage />} />
            <Route path="/notifications" element={<AlertsPage />} />

            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/transparency" element={<TransparencyPage />} />
            <Route path="/history" element={<EpochHistoryPage />} />
            <Route path="/api-docs" element={<APIDocsPage />} />
            <Route path="/faq" element={<BetaFAQPage />} />
            <Route path="/legal/avd-compliance" element={<AVDCompliancePage />} />

            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* User Protected Surfaces */}
            <Route path="/dashboard" element={
              user ? (
                <EmailVerificationGuard>
                  <DashboardPage />
                </EmailVerificationGuard>
              ) : <Navigate to="/signin" replace />
            } />
            <Route path="/portfolio" element={
              user ? (
                <EmailVerificationGuard>
                  <DashboardPage />
                </EmailVerificationGuard>
              ) : <Navigate to="/signin" replace />
            } />
            <Route path="/profile/me" element={
              user ? (
                <EmailVerificationGuard>
                  <UserProfilePage />
                </EmailVerificationGuard>
              ) : <Navigate to="/signin" replace />
            } />
            <Route path="/settings" element={
              user ? (
                <EmailVerificationGuard>
                  <SettingsPage />
                </EmailVerificationGuard>
              ) : <Navigate to="/signin" replace />
            } />
            <Route path="/profile/:username" element={<UserProfilePage />} />

            {/* Operational Overwatch (Admin) */}
            <Route path="/admin" element={user && user.isAdmin ? <AdminPage /> : <Navigate to="/markets" replace />} />
            <Route path="/admin/zmg" element={user && user.isAdmin ? <AdminZMGPage /> : <Navigate to="/markets" replace />} />
            <Route path="/admin/ops" element={user && (user.isAdmin || user.isModerator) ? <AdminOpsPage /> : <Navigate to="/markets" replace />} />
            <Route path="/health" element={user && user.isAdmin ? <HealthPage /> : <Navigate to="/markets" replace />} />
          </Route>

          {/* Global Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
