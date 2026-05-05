// src/store/callStore.ts
import { create } from 'zustand';
import type { CallStatus } from '../types/calls';

interface CallState {
  // Current in-progress or recently completed call
  currentCallId: string | null;
  currentRetellCallId: string | null;
  currentStatus: CallStatus | null;

  // Actions
  setCurrentCall: (callId: string, retellCallId: string) => void;
  updateStatus: (status: CallStatus) => void;
  clearCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  currentCallId: null,
  currentRetellCallId: null,
  currentStatus: null,

  setCurrentCall: (callId, retellCallId) =>
    set({ currentCallId: callId, currentRetellCallId: retellCallId, currentStatus: 'ringing' }),

  updateStatus: (status) => set({ currentStatus: status }),

  clearCall: () =>
    set({ currentCallId: null, currentRetellCallId: null, currentStatus: null }),
}));
