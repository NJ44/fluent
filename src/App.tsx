import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import VoiceOnboarding from './pages/VoiceOnboarding';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <div className="p-8 text-lg">Dashboard — coming in later plans</div>
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
          <Route path="/" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
