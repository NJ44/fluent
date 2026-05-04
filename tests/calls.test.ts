import { describe, it, expect } from 'vitest';
import { isFailureDisconnection, getDisconnectionMessage, FAILURE_DISCONNECTION_REASONS } from '../src/types/calls';

describe('call status helpers (CALL-05, CALL-07)', () => {
  it('isFailureDisconnection: returns true for dial_no_answer', () => {
    expect(isFailureDisconnection('dial_no_answer')).toBe(true);
  });

  it('isFailureDisconnection: returns true for dial_busy', () => {
    expect(isFailureDisconnection('dial_busy')).toBe(true);
  });

  it('isFailureDisconnection: returns true for invalid_destination', () => {
    expect(isFailureDisconnection('invalid_destination')).toBe(true);
  });

  it('isFailureDisconnection: returns false for agent_hangup (successful completion)', () => {
    expect(isFailureDisconnection('agent_hangup')).toBe(false);
  });

  it('isFailureDisconnection: returns false for user_hangup', () => {
    expect(isFailureDisconnection('user_hangup')).toBe(false);
  });

  it('isFailureDisconnection: returns false for null/undefined', () => {
    expect(isFailureDisconnection(null)).toBe(false);
    expect(isFailureDisconnection(undefined)).toBe(false);
  });

  it('getDisconnectionMessage: returns user-friendly message for dial_no_answer', () => {
    const msg = getDisconnectionMessage('dial_no_answer');
    expect(msg).toMatch(/no answer/i);
  });

  it('getDisconnectionMessage: returns fallback for unknown reason', () => {
    const msg = getDisconnectionMessage('some_unknown_reason');
    expect(msg).toContain('some_unknown_reason');
  });

  it('FAILURE_DISCONNECTION_REASONS: contains all 11 failure reasons', () => {
    expect(FAILURE_DISCONNECTION_REASONS.size).toBe(11);
  });
});
