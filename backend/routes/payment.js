const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { isAuthenticated, getCurrentUser, getCurrentUserId } = require("../middleware/auth");

// Import Stripe with secret key from environment
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Helper function to get or create a Stripe customer for a user
const getOrCreateStripeCustomer = async (userId, email) => {
  try {
    // Check if user already has a stripe_customer_id in the database
    const [userRow] = await db.promise().query(
      "SELECT stripe_customer_id FROM users WHERE id = ?",
      [userId]
    );
    
    // If user has a stripe_customer_id, return it
    if (userRow.length > 0 && userRow[0].stripe_customer_id) {
      return userRow[0].stripe_customer_id;
    }
    
    // Otherwise, create a new customer in Stripe
    const customer = await stripe.customers.create({
      metadata: {
        user_id: userId
      },
      email: email || `user${userId}@example.com` // Use email if provided, otherwise generate one
    });
    
    // Save the stripe_customer_id to the user record
    await db.promise().query(
      "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
      [customer.id, userId]
    );
    
    return customer.id;
  } catch (error) {
    console.error("Error getting/creating Stripe customer:", error);
    throw error;
  }
};

// Create a payment intent for a package purchase
router.post("/create-payment-intent", isAuthenticated, async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: "Package type is required" });
    }

    const userId = getCurrentUserId(req);
    const userEmail = getCurrentUser(req)?.email;

    // Check for active packages only (both remaining sessions > 0 AND not expired)
    const [existingPackage] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURRENT_DATE",
      [userId]
    );

    if (existingPackage.length) {
      return res.status(400).json({ error: "You already have an active package" });
    }

    // Calculate price based on package type (in cents for Stripe)
    const amount = type === 'education' ? 10000 : 15000; // $100.00 or $150.00 in cents
    const sessions = type === 'education' ? 12 : 18;

    // Get or create a Stripe customer for this user
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);

    // Create a payment intent with the customer ID
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customerId,
      metadata: {
        user_id: userId,
        package_type: type,
        sessions: sessions
      },
    });

    // Return the client secret and customer ID
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      customerId: customerId
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// Handle successful payment and create package
router.post("/payment-success", isAuthenticated, async (req, res) => {
  try {
    const { paymentIntentId, packageType, saveCard, paymentMethodId } = req.body;
    
    if (!paymentIntentId || !packageType) {
      return res.status(400).json({ error: "Payment intent ID and package type are required" });
    }

    // Verify the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: "Payment has not been completed" });
    }

    const userId = getCurrentUserId(req);
    const userEmail = getCurrentUser(req)?.email;

    // Strict type-safe comparison (Stripe metadata values are always strings)
    if (String(paymentIntent.metadata.user_id) !== String(userId)) {
      return res.status(403).json({ error: "Invalid payment" });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, userEmail);

    // Create the package in the database
    const sessions = packageType === 'education' ? 12 : 18;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    // Calculate price based on package type
    const price = packageType === 'education' ? 100.00 : 150.00;

    // Create a transaction to ensure data consistency (PostgreSQL: db.transaction)
    await db.transaction(async (trx) => {
      // Prevent duplicate payment processing (race condition guard)
      const [existingPayment] = await trx.query(
        "SELECT id FROM payments WHERE payment_intent_id = ?",
        [paymentIntentId]
      );
      if (existingPayment.length > 0) {
        const err = new Error("Payment already processed");
        err.statusCode = 400;
        throw err;
      }

      // Prevent duplicate active packages (row-level lock)
      const [existingPackage] = await trx.query(
        "SELECT id FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURRENT_DATE FOR UPDATE",
        [userId]
      );
      if (existingPackage.length > 0) {
        const err = new Error("You already have an active package");
        err.statusCode = 400;
        throw err;
      }

      // Insert the package
      await trx.query(
        "INSERT INTO packages (user_id, type, price, remaining_sessions, expiry_date) VALUES (?, ?, ?, ?, ?)",
        [userId, packageType, price, sessions, expiryDate]
      );

      // Create a payment record
      await trx.query(
        "INSERT INTO payments (user_id, package_type, amount, payment_intent_id, status) VALUES (?, ?, ?, ?, ?)",
        [userId, packageType, price, paymentIntentId, "completed"]
      );

      // If the user chose to save the card and we have the payment method ID
      if (saveCard && paymentMethodId) {
        try {
          // Get the payment method details from Stripe
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
          
          // Attach payment method to customer if not already attached
          try {
            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: customerId,
            });
          } catch (attachError) {
            if (process.env.NODE_ENV !== 'production') {
              console.log("Error attaching payment method - may already be attached:", attachError.message);
            }
          }
          
          if (paymentMethod && paymentMethod.card) {
            // Check if this card already exists for the user (by last4 and exp_date)
            const [existingCard] = await trx.query(
              "SELECT * FROM payment_methods WHERE user_id = ? AND last4 = ? AND exp_month = ? AND exp_year = ?",
              [
                userId, 
                paymentMethod.card.last4,
                paymentMethod.card.exp_month,
                paymentMethod.card.exp_year
              ]
            );
            
            // Only save if it's a new card
            if (existingCard.length === 0) {
              // Get count of existing payment methods for this user
              const [cardCount] = await trx.query(
                "SELECT COUNT(*) AS count FROM payment_methods WHERE user_id = ?",
                [userId]
              );
              
              // Set as default if this is the first card
              const isDefault = cardCount[0].count === 0 ? true : false;
              
              await trx.query(
                "INSERT INTO payment_methods (user_id, payment_method_id, card_brand, last4, exp_month, exp_year, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                  userId,
                  paymentMethodId,
                  paymentMethod.card.brand,
                  paymentMethod.card.last4,
                  paymentMethod.card.exp_month,
                  paymentMethod.card.exp_year,
                  isDefault
                ]
              );
            }
          } else {
            console.error("Payment method missing card details");
          }
        } catch (pmError) {
          console.error("Error processing payment method:", pmError);
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Failed to process payment" });
  }
});

// Get all saved payment methods for the user
router.get("/payment-methods", isAuthenticated, async (req, res) => {
  try {
    const [paymentMethods] = await db.promise().query(
      "SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
      [getCurrentUserId(req)]
    );
    
    res.json({ payment_methods: paymentMethods });
  } catch (error) {
    console.error("Error retrieving payment methods:", error);
    res.status(500).json({ error: "Failed to retrieve payment methods" });
  }
});

// Set a payment method as default
router.put("/payment-methods/:id/default", isAuthenticated, async (req, res) => {
  try {
    const paymentMethodId = req.params.id;
    
    const uid = getCurrentUserId(req);
    // First, check if the payment method belongs to the user
    const [paymentMethod] = await db.promise().query(
      "SELECT * FROM payment_methods WHERE id = ? AND user_id = ?",
      [paymentMethodId, uid]
    );
    
    if (paymentMethod.length === 0) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    await db.transaction(async (trx) => {
      await trx.query(
        "UPDATE payment_methods SET is_default = false WHERE user_id = ?",
        [uid]
      );
      await trx.query(
        "UPDATE payment_methods SET is_default = true WHERE id = ?",
        [paymentMethodId]
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error setting default payment method:", error);
    res.status(500).json({ error: "Failed to set default payment method" });
  }
});

// Delete a payment method
router.delete("/payment-methods/:id", isAuthenticated, async (req, res) => {
  try {
    const paymentMethodId = req.params.id;
    
    const uid = getCurrentUserId(req);
    // First, check if the payment method belongs to the user
    const [paymentMethod] = await db.promise().query(
      "SELECT * FROM payment_methods WHERE id = ? AND user_id = ?",
      [paymentMethodId, uid]
    );
    
    if (paymentMethod.length === 0) {
      return res.status(404).json({ error: "Payment method not found" });
    }
    
    // Delete the payment method
    await db.promise().query(
      "DELETE FROM payment_methods WHERE id = ?",
      [paymentMethodId]
    );
    
    // If this was the default payment method, set another one as default if available
    if (paymentMethod[0].is_default) {
      const [remainingPaymentMethods] = await db.promise().query(
        "SELECT * FROM payment_methods WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [uid]
      );
      
      if (remainingPaymentMethods.length > 0) {
        await db.promise().query(
          "UPDATE payment_methods SET is_default = true WHERE id = ?",
          [remainingPaymentMethods[0].id]
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    res.status(500).json({ error: "Failed to delete payment method" });
  }
});

// Get Stripe publishable key (from env only - no hardcoded fallback)
router.get("/config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "",
  });
});

module.exports = router;
