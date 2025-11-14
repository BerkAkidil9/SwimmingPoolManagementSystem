import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import './StripeCheckout.css';
import { FaCreditCard } from 'react-icons/fa';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe('pk_test_51QsuZlBM71F34f4Se9yVZWKYLaKxjuEIb1FMCEKU1Fd7qNqlqntsJ9fEgLNFaxs16MJn30wunStVWcZc8U6FJL8m00gMluf5Bc');

// Card element styling
const cardElementOptions = {
  style: {
    base: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontSmoothing: 'antialiased',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      ':-webkit-autofill': {
        color: '#fce883',
      },
      ':focus': {
        color: '#424770',
      },
    },
    invalid: {
      color: '#e25950',
      '::placeholder': {
        color: '#FFCCA5',
      },
      iconColor: '#e25950',
    },
  },
  hidePostalCode: true,
};

// Checkout form component
const CheckoutForm = ({ packageType, price, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [saveCard, setSaveCard] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [useNewCard, setUseNewCard] = useState(false);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setPaymentProgress(10);
        const response = await axios.post('/api/payment/create-payment-intent', {
          type: packageType
        });
        setClientSecret(response.data.clientSecret);
        setCustomerId(response.data.customerId);
        setPaymentProgress(30);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to initialize payment');
      }
    };

    createPaymentIntent();
    
    // Simulate loading progress for better UX
    const progressInterval = setInterval(() => {
      setPaymentProgress((prev) => {
        if (prev >= 30) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 50);
    
    return () => clearInterval(progressInterval);
  }, [packageType]);

  // Fetch saved payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await axios.get('/api/payment/payment-methods');
        setSavedPaymentMethods(response.data.payment_methods);
        
        // If there are payment methods available, select the default one by default
        const defaultMethod = response.data.payment_methods.find(method => method.is_default);
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod);
          setUseNewCard(false);
        } else {
          setUseNewCard(true);
        }
      } catch (err) {
        console.error("Error fetching payment methods:", err);
        setUseNewCard(true);
      }
    };

    fetchPaymentMethods();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      setLoading(false);
      return;
    }

    // Progress update for user feedback
    setPaymentProgress(50);

    try {
      let paymentResult;

      if (useNewCard) {
        // Get the card element
        const cardElement = elements.getElement(CardElement);
        
        // Confirm the card payment with new card
        setPaymentProgress(70);
        paymentResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              // You could collect name and email here if needed
            }
          },
          setup_future_usage: saveCard ? 'off_session' : undefined
        });
      } else if (selectedPaymentMethod && selectedPaymentMethod.payment_method_id) {
        // Use existing payment method
        setPaymentProgress(70);
        console.log("Using saved payment method:", selectedPaymentMethod.payment_method_id);
        
        paymentResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedPaymentMethod.payment_method_id
        });
      } else {
        throw new Error("No valid payment method selected");
      }

      const { error, paymentIntent } = paymentResult;

      if (error) {
        setError(error.message);
        setLoading(false);
        setPaymentProgress(30);
      } else if (paymentIntent.status === 'succeeded') {
        // Progress update for user feedback
        setPaymentProgress(90);
        
        try {
          // If saveCard is true, we need to get the payment method ID from the payment intent
          let paymentMethodId = null;
          
          if (saveCard && useNewCard) {
            // The payment_method property of paymentIntent contains the ID we need
            paymentMethodId = paymentIntent.payment_method;
            console.log("Payment method to save:", paymentMethodId);
          }
          
          // Payment successful, now update the database
          await axios.post('/api/payment/payment-success', {
            paymentIntentId: paymentIntent.id,
            packageType,
            saveCard: saveCard && useNewCard,
            paymentMethodId: paymentMethodId
          });
          
          setPaymentProgress(100);
          onSuccess();
        } catch (dbError) {
          console.error("Error saving payment data:", dbError);
          setError('Payment successful, but failed to save package. Please contact support.');
          setPaymentProgress(30);
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError('An unexpected error occurred during payment processing');
      setPaymentProgress(30);
    }
    
    setLoading(false);
  };

  // Format card display for saved payment methods
  const formatCardDisplay = (method) => {
    return `${method.card_brand} •••• ${method.last4} (Expires ${method.exp_month}/${method.exp_year})`;
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      {paymentProgress > 0 && paymentProgress < 100 && (
        <div className="payment-progress-container">
          <div className="payment-progress-bar" style={{ width: `${paymentProgress}%` }}></div>
        </div>
      )}
      
      <div className="package-summary">
        <h3>Package Summary</h3>
        <div className="package-info">
          <div className="package-detail">
            <span className="detail-label">Package Type:</span>
            <span className="detail-value">{packageType === 'education' ? 'Education Package' : 'Free Swimming Package'}</span>
          </div>
          <div className="package-detail">
            <span className="detail-label">Price:</span>
            <span className="detail-value">${price}</span>
          </div>
          <div className="package-detail">
            <span className="detail-label">Sessions:</span>
            <span className="detail-value">{packageType === 'education' ? '12 sessions' : '18 sessions'}</span>
          </div>
          <div className="package-detail">
            <span className="detail-label">Validity:</span>
            <span className="detail-value">3 months from purchase</span>
          </div>
        </div>
      </div>

      {savedPaymentMethods.length > 0 && (
        <div className="saved-payment-methods">
          <h4>Your Payment Methods</h4>
          
          <div className="payment-method-options">
            {savedPaymentMethods.map(method => (
              <div key={method.id} className="saved-payment-method">
                <label className="payment-method-label">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={!useNewCard && selectedPaymentMethod?.id === method.id}
                    onChange={() => {
                      setSelectedPaymentMethod(method);
                      setUseNewCard(false);
                    }}
                  />
                  <span className="payment-method-info">
                    <FaCreditCard className="card-icon" />
                    <span className="card-details">{formatCardDisplay(method)}</span>
                    {method.is_default ? <span className="default-badge">Default</span> : null}
                  </span>
                </label>
              </div>
            ))}
            
            <div className="saved-payment-method">
              <label className="payment-method-label">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={useNewCard}
                  onChange={() => setUseNewCard(true)}
                />
                <span className="payment-method-info">
                  <FaCreditCard className="card-icon" />
                  <span className="card-details">Use a new card</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {(useNewCard || savedPaymentMethods.length === 0) && (
        <div className="card-element-container">
          <label>
            <span className="card-label">Card details</span>
            <div className="card-input">
              <CardElement options={cardElementOptions} />
            </div>
          </label>
          <div className="card-brands">
            <span className="card-brand-icon">💳</span> We accept all major credit cards
          </div>
          
          <div className="save-card-option">
            <label className="save-card-label">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={() => setSaveCard(!saveCard)}
                className="save-card-checkbox"
              />
              <span>Save this card for future payments</span>
            </label>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="checkout-actions">
        <button type="button" onClick={onCancel} disabled={loading} className="cancel-btn">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || loading} className="pay-btn">
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Processing...
            </>
          ) : (
            `Pay $${price}`
          )}
        </button>
      </div>
    </form>
  );
};

// Main component that wraps CheckoutForm with Stripe Elements
const StripeCheckout = ({ packageType, price, onSuccess, onCancel }) => {
  return (
    <div className="stripe-checkout">
      <h2>Secure Payment</h2>
      <Elements stripe={stripePromise}>
        <CheckoutForm 
          packageType={packageType} 
          price={price} 
          onSuccess={onSuccess} 
          onCancel={onCancel} 
        />
      </Elements>
      <div className="secure-notice">
        <small>All payments are secure and encrypted. Your card information is never stored on our servers.</small>
      </div>
    </div>
  );
};

export default StripeCheckout;
