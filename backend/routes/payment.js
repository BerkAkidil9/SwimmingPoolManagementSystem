const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Import Stripe with your secret key
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  next();
};

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
      console.log(`Using existing Stripe customer: ${userRow[0].stripe_customer_id}`);
      return userRow[0].stripe_customer_id;
    }
    
    // Otherwise, create a new customer in Stripe
    const customer = await stripe.customers.create({
      metadata: {
        user_id: userId
      },
      email: email || `user${userId}@example.com` // Use email if provided, otherwise generate one
    });
    
    console.log(`Created new Stripe customer: ${customer.id}`);
    
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

    // Check for active packages only (both remaining sessions > 0 AND not expired)
    const [existingPackage] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURDATE()",
      [req.session.user.id]
    );

    if (existingPackage.length) {
      return res.status(400).json({ error: "You already have an active package" });
    }

    // Calculate price based on package type (in cents for Stripe)
    const amount = type === 'education' ? 10000 : 15000; // $100.00 or $150.00 in cents
    const sessions = type === 'education' ? 12 : 18;

    // Get or create a Stripe customer for this user
    const customerId = await getOrCreateStripeCustomer(req.session.user.id, req.session.user.email);

    // Create a payment intent with the customer ID
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customerId,
      metadata: {
        user_id: req.session.user.id,
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
    
    console.log("Payment success request received:", { 
      paymentIntentId, 
      packageType, 
      saveCard, 
      paymentMethodId,
      userId: req.session.user.id 
    });
    
    if (!paymentIntentId || !packageType) {
      return res.status(400).json({ error: "Payment intent ID and package type are required" });
    }

    // Verify the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Retrieved payment intent:", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      paymentMethod: paymentIntent.payment_method
    });
    
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: "Payment has not been completed" });
    }

    // Check the metadata matches our user
    if (paymentIntent.metadata.user_id != req.session.user.id) {
      return res.status(403).json({ error: "Invalid payment" });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(req.session.user.id, req.session.user.email);

    // Create the package in the database
    const sessions = packageType === 'education' ? 12 : 18;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    // Calculate price based on package type
    const price = packageType === 'education' ? 100.00 : 150.00;

    // Create a transaction to ensure data consistency
    await db.promise().beginTransaction();

    try {
      // Insert the package
      await db.promise().query(
        "INSERT INTO packages (user_id, type, price, remaining_sessions, expiry_date) VALUES (?, ?, ?, ?, ?)",
        [req.session.user.id, packageType, price, sessions, expiryDate]
      );

      // Create a payment record (new table needed)
      await db.promise().query(
        "INSERT INTO payments (user_id, package_type, amount, payment_intent_id, status) VALUES (?, ?, ?, ?, ?)",
        [req.session.user.id, packageType, price, paymentIntentId, "completed"]
      );

      // If the user chose to save the card and we have the payment method ID
      if (saveCard && paymentMethodId) {
        console.log("Attempting to save payment method:", paymentMethodId);
        try {
          // Get the payment method details from Stripe
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
          console.log("Retrieved payment method:", {
            id: paymentMethod.id,
            type: paymentMethod.type,
            card: paymentMethod.card ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year
            } : null
          });
          
          // Attach payment method to customer if not already attached
          try {
            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: customerId,
            });
            console.log(`Attached payment method ${paymentMethodId} to customer ${customerId}`);
          } catch (attachError) {
            // If this fails because it's already attached, that's okay
            console.log("Error attaching payment method - may already be attached:", attachError.message);
          }
          
          if (paymentMethod && paymentMethod.card) {
            // Check if this card already exists for the user (by last4 and exp_date)
            const [existingCard] = await db.promise().query(
              "SELECT * FROM payment_methods WHERE user_id = ? AND last4 = ? AND exp_month = ? AND exp_year = ?",
              [
                req.session.user.id, 
                paymentMethod.card.last4,
                paymentMethod.card.exp_month,
                paymentMethod.card.exp_year
              ]
            );
            
            console.log("Existing card check:", { count: existingCard.length });
            
            // Only save if it's a new card
            if (existingCard.length === 0) {
              // Get count of existing payment methods for this user
              const [cardCount] = await db.promise().query(
                "SELECT COUNT(*) AS count FROM payment_methods WHERE user_id = ?",
                [req.session.user.id]
              );
              
              // Set as default if this is the first card
              const isDefault = cardCount[0].count === 0 ? 1 : 0;
              
              console.log("Inserting new payment method:", {
                userId: req.session.user.id,
                isDefault: isDefault,
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4
              });
              
              // Save the card details
              const [insertResult] = await db.promise().query(
                "INSERT INTO payment_methods (user_id, payment_method_id, card_brand, last4, exp_month, exp_year, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                  req.session.user.id,
                  paymentMethodId,
                  paymentMethod.card.brand,
                  paymentMethod.card.last4,
                  paymentMethod.card.exp_month,
                  paymentMethod.card.exp_year,
                  isDefault
                ]
              );
              
              console.log("Payment method saved to DB:", insertResult);
            } else {
              console.log("Card already exists, not saving duplicate");
            }
          } else {
            console.error("Payment method missing card details:", paymentMethod);
          }
        } catch (pmError) {
          console.error("Error processing payment method:", pmError);
          // Continue with transaction - don't fail the whole payment just because 
          // we couldn't save the payment method
        }
      }

      await db.promise().commit();
      console.log("Transaction committed successfully");
      res.json({ success: true });
    } catch (error) {
      await db.promise().rollback();
      console.error("Transaction error, rolled back:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Failed to process payment", details: error.message });
  }
});

// Get all saved payment methods for the user
router.get("/payment-methods", isAuthenticated, async (req, res) => {
  try {
    const [paymentMethods] = await db.promise().query(
      "SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
      [req.session.user.id]
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
    
    // First, check if the payment method belongs to the user
    const [paymentMethod] = await db.promise().query(
      "SELECT * FROM payment_methods WHERE id = ? AND user_id = ?",
      [paymentMethodId, req.session.user.id]
    );
    
    if (paymentMethod.length === 0) {
      return res.status(404).json({ error: "Payment method not found" });
    }
    
    // Begin transaction
    await db.promise().beginTransaction();
    
    try {
      // Remove default status from all payment methods
      await db.promise().query(
        "UPDATE payment_methods SET is_default = 0 WHERE user_id = ?",
        [req.session.user.id]
      );
      
      // Set the selected payment method as default
      await db.promise().query(
        "UPDATE payment_methods SET is_default = 1 WHERE id = ?",
        [paymentMethodId]
      );
      
      await db.promise().commit();
      res.json({ success: true });
    } catch (error) {
      await db.promise().rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error setting default payment method:", error);
    res.status(500).json({ error: "Failed to set default payment method" });
  }
});

// Delete a payment method
router.delete("/payment-methods/:id", isAuthenticated, async (req, res) => {
  try {
    const paymentMethodId = req.params.id;
    
    // First, check if the payment method belongs to the user
    const [paymentMethod] = await db.promise().query(
      "SELECT * FROM payment_methods WHERE id = ? AND user_id = ?",
      [paymentMethodId, req.session.user.id]
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
        [req.session.user.id]
      );
      
      if (remainingPaymentMethods.length > 0) {
        await db.promise().query(
          "UPDATE payment_methods SET is_default = 1 WHERE id = ?",
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

// Get Stripe publishable key
router.get("/config", (req, res) => {
  res.json({ 
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" 
  });
});

module.exports = router;
