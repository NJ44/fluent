import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import VoiceOnboarding from './pages/VoiceOnboarding';
import Settings from './pages/Settings';
import HomePage from './pages/HomePage';
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
