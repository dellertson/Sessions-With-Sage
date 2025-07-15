document.addEventListener('DOMContentLoaded', function() {
    // Set your public API URL for ngrok here:
    window.SAGE_API_URL = "https://1827f4679046.ngrok-free.app/v1/chat/completions";

    // --- Dark mode support ---
    const darkSwitch = document.getElementById("darkmodeSwitch");

    function setDarkMode(on) {
      if (on) {
        document.body.classList.add('dark');
        darkSwitch.textContent = "☀️";
        darkSwitch.setAttribute("aria-label", "Switch to light mode");
        localStorage.setItem('sage_darkmode', '1');
      } else {
        document.body.classList.remove('dark');
        darkSwitch.textContent = "🌙";
        darkSwitch.setAttribute("aria-label", "Switch to dark mode");
        localStorage.setItem('sage_darkmode', '0');
      }
    }

    function toggleDarkMode() {
      setDarkMode(!document.body.classList.contains('dark'));
    }

    darkSwitch.addEventListener('click', toggleDarkMode);

    (function() {
      const darkPref = localStorage.getItem('sage_darkmode');
      if (darkPref === '1' || (!darkPref && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setDarkMode(true);
      }
    })();

    // --- Legal expandable sections ---
    const legalContents = {
      "terms": `
        <h4>Terms of Service</h4>
        <p>
          By using Sessions-With-Sage, you agree to use this service solely for personal, non-commercial mental health support. You will not hold the nonprofit or any contributors liable for actions, outcomes, or advice provided by this virtual therapist. Use of this service does not create a client-therapist relationship.
        </p>
        <p>
          You agree not to misuse the service or attempt to circumvent session/donation restrictions. The organization reserves the right to restrict access for abuse.
        </p>
        <p>
          For questions, contact us at <a href="mailto:info@sessionswithsage.org">info@sessionswithsage.org</a>.
        </p>
      `,
      "privacy": `
        <h4>Privacy Policy</h4>
        <p>
          We value your privacy. Sessions-With-Sage does not store your chat history on our servers. All conversations are kept only in your browser unless you export them. We do not sell or share your data. The only information we retain is related to logins and donations, as required for security and nonprofit compliance.
        </p>
        <p>
          For more details, email <a href="mailto:privacy@sessionswithsage.org">privacy@sessionswithsage.org</a>.
        </p>
      `,
      "disclaimer": `
        <h4>Full Disclaimer</h4>
        <p>
          Sessions-With-Sage is a virtual assistant provided by a nonprofit. It does <strong>not</strong> offer medical, psychological, or legal advice. No conversation should be considered a substitute for professional therapy or medical treatment. If you are in crisis or in need of urgent care, please contact a licensed professional or emergency services.
        </p>
        <p>
          Information provided is for supportive and informational purposes only.
        </p>
      `,
      "mission": `
        <h4>Our Mission</h4>
        <p>
          We’re a community-driven nonprofit working to make mental health care more accessible for everyone. By offering a free and easy-to-use virtual therapist, we aim to support people who might not otherwise have access to therapy. Our mission is to break down the social, financial, and emotional barriers that keep too many people from getting the care they deserve—because healing should never be out of reach.
        </p>
      `
    };

    document.querySelectorAll('.legal-link-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const key = btn.getAttribute('data-legal');
        document.querySelectorAll('.legal-content').forEach(div => {
          if (div.id === 'legal-' + key) {
            if (div.classList.contains('open')) {
              div.classList.remove('open');
              div.innerHTML = '';
            } else {
              div.classList.add('open');
              div.innerHTML = legalContents[key];
            }
          } else {
            div.classList.remove('open');
            div.innerHTML = '';
          }
        });
      });
    });

    // --- Session lockout and donation logic ---
    const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour in ms
    const DONATION_VALID_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    function now() { return Date.now(); }
    function getLastDonationTime() {
      return parseInt(localStorage.getItem('sage_lastDonation') || "0", 10);
    }
    function setLastDonationTime() {
      localStorage.setItem('sage_lastDonation', now());
    }
    function hasRecentDonation() {
      const t = getLastDonationTime();
      return t && now() - t < DONATION_VALID_MS;
    }
    function getLockoutTime() {
      return parseInt(localStorage.getItem('sage_lockoutUntil') || "0", 10);
    }
    function setLockout() {
      localStorage.setItem('sage_lockoutUntil', now() + LOCKOUT_DURATION);
    }
    function clearLockout() {
      localStorage.removeItem('sage_lockoutUntil');
    }
    function isLockedOut() {
      const until = getLockoutTime();
      if (!until) return false;
      if (now() > until) {
        clearLockout();
        return false;
      }
      return true;
    }
    function lockoutMessage() {
      const until = getLockoutTime();
      if (!until) return "";
      const min = Math.ceil((until - now()) / 60000);
      return `You have reached your free session limit. Please come back in ${min} minute${min!==1?'s':''}, or support our mission with a donation for immediate access.`;
    }

    // Main functionality
    const chatEl = document.getElementById("chat");
    const inputEl = document.getElementById("input");
    const sendBtn = document.getElementById("sendBtn");
    const timerEl = document.getElementById("timer");
    const spinnerEl = document.getElementById("spinner");
    const extraBtns = document.getElementById("extraBtns");
    const importInput = document.getElementById("importInput");
    const lockoutMsgEl = document.getElementById("lockoutMsg");
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
* Refer users to human professionals for clinical or crisis-level issues.`; // Use full prompt if needed

    let history = [];
    let sessionStart = null;
    let sessionEnded = false; // Controls the main chat functionality
    let timerInterval = null;
    let sessionTimeout = null; // To store the setTimeout ID for clearing

    window.onload = () => inputEl.focus();

    inputEl.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Export chat (with signature)
    function exportChat() {
      let chatText = "SAGE-EXPORT-v1\n";
      chatText += history.map(msg =>
        (msg.role === "user" ? "You: " : "Sage: ") + msg.content
      ).join("\n\n");
      const blob = new Blob([chatText], {type: "text/plain"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "sage_chat.txt";
      a.click();
    }

    // Import chat (must have signature)
    function importChatFromFile(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        if (!lines[0] || lines[0].trim() !== "SAGE-EXPORT-v1") {
          alert("Invalid file: Only conversations exported from Sessions-With-Sage can be imported.");
          return;
        }
        let newHistory = [];
        let buffer = "";
        let currentRole = null;
        for (let idx = 1; idx < lines.length; idx++) {
          const line = lines[idx];
          if (line.startsWith("You: ")) {
            if (buffer && currentRole) {
              newHistory.push({ role: currentRole, content: buffer.trim() });
              buffer = "";
            }
            currentRole = "user";
            buffer = line.slice(5);
          } else if (line.startsWith("Sage: ")) {
            if (buffer && currentRole) {
              newHistory.push({ role: currentRole, content: buffer.trim() });
              buffer = "";
            }
            currentRole = "assistant";
            buffer = line.slice(6);
          } else if (line.trim() === "" && buffer && currentRole) {
            newHistory.push({ role: currentRole, content: buffer.trim() });
            buffer = "";
            currentRole = null;
          } else {
            buffer += (buffer ? "\n" : "") + line;
          }
        }
        if (buffer && currentRole) {
          newHistory.push({ role: currentRole, content: buffer.trim() });
        }
        history = newHistory;
        renderHistory();
      };
      reader.readAsText(file);
    }

    function clearChat() {
      history = [];
      chatEl.innerHTML = "";
      // Reset all session state
      sessionStart = null;
      localStorage.removeItem('sage_sessionStart'); // Clear persisted session start
      sessionEnded = false; // Crucial: allow sending messages again
      clearInterval(timerInterval); // Stop any running timer
      clearTimeout(sessionTimeout); // Clear any pending session end
      clearLockout(); // Clear any lockout status
      timerEl.textContent = "";
      inputEl.disabled = false;
      sendBtn.disabled = false;
      spinnerEl.style.display = "none";
      document.getElementById("paywall").style.display = "none";
      lockoutMsgEl.style.display = "none";
      lockoutMsgEl.textContent = "";

      // Add initial welcome message
      const welcome = "Hello! I'm Sage, your spiritual virtual therapist. 🌱\nHow can I support you today?";
      chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${welcome}</div>`;
      history.push({ role: "assistant", content: welcome });
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    function setupActionButtons() {
      extraBtns.innerHTML = "";
      const exportBtn = document.createElement("button");
      exportBtn.textContent = "Export Conversation";
      exportBtn.onclick = exportChat;
      exportBtn.ariaLabel = "Export conversation as text file";
      const importBtn = document.createElement("button");
      importBtn.textContent = "Import Conversation";
      importBtn.ariaLabel = "Import conversation from text file";
      importBtn.onclick = () => importInput.click();
      const clearBtn = document.createElement("button");
      clearBtn.textContent = "Clear Chat";
      clearBtn.onclick = clearChat;
      clearBtn.ariaLabel = "Clear all chat history and restart";
      extraBtns.appendChild(exportBtn);
      extraBtns.appendChild(importBtn);
      extraBtns.appendChild(clearBtn);
    }
    setupActionButtons();

    importInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        importChatFromFile(file);
      }
      importInput.value = "";
    });

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

    function escapeHTML(str) {
      return str.replace(/[&<>"']/g, function(m) {
        return ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m];
      });
    }

    function startSessionTimer() {
      if (timerInterval) clearInterval(timerInterval); // Clear any existing interval
      if (sessionTimeout) clearTimeout(sessionTimeout); // Clear any existing timeout

      if (!sessionStart) {
        sessionStart = Date.now();
        localStorage.setItem('sage_sessionStart', sessionStart); // Persist session start
      }
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
      sessionTimeout = setTimeout(endSession, 15 * 60 * 1000 - (Date.now() - sessionStart));
    }

    function updateTimer() {
      if (!sessionStart) return;
      const elapsed = Date.now() - sessionStart;
      const remaining = Math.max(0, 15 * 60 * 1000 - elapsed);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent =
        remaining > 0
          ? `Session time left: ${mins}:${secs.toString().padStart(2, '0')}`
          : "Session ended";
      if (remaining <= 0 && timerInterval) {
        clearInterval(timerInterval);
        clearTimeout(sessionTimeout); // Ensure timeout is also cleared
      }
    }

    function endSession() {
      sessionEnded = true;
      inputEl.disabled = true;
      sendBtn.disabled = true;
      spinnerEl.style.display = "none";
      clearInterval(timerInterval); // Ensure timer stops
      clearTimeout(sessionTimeout); // Ensure timeout is cleared
      localStorage.removeItem('sage_sessionStart'); // Clear persisted session start

      if (!hasRecentDonation()) {
        setLockout();
        const msg = lockoutMessage();
        chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> Your free session has ended. ${msg}</div>`;
        lockoutMsgEl.style.display = "block";
        lockoutMsgEl.textContent = msg;
        document.getElementById("paywall").style.display = "block"; // Show paywall
      } else {
        chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> Your free session has ended. Thank you for your support! You may start a new session at any time.</div>`;
        lockoutMsgEl.style.display = "none";
        lockoutMsgEl.textContent = "";
        // If donation already made, don't show paywall or lock
        document.getElementById("paywall").style.display = "none";
        // Also re-enable chat if donation is valid
        inputEl.disabled = false;
        sendBtn.disabled = false;
        sessionEnded = false; // Allow sending again after valid donation
        // And restart timer if they were already in a session and it ended but donation makes it active
        startSessionTimer(); // Restart the timer and timeout
      }
      timerEl.textContent = "Session ended";
    }

    // This function is globally exposed for the donate buttons
    window.donate = function(period) {
      alert(`Thank you for supporting our mission with a ${period} donation! (In a real app, this would process payment.)`); // Added alert for testing
      setLastDonationTime();
      clearLockout();

      // Reset session state to active
      sessionEnded = false;
      sessionStart = Date.now(); // Start a new session timer from now
      localStorage.setItem('sage_sessionStart', sessionStart); // Persist new session start
      inputEl.disabled = false;
      sendBtn.disabled = false;
      spinnerEl.style.display = "none";
      document.getElementById("paywall").style.display = "none";
      lockoutMsgEl.style.display = "none";
      lockoutMsgEl.textContent = "";

      // Clear any previous timer and set up a new one
      clearInterval(timerInterval);
      clearTimeout(sessionTimeout);
      startSessionTimer(); // This will set up the new timerInterval and sessionTimeout

      // Add a message to the chat confirming session restoration
      chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> Your session has been restored. How can I support you today?</div>`;
      chatEl.scrollTop = chatEl.scrollHeight;
    }

    // On load or clear, check for lockout
    function checkLockoutOnLoad() {
      if (isLockedOut() && !hasRecentDonation()) {
        sessionEnded = true; // Lock out the session
        inputEl.disabled = true;
        sendBtn.disabled = true;
        const msg = lockoutMessage();
        // Only show Sage's message if chat is empty or not already showing lockout
        if (chatEl.innerHTML === "" || !chatEl.innerHTML.includes(msg)) {
             chatEl.innerHTML = `<div class="sage"><strong>Sage:</strong> ${msg}</div>`;
        }
        document.getElementById("paywall").style.display = "block";
        timerEl.textContent = "Session ended";
        lockoutMsgEl.style.display = "block";
        lockoutMsgEl.textContent = msg;
        clearInterval(timerInterval); // Ensure timer is stopped if already locked out
        clearTimeout(sessionTimeout);
      } else {
        // If not locked out or has a recent donation, ensure chat is enabled
        sessionEnded = false; // Very important: ensures sendMessage can proceed
        inputEl.disabled = false;
        sendBtn.disabled = false;
        document.getElementById("paywall").style.display = "none";
        lockoutMsgEl.style.display = "none";
        lockoutMsgEl.textContent = "";

        // If a session was active before page refresh/load, restart timer
        const storedSessionStart = parseInt(localStorage.getItem('sage_sessionStart'), 10);
        if (storedSessionStart > 0) { // Check if a session start time exists
            sessionStart = storedSessionStart; // Restore sessionStart
            if (Date.now() - sessionStart < (15 * 60 * 1000)) { // If session is still active
                 startSessionTimer();
            } else {
                 // If session expired while page was closed
                 endSession(); // This will apply lockout if needed or just end session visually
            }
        }
      }
    }

    // Initial setup logic
    checkLockoutOnLoad(); // Call this first to set initial state

    if (history.length === 0 && !sessionEnded) { // Only add welcome if chat is empty and not locked out
      const welcome = "Hello! I'm Sage, your spiritual virtual therapist. 🌱\nHow can I support you today?";
      chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${welcome}</div>`;
      history.push({ role: "assistant", content: welcome });
    }


    async function sendMessage() {
      // Re-check lockout and donation status before sending
      if (isLockedOut() && !hasRecentDonation()) {
        sessionEnded = true; // Ensure the session is marked as ended
        inputEl.disabled = true;
        sendBtn.disabled = true;
        document.getElementById("paywall").style.display = "block";
        const msg = lockoutMessage();
        lockoutMsgEl.style.display = "block";
        lockoutMsgEl.textContent = msg;
        timerEl.textContent = "Session ended";
        return; // Prevent message from being sent
      }
      if (sessionEnded) return; // If session ended due to timer, stop here

      const userMessage = inputEl.value.trim();
      if (!userMessage) return;
      chatEl.innerHTML += `<div class="user">You: ${escapeHTML(userMessage)}</div>`;
      chatEl.scrollTop = chatEl.scrollHeight;
      inputEl.value = "";
      history.push({ role: "user", content: userMessage });

      // Start the timer *after* the first message is sent, or if not already running
      if (!sessionStart) { // Only start timer if it hasn't been started for this session
         sessionStart = Date.now();
         localStorage.setItem('sage_sessionStart', sessionStart); // Persist session start
         startSessionTimer();
      }

      spinnerEl.style.display = "block";
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history
      ];
      try {
        const API_URL = window.SAGE_API_URL || "https://1827f4679046.ngrok-free.app/v1/chat/completions";
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "Qwen-3-4B",
            messages: messages,
            temperature: 0.8,
            top_p: 0.95,
            max_tokens: 4060
          })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || "[No response]";
        chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> ${escapeHTML(reply)}</div>`;
        history.push({ role: "assistant", content: reply });
        chatEl.scrollTop = chatEl.scrollHeight;
      } catch (err) {
        console.error(err);
        chatEl.innerHTML += `<div class="sage"><strong>Sage:</strong> Error contacting Sage. Please try again. <button onclick="sendMessage()">Retry</button></div>`;
      } finally {
        spinnerEl.style.display = "none";
      }
    }
  }); // end DOMContentLoaded
