import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store/useStore";
import { Loader2 } from "lucide-react";

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

function App() {
  const {
    isAuthLoading,
    syncUser,
    user,
    tier
  } = useStore();

  useEffect(() => {
    syncUser();
    useStore.getState().fetchCategories();
  }, [syncUser]);

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
    <BrowserRouter>
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
          <Route path="/settings" element={
            user ? (
              <EmailVerificationGuard>
                <SettingsPage />
              </EmailVerificationGuard>
            ) : <Navigate to="/signin" replace />
          } />
          <Route path="/profile/:username" element={<UserProfilePage />} />

          {/* Operational Overwatch (Admin) */}
          <Route path="/admin" element={user && tier === 'Oracle' ? <AdminPage /> : <Navigate to="/markets" replace />} />
          <Route path="/admin/zmg" element={user && tier === 'Oracle' ? <AdminZMGPage /> : <Navigate to="/markets" replace />} />
          <Route path="/admin/ops" element={user && (user.isAdmin || user.isModerator) ? <AdminOpsPage /> : <Navigate to="/markets" replace />} />
          <Route path="/health" element={user ? <HealthPage /> : <Navigate to="/markets" replace />} />
        </Route>

        {/* Global Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
