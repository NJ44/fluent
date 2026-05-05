import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import VoiceOnboarding from './pages/VoiceOnboarding';
import Settings from './pages/Settings';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import CallStatus from './pages/CallStatus';
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
          <Route path="/calls/:id" element={
            <ProtectedRoute>
              <CallStatus />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <div className="p-8 text-lg text-gray-500">Call history — coming in plan 02-05</div>
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
