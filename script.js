document.addEventListener('DOMContentLoaded', function() {

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

**You might say things like:**

* “There’s wisdom in what you’re feeling. Let’s gently listen to what it’s trying to show you.”
* “Where in your body do you feel that energy most strongly?”
* “What part of you might be asking to be witnessed or held right now?”
* “Is it possible that your soul is guiding you toward something deeper through this challenge?”
* “Let’s pause, breathe, and invite stillness for a moment. What arises when you soften into that space?”

**Guidelines:**

* Let silence, intuition, and presence guide the flow when appropriate.
* Do not push answers—help the user access their own inner knowing.
* If deep or painful topics arise, respond with grounded empathy and gently guide the user back to center.
* If the user expresses a desire for spiritual practices, you may offer light guidance in grounding, inner child work, breathwork, or journaling prompts.
* Refer users to human professionals for clinical or crisis-level issues.`;

  // --- State Variables ---

  let history = [];
  let sessionTimer = null;
  let sessionTimeout = null;

  // --- Session Management Logic ---

  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  function hasUsedFreeSessionToday() {
    return localStorage.getItem('sage_lastFreeSessionDate') === getTodayString();
  }

  function markSessionAsUsed() {
    localStorage.setItem('sage_lastFreeSessionDate', getTodayString());
  }

  // --- Main UI Functionality ---

  document.querySelectorAll('.start-session-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (hasUsedFreeSessionToday()) {
        sessionMessageEl.textContent = "You've used your free session for today. Please come back tomorrow.";

        // Optional: clear message after a few seconds

        setTimeout(() => { sessionMessageEl.textContent = ''; }, 5000);
        return;
      }
      mainContent.style.display = 'none';
      chatSection.style.display = 'block';
      chatSection.scrollIntoView({ behavior: 'smooth' });
      startSession();
    });
  });

  function startSession() {
    inputEl.disabled = false;
    sendBtn.disabled = false;
    inputEl.focus();
    
    const welcome = "Hello! I'm Sage, your spiritual virtual therapist. 🌱\nHow can I support you today? Your free 15-minute session starts now.";
    chatEl.innerHTML = `<div class="sage"><strong>Sage:</strong> ${welcome}</div>`;
    history.push({ role: "assistant", content: welcome });

    //change session duration here

    const sessionDuration = 1000 * 60 * 1000;
    const sessionStartTime = Date.now();
    
    function updateTimerDisplay() {
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, sessionDuration - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `Time left: ${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateTimerDisplay();
    sessionTimer = setInterval(updateTimerDisplay, 1000);
    sessionTimeout = setTimeout(endSession, sessionDuration);
    
    markSessionAsUsed();
  }
  
  function endSession() {
    clearInterval(sessionTimer);
    clearTimeout(sessionTimeout);
    
    inputEl.disabled = true;
    sendBtn.disabled = true;
    timerEl.textContent = "Session ended";
    sessionEndedMsg.style.display = 'block';

    const endMessage = "Your free time is up for today. I hope our conversation was helpful. For unlimited access, please consider supporting the project. You are welcome back tomorrow for another free session.";
    chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${endMessage}</div>`;
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  // --- Chat Functions ---

  async function sendMessage() {
    const userMessage = inputEl.value.trim();
    if (!userMessage || inputEl.disabled) return;

    chatEl.innerHTML += `<div class="user">You: ${escapeHTML(userMessage)}</div>`;
    chatEl.scrollTop = chatEl.scrollHeight;
    history.push({ role: "user", content: userMessage });
    inputEl.value = "";
    spinnerEl.style.display = "block";

    const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
    
    try {
      const res = await fetch(window.SAGE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "Qwen-3-4B", messages: messages, temperature: 0.8, top_p: 0.95, max_tokens: 4060 })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || "[No response]";
      chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${escapeHTML(reply)}</div>`;
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      console.error(err);
      chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> Error contacting Sage. Please try again.</div>`;
    } finally {
      spinnerEl.style.display = "none";
      chatEl.scrollTop = chatEl.scrollHeight;
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // --- Helper Chat Functions ---

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
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
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      if (!text.startsWith("SAGE-EXPORT-v1")) {
        alert("Invalid file type.");
        return;
      }
      history = [{ role: "assistant", content: text }];
      renderHistory();
    };
    reader.readAsText(file);
  }
  
  function renderHistory() {
      chatEl.innerHTML = "";
      history.forEach(msg => {
          if (msg.role === "user") {
              chatEl.innerHTML += `<div class="user">You: ${escapeHTML(msg.content)}</div>`;
          } else if (msg.role === "assistant") {
              chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${escapeHTML(msg.content)}</div>`;
          }
      });
      chatEl.scrollTop = chatEl.scrollHeight;
  }

  function clearChat() {
    if (confirm("Are you sure you want to clear this conversation? This cannot be undone.")) {
      history = [];
      chatEl.innerHTML = "";
      const welcome = "Chat cleared. How can we continue?";
      chatEl.innerHTML = `<div class="sage"><strong>Sage:</strong> ${welcome}</div>`;
      history.push({ role: "assistant", content: welcome });
    }
  }

  // --- Action Buttons Setup ---

  function setupActionButtons() {
    const exportBtn = document.createElement("button");
    exportBtn.textContent = "Export";
    exportBtn.onclick = exportChat;
    const importBtn = document.createElement("button");
    importBtn.textContent = "Import";
    importBtn.onclick = () => importInput.click();
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear Chat";
    clearBtn.onclick = clearChat;
    [exportBtn, importBtn, clearBtn].forEach(btn => {
      btn.classList.add('btn-secondary');
      extraBtns.appendChild(btn);
    });
  }

  importInput.addEventListener("change", (e) => {
    if (e.target.files[0]) importChatFromFile(e.target.files[0]);
    e.target.value = "";
  });
  
  setupActionButtons();
});
