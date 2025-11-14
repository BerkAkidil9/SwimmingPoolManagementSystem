import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCreditCard, FaTrash, FaCheckCircle, FaTimes, FaInfoCircle } from 'react-icons/fa';
import './PaymentMethods.css';

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/payment/payment-methods');
      setPaymentMethods(response.data.payment_methods);
      setError(null);
    } catch (err) {
      setError('Failed to fetch payment methods');
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultPaymentMethod = async (id) => {
    try {
      await axios.put(`/api/payment/payment-methods/${id}/default`);
      setSuccessMessage('Default payment method updated successfully');
      fetchPaymentMethods(); // Refresh the list
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError('Failed to set default payment method');
      console.error('Error setting default payment method:', err);
    }
  };

  const deletePaymentMethod = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment method?')) {
      try {
        await axios.delete(`/api/payment/payment-methods/${id}`);
        setSuccessMessage('Payment method deleted successfully');
        fetchPaymentMethods(); // Refresh the list
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (err) {
        setError('Failed to delete payment method');
        console.error('Error deleting payment method:', err);
      }
    }
  };

  const getCardIcon = (brand) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 Amex';
      case 'discover':
        return '💳 Discover';
      default:
        return '💳 Card';
    }
  };

  const formatExpiryDate = (month, year) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="payment-methods-loading">
        <div className="loading-spinner"></div>
        <p>Loading payment methods...</p>
      </div>
    );
  }

  return (
    <div className="payment-methods-container">
      {error && (
        <div className="error-message">
          <FaInfoCircle /> {error}
          <button onClick={() => setError(null)} className="close-error">
            <FaTimes />
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          <FaCheckCircle /> {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="close-success">
            <FaTimes />
          </button>
        </div>
      )}
      
      <div className="payment-methods-header">
        <h2>Your Payment Methods</h2>
        <p className="payment-methods-subtitle">
          Saved payment methods will appear here for quick checkout
        </p>
      </div>
      
      <div className="payment-methods-list">
        {paymentMethods.length > 0 ? (
          paymentMethods.map((method) => (
            <div 
              key={method.id} 
              className={`payment-method-card ${method.is_default ? 'default' : ''}`}
            >
              <div className="payment-method-info">
                <div className="card-brand">
                  {getCardIcon(method.card_brand)}
                </div>
                <div className="card-details">
                  <div className="card-number">
                    •••• •••• •••• {method.last4}
                  </div>
                  <div className="card-expiry">
                    Expires {formatExpiryDate(method.exp_month, method.exp_year)}
                  </div>
                </div>
              </div>
              <div className="payment-method-actions">
                {method.is_default ? (
                  <span className="default-badge">
                    <FaCheckCircle /> Default
                  </span>
                ) : (
                  <button 
                    onClick={() => setDefaultPaymentMethod(method.id)}
                    className="set-default-btn"
                  >
                    Set as default
                  </button>
                )}
                <button 
                  onClick={() => deletePaymentMethod(method.id)}
                  className="delete-btn"
                  aria-label="Delete payment method"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-payment-methods">
            <FaCreditCard className="no-cards-icon" />
            <p>You don't have any saved payment methods</p>
            <p className="no-cards-hint">When making a purchase, check "Save this card for future payments" to save your payment details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethods;
