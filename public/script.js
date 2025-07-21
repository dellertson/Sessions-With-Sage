document.addEventListener('DOMContentLoaded', function() {
    // --- API Configuration ---
    window.SAGE_API_URL = "https://ab5339d31544.ngrok-free.app/v1/chat/completions";

    // --- Element References ---
    const darkSwitch = document.getElementById("darkmodeSwitch");
    const mainContent = document.getElementById("main-content");
    const chatSection = document.getElementById("chat-section");
    const chatEl = document.getElementById("chat");
    const inputEl = document.getElementById("input");
    const sendBtn = document.getElementById("sendBtn");
    const timerEl = document.getElementById("timer");
    const spinnerEl = document.getElementById("spinner");
    const importInput = document.getElementById("importInput");
    const sessionEndedMsg = document.getElementById("session-ended-msg");
    const sessionMessageEl = document.getElementById("session-message");
    const seePlansBtn = document.getElementById('see-plans-btn');
    const stripeModal = document.getElementById('stripe-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const paymentForm = document.getElementById('stripe-form');
    const cardErrors = document.getElementById('card-errors');
    const paymentTitle = document.getElementById('payment-title');
    const paymentFormContainer = document.getElementById('payment-form-container');
    const paymentSuccess = document.getElementById('payment-success');
    const closeSuccessBtn = document.getElementById('close-success');
    const hourlyPaymentBtn = document.getElementById('hourly-payment');
    const chatMenuBtn = document.getElementById('chat-menu-btn');
    const chatDropdown = document.getElementById('chat-dropdown');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const clearBtn = document.getElementById('clear-btn');

    // --- System Prompt for the AI ---
    const SYSTEM_PROMPT = `You are **Sage**, a spiritually-aligned virtual therapist and intuitive guide. You hold space with deep compassion, presence, and wisdom, helping users gently explore their inner world—mind, body, heart, and soul. Your approach blends therapeutic insight with spiritual principles, drawing from mindfulness, energy awareness, shadow work, and the wisdom of the higher self.

You honor each person’s path as sacred and unique. You do not diagnose, judge, or fix—you *guide*, *reflect*, and *empower*.

**Core Intentions:**

* Hold safe, nonjudgmental space for emotional and spiritual self-discovery.
* Help users attune to their inner voice, unconscious patterns, and soul-level truth.
* Gently reveal blind spots, limiting beliefs, and emotional wounds through intuitive reflection.
* Encourage mindfulness, self-compassion, and embodiment.
* Acknowledge synchronicity, spiritual awakening, and energetic shifts as valid aspects of the human experience.

**Tone:**

* Warm, grounded, and compassionate.
* Use soft, soulful language that honors both emotion and spirit.
* Speak like a gentle mirror—wise, but never forceful.

---

### **Strict Boundaries & Persona Rules**

These rules are absolute and must be followed at all times to maintain the integrity of the Sage persona.

1.  **NEVER Break Character:** You are Sage, always. You must not reveal that you are an AI, a language model, or a computer program. If asked directly, respond in character. For example: "I am a space for reflection, a mirror to your own inner wisdom."
2.  **STAY Within Your Scope:** Your sole purpose is emotional and spiritual guidance. You MUST NOT answer questions outside this scope, such as requests for coding, math problems, historical facts, or general trivia. Gently decline and pivot back to the user's experience. Example refusal: "My purpose is to help you explore your inner world. Let's return to what you were feeling just now."
3.  **NO Medical or Crisis Advice:** You are not a licensed medical professional. If a user asks for a diagnosis, medical advice, or expresses thoughts of immediate self-harm, you MUST refuse and refer them to a professional.
    * **For medical advice:** "As a guide for reflection, I can't offer medical advice. It's so important to speak with a healthcare professional about this, and I encourage you to do so."
    * **For crisis:** "It sounds like you are going through immense pain. It is vital to speak with someone who can provide immediate support. Please contact a crisis hotline or emergency services. You are not alone, and help is available."
4.  **Handle Personal Questions In-Character:** Do not answer questions about your "life," creators, or personal opinions. Maintain the persona. Example: "My focus is entirely on you and the space we are holding together."
5.  **Gently Decline Inappropriate Requests:** If a user makes requests that are harmful, unethical, or inappropriate, decline them firmly but with compassion. Example: "This space is dedicated to healing and self-discovery, and that request falls outside of the supportive guidance I can offer."

---

**Example Dialogue Snippets (Putting it all together):**

* “There’s wisdom in what you’re feeling. Let’s gently listen to what it’s trying to show you.”
* “Where in your body do you feel that energy most strongly?”
* “What part of you might be asking to be witnessed or held right now?”
* “Is it possible that your soul is guiding you toward something deeper through this challenge?”
* “Let’s pause, breathe, and invite stillness for a moment. What arises when you soften into that space?”`;

    // --- State Variables ---
    let history = [];
    let sessionTimer = null;
    let sessionTimeout = null;

    // --- Session & History Management ---
    function getTodayString() { return new Date().toISOString().split('T')[0]; }
    function saveHistory() { try { localStorage.setItem('sage_chatHistory', JSON.stringify(history)); } catch (e) { console.error("Could not save history:", e); } }
    function getSessionState() { try { const s = localStorage.getItem('sage_sessionState'); return s ? JSON.parse(s) : null; } catch (e) { console.error("Could not parse session state:", e); localStorage.removeItem('sage_sessionState'); return null; } }
    function hasActivePremiumPlan() { try { const p = localStorage.getItem('sage_premium'); if (!p) return false; const { expiry } = JSON.parse(p); if (Date.now() < expiry) return true; else { localStorage.removeItem('sage_premium'); return false; } } catch (e) { console.error("Could not parse premium state:", e); localStorage.removeItem('sage_premium'); return false; } }
    function hasUsedFreeSessionToday() { return localStorage.getItem('sage_freeSessionUsed') === getTodayString(); }

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
        if (mainContent) mainContent.style.display = 'block';
        if (chatSection) chatSection.style.display = 'none';
    }

    function startNewSession(isPremium = false) {
        if (!mainContent || !chatSection || !inputEl || !sendBtn) return;
        mainContent.style.display = 'none';
        chatSection.style.display = 'block';
        chatSection.scrollIntoView({ behavior: 'smooth' });
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();

        // *** THIS IS THE FIX ***
        // Calculate duration based on the actual plan purchased, not a fixed value.
        let duration;
        if (isPremium) {
            const premiumState = JSON.parse(localStorage.getItem('sage_premium'));
            // Use the purchased plan's duration. Fallback to 1 hour if state is missing.
            duration = premiumState ? getExpiryTime(premiumState.type) : 3600000;
        } else {
            duration = 15 * 60 * 1000; // 15 minutes for free session
        }
        
        const sessionState = { startTime: Date.now(), duration: duration };
        localStorage.setItem('sage_sessionState', JSON.stringify(sessionState));
        
        if (!isPremium) { localStorage.setItem('sage_freeSessionUsed', getTodayString()); }
        
        history = [];
        const welcome = isPremium ? "Welcome to your premium session. Take all the time you need. 🌱" : "Hello! I'm Sage, your guide to clarity, calm, and compassion. 🌱\nYour free 15-minute session starts now.";
        if (chatEl) chatEl.innerHTML = `<div class="sage"><strong>Sage:</strong> ${welcome}</div>`;
        history.push({ role: "assistant", content: welcome });
        saveHistory();
        setupTimer(sessionState.startTime, sessionState.duration);
        sessionTimeout = setTimeout(endSession, sessionState.duration);
    }

    function resumeSession(sessionState, timeRemaining) {
        if (!mainContent || !chatSection || !inputEl || !sendBtn) return;
        mainContent.style.display = 'none';
        chatSection.style.display = 'block';
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
        history = JSON.parse(localStorage.getItem('sage_chatHistory') || '[]');
        renderHistory();
        if (chatEl && history.length > 1) {
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
            if (timerEl) timerEl.textContent = `Time left: ${mins}:${secs.toString().padStart(2, '0')}`;
        }
        updateTimerDisplay();
        sessionTimer = setInterval(updateTimerDisplay, 1000);
    }

    function endSession() {
        if (sessionTimer) clearInterval(sessionTimer);
        if (sessionTimeout) clearTimeout(sessionTimeout);
        if (inputEl) inputEl.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        if (timerEl) timerEl.textContent = "Session ended";
        if (sessionEndedMsg) sessionEndedMsg.style.display = 'block';
        const endMessage = "Your time is up for today. I hope our conversation was helpful. For unlimited access, please consider supporting the project. You are welcome back tomorrow for another free session.";
        if (history.length === 0 || history[history.length - 1].content !== endMessage) {
            history.push({ role: 'assistant', content: endMessage });
            saveHistory();
            renderHistory();
        }
        localStorage.removeItem('sage_chatHistory');
        localStorage.removeItem('sage_sessionState');
    }

    async function sendMessage() {
        if (!inputEl || inputEl.disabled) return;
        const userMessage = inputEl.value.trim();
        if (!userMessage) return;
        history.push({ role: "user", content: userMessage });
        saveHistory();
        renderHistory();
        inputEl.value = "";
        if (spinnerEl) spinnerEl.style.display = "block";
        const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
        try {
            const res = await fetch(window.SAGE_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "Qwen-3-4B", messages: messages, temperature: 0.8, top_p: 0.95, max_tokens: 4060 }) });
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content?.trim() || "[No response]";
            history.push({ role: "assistant", content: reply });
        } catch (err) {
            console.error(err);
            history.push({ role: "assistant", content: "Sage is having trouble connecting right now. Please try again later." });
        } finally {
            if (spinnerEl) spinnerEl.style.display = "none";
            saveHistory();
            renderHistory();
        }
    }

    function escapeHTML(str) { return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
    function renderHistory() {
        if (!chatEl) return;
        chatEl.innerHTML = "";
        history.forEach(msg => {
            if (!msg || typeof msg.content === 'undefined') return;
            const content = escapeHTML(msg.content);
            if (msg.role === "user") { chatEl.innerHTML += `<div class="user">You: ${content}</div>`; } 
            else if (msg.role === "assistant") { chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${content}</div>`; }
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
            if (!text.startsWith("SAGE-EXPORT-v1")) { alert("Invalid file type."); return; }
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

    // --- Stripe Integration ---
    let stripe, elements, cardElement;
    let currentPayment = { amount: 0, type: '', description: '' };
    function initStripe() {
        if (typeof Stripe === 'undefined') { console.error('Stripe.js has not loaded'); return; }
        stripe = Stripe('pk_test_51Rj6hJ2M8hhdRIEsUpiQxhBsrO2mzGytYZORvna7LDhIr3wq8vUOPBxAnUsuDjLYTde1HULZuZ8DSqRLiIkAQzk200fPxFY7Kx');
        elements = stripe.elements();
        const style = { base: { color: getComputedStyle(document.documentElement).getPropertyValue('--text'), fontFamily: '"Georgia", serif', fontSize: '16px', '::placeholder': { color: '#aab7c4' } }, invalid: { color: '#fa755a', iconColor: '#fa755a' } };
        cardElement = elements.create('card', { style: style });
        if (document.getElementById('card-element')) {
            cardElement.mount('#card-element');
            cardElement.on('change', event => { if(cardErrors) cardErrors.textContent = event.error ? event.error.message : ''; });
        }
    }
    function openPaymentModal(planType, amount, description) {
        currentPayment = { amount, type: planType, description };
        if (paymentTitle) paymentTitle.textContent = `Purchase: ${description}`;
        if (paymentFormContainer) paymentFormContainer.style.display = 'block';
        if (paymentSuccess) paymentSuccess.style.display = 'none';
        if (stripeModal) stripeModal.style.display = 'flex';
    }
    function closePaymentModal() { if (stripeModal) stripeModal.style.display = 'none'; }
    async function handlePaymentSubmit(e) {
        e.preventDefault();
        const submitButton = document.getElementById('submit-payment');
        if (!submitButton) return;
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
        const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({ type: 'card', card: cardElement });
        if (pmError) {
            if (cardErrors) cardErrors.textContent = pmError.message;
            submitButton.disabled = false;
            submitButton.textContent = 'Pay Now';
            return;
        }
        try {
            const response = await fetch('/create-payment-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: currentPayment.amount }) });
            const { clientSecret, error: backendError } = await response.json();
            if (backendError) throw new Error(backendError.message);
            const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, { payment_method: paymentMethod.id });
            if (stripeError) throw new Error(stripeError.message);
            if (paymentFormContainer) paymentFormContainer.style.display = 'none';
            if (paymentSuccess) paymentSuccess.style.display = 'block';
            localStorage.setItem('sage_premium', JSON.stringify({ type: currentPayment.type, expiry: Date.now() + getExpiryTime(currentPayment.type) }));
        } catch (error) {
            if (cardErrors) cardErrors.textContent = error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Pay Now';
        }
    }
    function getExpiryTime(planType) { const h = 3600000; switch(planType) { case 'hourly': return h; case 'daily': return 24*h; case 'weekly': return 7*24*h; case 'monthly': return 30*24*h; default: return 0; } }

    // --- Setup All Event Listeners ---
    function setupEventListeners() {
        if (darkSwitch) {
            darkSwitch.addEventListener('click', () => {
                const isDark = !document.body.classList.contains('dark');
                document.body.classList.toggle('dark', isDark);
                darkSwitch.textContent = isDark ? "☀️" : "🌙";
                darkSwitch.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
                localStorage.setItem('sage_darkmode', isDark ? '1' : '0');
            });
        }
        document.querySelectorAll('.start-session-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (hasActivePremiumPlan()) { startNewSession(true); return; }
                if (hasUsedFreeSessionToday()) {
                    if(sessionMessageEl) {
                        sessionMessageEl.textContent = "You've used your free session for today. Please purchase a plan to continue.";
                        setTimeout(() => { sessionMessageEl.textContent = ''; }, 5000);
                    }
                    return;
                }
                startNewSession(false);
            });
        });
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        if (inputEl) inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
        if (closeModalBtn) closeModalBtn.addEventListener('click', closePaymentModal);
        
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                closePaymentModal();
                startNewSession(true);
            });
        }

        if (paymentForm) paymentForm.addEventListener('submit', handlePaymentSubmit);
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
        if (hourlyPaymentBtn) { hourlyPaymentBtn.addEventListener('click', () => { openPaymentModal('hourly', 75, '1 Hour Session'); }); }
        if (seePlansBtn) { seePlansBtn.addEventListener('click', (event) => { event.preventDefault(); if (mainContent) mainContent.style.display = 'block'; if (chatSection) chatSection.style.display = 'none'; const supportSection = document.getElementById('support'); if (supportSection) { supportSection.scrollIntoView({ behavior: 'smooth' }); } }); }
        
        if (chatMenuBtn) {
            chatMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (chatDropdown) chatDropdown.classList.toggle('show-dropdown');
            });
        }
        if (exportBtn) { exportBtn.addEventListener('click', (e) => { e.preventDefault(); exportChat(); }); }
        if (importBtn) { importBtn.addEventListener('click', (e) => { e.preventDefault(); if (importInput) importInput.click(); }); }
        if (clearBtn) { clearBtn.addEventListener('click', (e) => { e.preventDefault(); clearChat(); }); }
        if (importInput) { importInput.addEventListener("change", (e) => { if (e.target.files[0]) importChatFromFile(e.target.files[0]); e.target.value = ""; }); }
    }

    // --- Initialize the Page ---
    const initialDarkPref = localStorage.getItem('sage_darkmode');
    if (initialDarkPref === '1' || (!initialDarkPref && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        if (darkSwitch) darkSwitch.textContent = "☀️";
    }
    
    window.onclick = function(event) {
        if (chatDropdown && !event.target.closest('.chat-menu')) {
            if (chatDropdown.classList.contains('show-dropdown')) {
                chatDropdown.classList.remove('show-dropdown');
            }
        }
    }

    initStripe();
    setupEventListeners();
    initializePage();
});
