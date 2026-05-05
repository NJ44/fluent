// src/pages/Dashboard.tsx
import { useNavigate } from 'react-router-dom';
import { IntentForm } from '../components/IntentForm';
import { useCallStore } from '../store/callStore';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { setCurrentCall } = useCallStore();
  const navigate = useNavigate();

  const handleCallSubmitted = ({ callId, retellCallId }: { callId: string; retellCallId: string }) => {
    setCurrentCall(callId, retellCallId);
    navigate(`/calls/${callId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Make a call</h1>
          <p className="text-gray-500 mt-1">
            Hi {user?.name || 'there'}. Describe your goal — the AI will call in your voice.
          </p>
        </div>

        {/* Intent form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <IntentForm onSubmit={handleCallSubmitted} />
        </div>

        {/* Call history link */}
        <div className="mt-6 text-center">
          <a href="/history" className="text-sm text-gray-500 hover:text-gray-700">
            View call history →
          </a>
        </div>
      </div>
    </div>
  );
}
