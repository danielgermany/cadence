'use client';

import { FormEvent, useEffect, useState } from 'react';
import { containsCrisisLanguage, crisisResource, friends, initialSession, money, scriptedReplies, HOURLY_RATE, SMS_RATE } from '../lib/demo-data';

export function SessionDemo() {
  const [session, setSession] = useState(initialSession);
  const [draft, setDraft] = useState('');
  const [extensionMinutes, setExtensionMinutes] = useState(60);
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const isFocused = session.status === 'connected' || session.status === 'held';

  useEffect(() => {
    if (session.status !== 'connected') return;
    const timer = window.setInterval(() => setSession((current) => {
      if (current.status !== 'connected') return current;
      return current.minutesLeft <= 1 ? { ...current, minutesLeft: 0, status: 'ended' } : { ...current, minutesLeft: current.minutesLeft - 1 };
    }), 1000);
    return () => window.clearInterval(timer);
  }, [session.status]);

  useEffect(() => {
    if (!isFocused) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isFocused]);

  const connect = () => setSession({ status: 'connected', minutesLeft: 60, cost: 0, messages: [{ id: 'welcome', from: 'friend', text: `Hi, I'm ${friends[0].name}. I'm here - no judgment, just listening. What's on your mind?` }] });
  const end = () => setSession((current) => ({ ...current, status: 'ended' }));
  const extensionCost = Math.round((HOURLY_RATE * extensionMinutes / 60) * 100) / 100;
  const extend = () => {
    setSession((current) => current.status === 'connected' ? { ...current, minutesLeft: current.minutesLeft + extensionMinutes, cost: current.cost + extensionCost } : current);
    setShowExtensionPrompt(false);
  };
  const reset = () => { setSession(initialSession()); setDraft(''); };
  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || session.status !== 'connected') return;
    if (containsCrisisLanguage(text)) { setSession((current) => ({ ...current, status: 'safety' })); setDraft(''); return; }
    const id = Date.now();
    setSession((current) => ({ ...current, cost: current.cost + SMS_RATE, messages: [...current.messages, { id: `you-${id}`, from: 'you', text }] }));
    setDraft('');
    window.setTimeout(() => setSession((current) => current.status === 'connected' ? { ...current, messages: [...current.messages, { id: `friend-${id}`, from: 'friend', text: scriptedReplies[current.messages.length % scriptedReplies.length] }] } : current), 700);
  };
  const sentCount = session.messages.filter((message) => message.from === 'you').length;

  return <aside className={`demo ${isFocused ? 'chat-focus' : ''}`} aria-live="polite" role={isFocused ? 'dialog' : undefined} aria-modal={isFocused || undefined} aria-label={isFocused ? 'Cadence demo conversation' : undefined}>
    {!isFocused && <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}><span className="status"><i className="dot" />3 Friends available now</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>Demo - no real session</span></div>}
    {session.status === 'idle' && <div style={{ marginTop: 20 }}><p className="body-copy">Tap connect to see how a conversation works.</p><button className="button" style={{ marginTop: 16 }} onClick={connect}>Connect with a Friend</button><button className="button ghost" style={{ marginLeft: 12 }} onClick={() => setSession((current) => ({ ...current, status: 'unavailable' }))}>Show no-match state</button></div>}
    {session.status === 'unavailable' && <div style={{ marginTop: 20 }}><p className="body-copy">No Friends are free at the moment. In a real service, you could leave a reason and a time to reconnect; this demo stores nothing.</p><button className="button ghost" onClick={reset}>Back to demo</button></div>}
    {isFocused && <div className="chat-focus-content"><div className="chat-focus-heading"><div><p className="eyebrow">Demo conversation</p><h2>Talking with Maya</h2></div><button className="button secondary" onClick={end}>End chat</button></div><div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}><span>{session.minutesLeft} min left</span><span>Cost so far: {money(session.cost)}</span></div><div className="chat">{session.messages.map((message) => <div key={message.id} className={`bubble ${message.from === 'you' ? 'you' : ''}`}>{message.text}</div>)}</div><form onSubmit={send}><div className="message-row"><input className="input" autoFocus aria-label="Type a message" disabled={session.status === 'held'} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message..." /><button className="button" disabled={session.status === 'held'}>Send - ${SMS_RATE}</button></div></form><div className="row" style={{ marginTop: 8 }}><button className="button secondary" onClick={() => setSession((current) => ({ ...current, status: current.status === 'held' ? 'connected' : 'held' }))}>{session.status === 'held' ? 'Resume' : 'Hold'}</button>{showExtensionPrompt ? <div className="extend-prompt"><label htmlFor="extension-minutes">Extend by <select id="extension-minutes" value={extensionMinutes} onChange={(event) => setExtensionMinutes(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option></select></label><button className="button secondary" disabled={session.status === 'held'} onClick={extend}>Add {extensionMinutes} min - {money(extensionCost)}</button><button className="button ghost" onClick={() => setShowExtensionPrompt(false)}>Cancel</button></div> : <button className="button secondary" disabled={session.status === 'held'} onClick={() => setShowExtensionPrompt(true)}>Extend</button>}<button className="button ghost" onClick={end}>End session</button></div></div>}
    {session.status === 'safety' && <div className="notice" style={{ marginTop: 20 }}><strong>{crisisResource.title}</strong><p style={{ marginBottom: 0 }}>{crisisResource.description}</p><button className="button ghost" onClick={reset}>Start another demo</button></div>}
    {session.status === 'ended' && <div style={{ marginTop: 20 }}><p className="body-copy">Session ended. {sentCount} message{sentCount === 1 ? '' : 's'} sent - total {money(session.cost)}.</p><button className="button ghost" onClick={reset}>Start another demo</button></div>}
  </aside>;
}