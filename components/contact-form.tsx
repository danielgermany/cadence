'use client';

import { FormEvent, useState } from 'react';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSubmitted(true); };
  if (submitted) return <div className="notice" role="status"><strong>Demo message received.</strong><p style={{ marginBottom: 0 }}>Nothing was sent or stored. In a real service, this is where a support reply would begin.</p></div>;
  return <form className="contact-form" onSubmit={submit}>
    <div className="field"><label htmlFor="name">Name</label><input className="input" id="name" required /></div>
    <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" type="email" required /></div>
    <div className="field"><label htmlFor="reason">Reason</label><select className="input" id="reason"><option>General question</option><option>Billing</option><option>Become a Friend</option><option>Safety concern</option></select></div>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Preferred reply method</legend><div className="row"><label><input type="radio" name="reply" defaultChecked /> Email</label><label><input type="radio" name="reply" /> SMS</label><label><input type="radio" name="reply" /> Phone</label></div></fieldset>
    <div className="field"><label htmlFor="message">Message</label><textarea className="input" id="message" rows={5} required /></div>
    <button className="button" type="submit" style={{ alignSelf: 'start' }}>Send demo message</button>
  </form>;
}
