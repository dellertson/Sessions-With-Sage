// server.js

// Import necessary packages
const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

// --- Stripe Setup ---
// Initialize Stripe with your secret key.
// The key is loaded from the .env file for security.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- Middleware ---
// Serve static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Allow the server to parse JSON data in request bodies
app.use(express.json());

// --- Routes ---

// A simple route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * API Endpoint: /create-payment-intent
 * This endpoint creates a new Stripe PaymentIntent.
 * A PaymentIntent is an object that represents your intent to collect payment from a customer
 * and tracks the lifecycle of the payment process.
 */
app.post('/create-payment-intent', async (req, res) => {
  // Get the 'amount' from the request body sent by the front-end
  const { amount } = req.body;

  // Validate the amount
  if (!amount || amount < 50) { // Stripe has a minimum charge amount (e.g., $0.50)
    return res.status(400).send({ error: { message: "Invalid amount provided." } });
  }

  try {
    // Create a PaymentIntent with the specified amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      // You can add other options here, like automatic_payment_methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Send the 'client_secret' of the PaymentIntent back to the front-end
    // The front-end needs this to securely confirm the payment with Stripe's API
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    // If there's an error creating the PaymentIntent, send an error response
    res.status(500).send({ error: { message: e.message } });
  }
});

// --- Start the Server ---
const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));