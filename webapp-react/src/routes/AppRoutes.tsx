/**
 * Application routes.
 *
 * Uses React Router v7 with hash-based routing for compatibility
 * with Cordova and static file deployments.
 *
 * Route structure:
 *   #/                      → WelcomePage
 *   #/search/:lang/:term    → SearchLayout (results + definitions)
 *   #/settings              → SettingsPage
 *   ?sidebar=true           → Show sidebar on small screens (SearchLayout)
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import SearchLayout from '../components/SearchLayout/SearchLayout';
import SettingsPage from '../components/Settings/SettingsPage';
import WelcomePage from '../components/Welcome/WelcomePage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/search/:lang/:term" element={<SearchLayout />} />
      <Route path="/settings" element={<SettingsPage />} />
      {/* Fallback: redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
