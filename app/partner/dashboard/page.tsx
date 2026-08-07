'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartnerAvailability, money } from '../../../lib/demo-data';

const queue = [{ name: 'Avery', topic: 'Hard week at work', wait: '2 min' }, { name: 'Jordan', topic: 'Thinking out loud', wait: '8 min' }, { name: 'Riley', topic: 'Goal-setting session', wait: '12 min' }];

export default function Dashboard() {
  const [availability, setAvailability] = useState<PartnerAvailability>('available');
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();
  useEffect(() => { if (sessionStorage.getItem('cadence-demo-partner') === 'signed-in') setAllowed(true); else router.replace('/partner/sign-in'); }, [router]);
  const signOut = () => { sessionStorage.removeItem('cadence-demo-partner'); router.push('/partner/sign-in'); };
  if (!allowed) return <main className="portal-main"><p>Loading demo portal…</p></main>;
  return <div className="portal"><nav className="nav"><Link className="brand" href="/">Cadence</Link><span style={{ fontSize: 14 }}>Partner portal</span><button className="button secondary" style={{ marginLeft: 'auto' }} onClick={signOut}>Sign out</button></nav><main className="shell dashboard"><p className="eyebrow">Good morning, Maya</p><h1 style={{ marginTop: 0 }}>Your listening room</h1><p className="body-copy">All figures and requests are fictional demo data. Nothing on this page is saved.</p><div className="dashboard-grid" style={{ marginTop: 32 }}><section className="panel"><div className="availability"><i className="dot" style={{ background: availability === 'available' ? 'var(--accent)' : 'var(--muted)' }} /><strong>{availability === 'available' ? 'Available for new chats' : 'Away from new chats'}</strong></div><p className="body-copy" style={{ marginTop: 12 }}>Your status changes only for this browser session.</p><button className="button" style={{ marginTop: 16 }} onClick={() => setAvailability((current) => current === 'available' ? 'away' : 'available')}>Set {availability === 'available' ? 'away' : 'available'}</button></section><section className="panel"><p className="eyebrow">This week</p><p className="metric">{money(184)}</p><p className="body-copy">Estimated demo earnings from 14 simulated conversations.</p></section></div><div className="dashboard-grid" style={{ marginTop: 24 }}><section className="panel"><p className="eyebrow">Waiting now</p><ul className="list">{queue.map((person) => <li key={person.name}><div><strong>{person.name}</strong><br /><span className="body-copy" style={{ fontSize: 13 }}>{person.topic}</span></div><span className="tag">{person.wait}</span></li>)}</ul><button className="button secondary" style={{ marginTop: 16 }}>Refresh demo queue</button></section><section className="panel"><p className="eyebrow">Profile</p><h2 style={{ marginTop: 0 }}>Maya R.</h2><p className="body-copy">Friend · English, Spanish</p><hr className="rule" style={{ margin: '18px 0' }} /><p className="body-copy"><strong>Guideline reminder</strong><br />Cadence is not therapy. In a real product, partner workflows would follow approved safety and escalation policies.</p></section></div></main><footer className="shell footer">Cadence partner portal · fictional prototype</footer></div>;
}
