(function () {
  const SMS_RATE = 1;
  const REPLIES = [
    "Got it. Tell me more?",
    "I hear you — that sounds like a lot.",
    "Take your time, I'm listening.",
    "That makes sense. What's on your mind next?",
  ];

  const idlePane = document.getElementById('demo-idle');
  const connectedPane = document.getElementById('demo-connected');
  const endedPane = document.getElementById('demo-ended');
  const minutesEl = document.getElementById('demo-minutes');
  const costEl = document.getElementById('demo-cost');
  const messagesEl = document.getElementById('demo-messages');
  const draftEl = document.getElementById('demo-draft');
  const sendBtn = document.getElementById('demo-send');
  const holdBtn = document.getElementById('demo-hold');
  const endBtn = document.getElementById('demo-end');
  const restartBtn = document.getElementById('demo-restart');
  const endedSummaryEl = document.getElementById('demo-ended-summary');
  const connectBtn = document.getElementById('demo-connect');

  let state = { connected: false, held: false, minutesLeft: 60, cost: 0, messages: [] };
  let timer = null;

  function renderMessage(m) {
    const div = document.createElement('div');
    div.textContent = m.text;
    if (m.from === 'friend') {
      div.style.cssText = 'align-self:flex-start;max-width:82%;background:#ffffff;border:1px solid rgba(32,30,29,.25);padding:8px 12px;font-size:13.5px;line-height:1.45';
    } else {
      div.style.cssText = 'align-self:flex-end;max-width:82%;margin-left:auto;background:var(--accent-soft);color:var(--accent-soft-text);border:1px solid #ffc4b8;padding:8px 12px;font-size:13.5px;line-height:1.45';
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function render() {
    idlePane.style.display = !state.connected && !state.ended ? 'flex' : 'none';
    connectedPane.style.display = state.connected ? 'flex' : 'none';
    endedPane.style.display = state.ended ? 'flex' : 'none';

    minutesEl.textContent = `${state.minutesLeft} min left`;
    costEl.textContent = `Cost so far: $${state.cost.toFixed(2)}`;
    draftEl.value = state.draft || '';
    const disabled = state.held;
    draftEl.disabled = disabled;
    sendBtn.disabled = disabled;
    sendBtn.textContent = `Send — $${SMS_RATE}`;
    holdBtn.textContent = state.held ? 'Resume' : 'Hold';

    if (state.ended) {
      const sentCount = state.messages.filter((m) => m.from === 'you').length;
      endedSummaryEl.textContent = `Session ended. ${sentCount} message(s) sent — total $${state.cost.toFixed(2)}.`;
    }
  }

  function connect() {
    if (timer) clearInterval(timer);
    messagesEl.innerHTML = '';
    state = {
      connected: true, held: false, ended: false, minutesLeft: 60, cost: 0, messages: [],
    };
    const greeting = { from: 'friend', text: "Hi, I'm here — no judgment, just listening. What's on your mind?" };
    state.messages.push(greeting);
    renderMessage(greeting);
    render();
    timer = setInterval(() => {
      if (!state.connected || state.held) return;
      state.minutesLeft = Math.max(0, state.minutesLeft - 1);
      if (state.minutesLeft === 0) {
        clearInterval(timer);
        state.connected = false;
        state.ended = true;
      }
      render();
    }, 1000);
  }

  function sendMessage() {
    const text = draftEl.value.trim();
    if (!text || !state.connected || state.held) return;
    state.messages.push({ from: 'you', text });
    renderMessage({ from: 'you', text });
    state.cost = Math.round((state.cost + SMS_RATE) * 100) / 100;
    draftEl.value = '';
    render();
    const reply = REPLIES[(state.messages.length - 1) % REPLIES.length];
    setTimeout(() => {
      if (!state.connected) return;
      state.messages.push({ from: 'friend', text: reply });
      renderMessage({ from: 'friend', text: reply });
    }, 900);
  }

  connectBtn.addEventListener('click', connect);
  sendBtn.addEventListener('click', sendMessage);
  draftEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  });
  holdBtn.addEventListener('click', () => { state.held = !state.held; render(); });
  endBtn.addEventListener('click', () => {
    if (timer) clearInterval(timer);
    state.connected = false;
    state.held = false;
    state.ended = true;
    render();
  });
  restartBtn.addEventListener('click', () => {
    if (timer) clearInterval(timer);
    messagesEl.innerHTML = '';
    state = { connected: false, held: false, ended: false, minutesLeft: 60, cost: 0, messages: [] };
    render();
  });

  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('contact-confirm').style.display = 'block';
  });

  render();
})();
