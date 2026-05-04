import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [cloneCheck, setCloneCheck] = useState<'loading' | 'has_clone' | 'no_clone'>('loading');

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setCloneCheck('loading');
      return;
    }
    // Skip clone check when already on onboarding — prevents infinite redirect loop
    if (location.pathname.startsWith('/onboarding')) {
      setCloneCheck('has_clone');
      return;
    }
    const check = async () => {
      try {
        const { data } = await supabase
          .from('voice_clones')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        setCloneCheck(data ? 'has_clone' : 'no_clone');
      } catch {
        setCloneCheck('has_clone'); // Don't block on error
      }
    };
    check();
  }, [isAuthenticated, user?.id, location.pathname]);

  if (isLoading || (isAuthenticated && cloneCheck === 'loading')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/sign-in" state={{ from: location }} replace />;
  if (cloneCheck === 'no_clone') return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
