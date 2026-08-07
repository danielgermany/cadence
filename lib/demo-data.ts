export type SessionStatus = 'idle' | 'connected' | 'held' | 'ended' | 'unavailable' | 'safety';
export type PartnerAvailability = 'available' | 'away';

export type Friend = { id: string; name: string; role: 'Friend' | 'Coach'; languages: string[] };
export type Coach = Friend & { role: 'Coach'; credential: string };
export type DemoMessage = { id: string; from: 'friend' | 'you'; text: string };
export type DemoSession = { status: SessionStatus; minutesLeft: number; cost: number; messages: DemoMessage[] };
export type CrisisResource = { title: string; description: string };

export const SMS_RATE = 1;
export const HOURLY_RATE = 25;
export const friends: Friend[] = [
  { id: 'maya', name: 'Maya', role: 'Friend', languages: ['English', 'Spanish'] },
  { id: 'sam', name: 'Sam', role: 'Friend', languages: ['English'] },
  { id: 'jules', name: 'Jules', role: 'Coach', languages: ['English', 'French'] }
];
export const scriptedReplies = [
  'Got it. Tell me more?',
  'I hear you — that sounds like a lot.',
  'Take your time. I’m listening.',
  'That makes sense. What feels most important right now?'
];
export const crisisKeywords = ['suicide', 'kill myself', 'hurt myself', 'end my life', 'self harm'];
export const crisisResource: CrisisResource = {
  title: 'You deserve immediate support.',
  description: 'This demo cannot provide crisis support. If you might act on thoughts of harming yourself or someone else, contact local emergency services or a crisis line now. In the U.S. and Canada, call or text 988.'
};

export const money = (amount: number) => `$${amount.toFixed(2)}`;
export const containsCrisisLanguage = (value: string) => crisisKeywords.some((keyword) => value.toLowerCase().includes(keyword));
export const initialSession = (): DemoSession => ({ status: 'idle', minutesLeft: 60, cost: 0, messages: [] });
