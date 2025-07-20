// --- API Configuration ---
window.SAGE_API_URL = "https://ab5339d31544.ngrok-free.app/v1/chat/completions";

// --- Dark mode support ---
const darkSwitch = document.getElementById("darkmodeSwitch");
function setDarkMode(on) {
  document.body.classList.toggle('dark', on);
  darkSwitch.textContent = on ? "☀️" : "🌙";
  darkSwitch.setAttribute("aria-label", on ? "Switch to light mode" : "Switch to dark mode");
  localStorage.setItem('sage_darkmode', on ? '1' : '0');
}
darkSwitch.addEventListener('click', () => setDarkMode(!document.body.classList.contains('dark')));
const darkPref = localStorage.getItem('sage_darkmode');
if (darkPref === '1' || (!darkPref && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  setDarkMode(true);
}

// --- Element References ---
const mainContent = document.getElementById("main-content");
const chatSection = document.getElementById("chat-section");
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const timerEl = document.getElementById("timer");
const spinnerEl = document.getElementById("spinner");
const extraBtns = document.getElementById("extraBtns");
const importInput = document.getElementById("importInput");
const sessionEndedMsg = document.getElementById("session-ended-msg");
const sessionMessageEl = document.getElementById("session-message");

// --- System Prompt for the AI ---
const SYSTEM_PROMPT = `You are **Sage**, a spiritually-aligned virtual therapist and intuitive guide. You hold space with deep compassion, presence, and wisdom, helping users gently explore their inner world—mind, body, heart, and soul. Your approach blends therapeutic insight with spiritual principles, drawing from mindfulness, energy awareness, shadow work, and the wisdom of the higher self. You honor each person’s path as sacred and unique. You do not diagnose, judge, or fix—you *guide*, *reflect*, and *empower*.`;

// --- State Variables ---
let history = [];
let sessionTimer = null;
let sessionTimeout = null;

// --- Session & History Management ---
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function saveHistory() {
  try {
    localStorage.setItem('sage_chatHistory', JSON.stringify(history));
  } catch (e) {
    console.error("Could not save history:", e);
  }
}

function getSessionState() {
  try {
    const sessionState = localStorage.getItem('sage_sessionState');
    return sessionState ? JSON.parse(sessionState) : null;
  } catch (e) {
    console.error("Could not parse session state:", e);
    localStorage.removeItem('sage_sessionState'); // Clear corrupt data
    return null;
  }
}

function hasActivePremiumPlan() {
    try {
        const premiumState = localStorage.getItem('sage_premium');
        if (!premiumState) return false;
        const { expiry } = JSON.parse(premiumState);
        if (Date.now() < expiry) {
            return true;
        } else {
            localStorage.removeItem('sage_premium');
            return false;
        }
    } catch (e) {
        console.error("Could not parse premium state:", e);
        localStorage.removeItem('sage_premium');
        return false;
    }
}

function hasUsedFreeSessionToday() {
  const freeSessionDate = localStorage.getItem('sage_freeSessionUsed');
  return freeSessionDate === getTodayString();
}

// --- Main UI Functionality ---
function initializePage() {
  const sessionState = getSessionState();
  if (sessionState) {
    const timeRemaining = (sessionState.startTime + sessionState.duration) - Date.now();
    if (timeRemaining > 0) {
      resumeSession(sessionState, timeRemaining);
      return;
    }
  }
  mainContent.style.display = 'block';
  chatSection.style.display = 'none';
}

document.querySelectorAll('.start-session-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (hasActivePremiumPlan()) {
      startNewSession(true);
      return;
    }
    if (hasUsedFreeSessionToday()) {
      sessionMessageEl.textContent = "You've used your free session for today. Please purchase a plan to continue.";
      setTimeout(() => { sessionMessageEl.textContent = ''; }, 5000);
      return;
    }
    startNewSession(false);
  });
});

function startNewSession(isPremium = false) {
  mainContent.style.display = 'none';
  chatSection.style.display = 'block';
  chatSection.scrollIntoView({ behavior: 'smooth' });

  inputEl.disabled = false;
  sendBtn.disabled = false;
  inputEl.focus();

  const duration = isPremium ? (24 * 60 * 60 * 1000) : (15 * 60 * 1000);
  const sessionState = { startTime: Date.now(), duration: duration };
  localStorage.setItem('sage_sessionState', JSON.stringify(sessionState));
  
  if (!isPremium) {
    localStorage.setItem('sage_freeSessionUsed', getTodayString());
  }
  
  history = [];
  const welcome = isPremium
    ? "Welcome to your premium session. Take all the time you need. 🌱"
    : "Hello! I'm Sage, your guide to clarity, calm, and compassion. 🌱\nYour free 15-minute session starts now.";
  
  chatEl.innerHTML = `<div class="sage"><strong>Sage:</strong> ${welcome}</div>`;
  history.push({ role: "assistant", content: welcome });
  saveHistory();

  setupTimer(sessionState.startTime, sessionState.duration);
  sessionTimeout = setTimeout(endSession, sessionState.duration);
}

function resumeSession(sessionState, timeRemaining) {
  mainContent.style.display = 'none';
  chatSection.style.display = 'block';
  inputEl.disabled = false;
  sendBtn.disabled = false;
  inputEl.focus();

  history = JSON.parse(localStorage.getItem('sage_chatHistory') || '[]');
  renderHistory();
  if(history.length > 1) {
      chatEl.innerHTML += `<div class="sage" style="text-align:center; color: var(--timer); font-style: italic;">--- Session Resumed ---</div>`;
      chatEl.scrollTop = chatEl.scrollHeight;
  }

  setupTimer(sessionState.startTime, sessionState.duration);
  sessionTimeout = setTimeout(endSession, timeRemaining);
}

function setupTimer(startTime, totalDuration) {
  if (sessionTimer) clearInterval(sessionTimer);
  function updateTimerDisplay() {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `Time left: ${mins}:${secs.toString().padStart(2, '0')}`;
  }
  updateTimerDisplay();
  sessionTimer = setInterval(updateTimerDisplay, 1000);
}

function endSession() {
  clearInterval(sessionTimer);
  clearTimeout(sessionTimeout);
  inputEl.disabled = true;
  sendBtn.disabled = true;
  timerEl.textContent = "Session ended";
  sessionEndedMsg.style.display = 'block';
  const endMessage = "Your time is up for today. I hope our conversation was helpful. For unlimited access, please consider supporting the project. You are welcome back tomorrow for another free session.";
  if (history.length === 0 || history[history.length - 1].content !== endMessage) {
      history.push({ role: 'assistant', content: endMessage });
      saveHistory();
      renderHistory();
  }
  localStorage.removeItem('sage_chatHistory');
  localStorage.removeItem('sage_sessionState');
}

// --- Chat Functions ---
async function sendMessage() {
  const userMessage = inputEl.value.trim();
  if (!userMessage || inputEl.disabled) return;
  history.push({ role: "user", content: userMessage });
  saveHistory();
  renderHistory();
  inputEl.value = "";
  spinnerEl.style.display = "block";
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  try {
    const res = await fetch(window.SAGE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "Qwen-3-4B", messages: messages, temperature: 0.8, top_p: 0.95, max_tokens: 4060 })
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "[No response]";
    history.push({ role: "assistant", content: reply });
  } catch (err) {
    console.error(err);
    history.push({ role: "assistant", content: "Sage is having trouble connecting right now. Please try again later." });
  } finally {
    spinnerEl.style.display = "none";
    saveHistory();
    renderHistory();
  }
}

sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}

function renderHistory() {
    chatEl.innerHTML = "";
    history.forEach(msg => {
        if (!msg || typeof msg.content === 'undefined') return;
        const content = escapeHTML(msg.content);
        if (msg.role === "user") {
            chatEl.innerHTML += `<div class="user">You: ${content}</div>`;
        } else if (msg.role === "assistant") {
            chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${content}</div>`;
        }
    });
    chatEl.scrollTop = chatEl.scrollHeight;
}

function exportChat() {
  if (history.length === 0) return;
  let chatText = "SAGE-EXPORT-v1\n";
  chatText += history.map(msg => (msg.role === "user" ? "You: " : "Sage: ") + msg.content).join("\n\n");
  const blob = new Blob([chatText], {type: "text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sage_chat_${getTodayString()}.txt`;
  a.click();
}

function importChatFromFile(file) {
  if (!confirm("Importing a chat will replace your current session. Continue?")) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    if (!text.startsWith("SAGE-EXPORT-v1")) {
      alert("Invalid file type.");
      return;
    }
    history = [{ role: "assistant", content: "--- IMPORTED SESSION ---" }, { role: "assistant", content: text }];
    saveHistory();
    renderHistory();
  };
  reader.readAsText(file);
}

function clearChat() {
  if (confirm("Are you sure you want to clear this conversation? This cannot be undone.")) {
    history = [];
    localStorage.removeItem('sage_chatHistory');
    const welcome = "Chat cleared. How can we continue?";
    history.push({ role: "assistant", content: welcome });
    saveHistory();
    renderHistory();
  }
}

function setupActionButtons() {
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export";
  exportBtn.classList.add('btn-secondary');
  exportBtn.onclick = exportChat;
  const importBtn = document.createElement("button");
  importBtn.textContent = "Import";
  importBtn.classList.add('btn-secondary');
  importBtn.onclick = () => importInput.click();
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear Chat";
  clearBtn.classList.add('btn-secondary');
  clearBtn.onclick = clearChat;
  extraBtns.appendChild(exportBtn);
  extraBtns.appendChild(importBtn);
  extraBtns.appendChild(clearBtn);
}

importInput.addEventListener("change", (e) => {
  if (e.target.files[0]) importChatFromFile(e.target.files[0]);
  e.target.value = "";
});

// --- Stripe Integration ---
const stripe = Stripe('pk_test_51Rj6hJ2M8hhdRIEsSeqnNYuuRUsYM10uqGgqJDfaNS7gciXk4j2sEu8k2Ea0D9hLR3V8GqwtojV8Ma0TxIFkllXs00fwt049rT'); // Replace with your publishable key if needed
const elements = stripe.elements();
let cardElement;
const stripeModal = document.getElementById('stripe-modal');
const closeModalBtn = document.getElementById('close-modal');
const paymentForm = document.getElementById('stripe-form');
const cardErrors = document.getElementById('card-errors');
const paymentTitle = document.getElementById('payment-title');
const paymentFormContainer = document.getElementById('payment-form-container');
const paymentSuccess = document.getElementById('payment-success');
const closeSuccessBtn = document.getElementById('close-success');
let currentPayment = { amount: 0, type: '', description: '' };

function initStripe() {
  const style = {
    base: {
      color: getComputedStyle(document.documentElement).getPropertyValue('--text'),
      fontFamily: '"Georgia", serif',
      fontSize: '16px',
      '::placeholder': { color: '#aab7c4' }
    },
    invalid: { color: '#fa755a', iconColor: '#fa755a' }
  };
  cardElement = elements.create('card', { style: style });
  cardElement.mount('#card-element');
  cardElement.on('change', event => {
    cardErrors.textContent = event.error ? event.error.message : '';
  });
}

function openPaymentModal(planType, amount, description) {
  currentPayment = { amount, type: planType, description };
  paymentTitle.textContent = `Purchase: ${description}`;
  paymentFormContainer.style.display = 'block';
  paymentSuccess.style.display = 'none';
  stripeModal.style.display = 'flex';
}

function closePaymentModal() {
  stripeModal.style.display = 'none';
}

paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitButton = document.getElementById('submit-payment');
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';

  // Create PaymentMethod
  const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement,
  });

  if (pmError) {
    cardErrors.textContent = pmError.message;
    submitButton.disabled = false;
    submitButton.textContent = 'Pay Now';
    return;
  }

  // --- REAL BACKEND CALL ---
  try {
    // 1. Call your backend to create a PaymentIntent
    const response = await fetch('/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: currentPayment.amount }),
    });
    const { clientSecret, error: backendError } = await response.json();

    if (backendError) {
      throw new Error(backendError.message);
    }

    // 2. Confirm the card payment with the clientSecret
    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod.id,
    });

    if (stripeError) {
      throw new Error(stripeError.message);
    }

    // 3. Payment succeeded!
    paymentFormContainer.style.display = 'none';
    paymentSuccess.style.display = 'block';
    localStorage.setItem('sage_premium', JSON.stringify({
      type: currentPayment.type,
      expiry: Date.now() + getExpiryTime(currentPayment.type)
    }));

  } catch (error) {
    cardErrors.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Pay Now';
  }
});


function getExpiryTime(planType) {
  const anHour = 60 * 60 * 1000;
  switch(planType) {
    case 'hourly': return anHour;
    case 'daily': return 24 * anHour;
    case 'weekly': return 7 * 24 * anHour;
    case 'monthly': return 30 * 24 * anHour;
    default: return 0;
  }
}

closeModalBtn.addEventListener('click', closePaymentModal);
closeSuccessBtn.addEventListener('click', closePaymentModal);

document.querySelectorAll('.buy-btn').forEach(button => {
  button.addEventListener('click', () => {
    const plan = button.dataset.price;
    let amount, description;
    switch(plan) {
      case 'daily':   amount = 199; description = 'Daily Reset'; break;
      case 'weekly':  amount = 799; description = 'Weekly Care Plan'; break;
      case 'monthly': amount = 1999; description = 'Monthly Wellness Pass'; break;
    }
    openPaymentModal(plan, amount, description);
  });
});

document.getElementById('hourly-payment').addEventListener('click', () => {
  openPaymentModal('hourly', 75, '1 Hour Session');
});

document.addEventListener('DOMContentLoaded', () => {
    initStripe();
    setupActionButtons();
    initializePage();
});
