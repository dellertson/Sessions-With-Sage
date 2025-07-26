// server.js

// Import necessary packages
const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

// --- Stripe Setup ---
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Routes ---

// Homepage route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Stripe Payment Intent route
app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 50) {
    return res.status(400).send({ error: { message: "Invalid amount provided." } });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    res.status(500).send({ error: { message: e.message } });
  }
});

/**
 * API Endpoint: /chat-completion (with debugging logs)
 * This endpoint acts as a secure proxy to your self-hosted LLM.
 */
app.post('/chat-completion', async (req, res) => {
  console.log('\n---'); // Separator for new requests
  console.log('✅ [SERVER LOG] Received chat request on /chat-completion endpoint.');

  const llmApiUrl = process.env.LLM_API_URL;

  if (!llmApiUrl) {
    console.error('❌ [SERVER LOG] ERROR: LLM_API_URL is not defined in the .env file.');
    return res.status(500).json({ error: 'LLM API URL not configured on the server.' });
  }

  console.log(`➡️ [SERVER LOG] Forwarding request to AI server at: ${llmApiUrl}`);

  try {
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body), // Forward the entire body from the front-end
    });

    console.log(`⬅️ [SERVER LOG] Received response from AI server with status: ${response.status}`);

    if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [SERVER LOG] ERROR from AI server:', errorData);
        return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    console.log('✅ [SERVER LOG] Successfully received AI response. Forwarding to client.');
    res.json(data);

  } catch (error) {
    console.error('❌ [SERVER LOG] FATAL ERROR: Failed to fetch from the AI server.');
    console.error(error); // Log the full error object
    res.status(500).json({ error: 'Failed to connect to the AI service.' });
  }
});


// --- Start the Server ---
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));

