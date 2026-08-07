import { describe, expect, it } from 'vitest';
import { containsCrisisLanguage, initialSession, money } from './demo-data';

describe('demo helpers', () => {
  it('formats costs for display', () => expect(money(3)).toBe('$3.00'));
  it('starts every browser-only session cleanly', () => expect(initialSession()).toMatchObject({ status: 'idle', minutesLeft: 60, cost: 0, messages: [] }));
  it('detects configured crisis phrases without claiming real triage', () => expect(containsCrisisLanguage('I want to hurt myself')).toBe(true));
  it('does not flag ordinary conversation', () => expect(containsCrisisLanguage('I had a hard day')).toBe(false));
});
