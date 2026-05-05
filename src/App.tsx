import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import VoiceOnboarding from './pages/VoiceOnboarding';
import Settings from './pages/Settings';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import CallDetail from './pages/CallDetail';
import CallHistory from './pages/CallHistory';
import { useLenis } from './hooks/useLenis';

function ScrollManager() {
  useLenis();
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          {/* Unified call detail: handles in-progress (polling) + completed (transcript+summary) */}
          <Route path="/calls/:id" element={
            <ProtectedRoute>
              <CallDetail />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <CallHistory />
            </ProtectedRoute>
          } />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <VoiceOnboarding />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
