import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PackagePurchase.css';
import StripeCheckout from './StripeCheckout';
import { FaTimes } from 'react-icons/fa';

const PackagePurchase = ({ onPurchaseComplete, onCancel }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [packagePrices, setPackagePrices] = useState({
    education: 100, // Default values as fallback
    free_swimming: 150
  });
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);

  useEffect(() => {
    // Fetch user profile and package prices from the backend
    const fetchInitialData = async () => {
      setFetchingProfile(true);
      try {
        // Fetch package prices
        const pricesResponse = await axios.get('/api/member/package-prices');
        if (pricesResponse.data && pricesResponse.data.prices) {
          setPackagePrices(pricesResponse.data.prices);
        }

        // Fetch user profile to get swimming ability
        const profileResponse = await axios.get('/api/member/package');
        // Using the package endpoint as a fallback - we just need to ensure we're authenticated
        
        // Now try to get the actual profile data
        try {
          const actualProfileResponse = await axios.get('/api/member/profile');
          if (actualProfileResponse.data) {
            setUserProfile(actualProfileResponse.data);
          }
        } catch (profileError) {
          console.error("Error fetching detailed profile:", profileError);
          // Continue anyway as we've verified authentication with the package call
          setUserProfile({
            swimming_ability: null, // Default to null if we can't get the actual swimming ability
            name: "User"
          });
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Authentication issue. Please try logging in again.');
      } finally {
        setFetchingProfile(false);
      }
    };

    fetchInitialData();
  }, []);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setShowStripeCheckout(true);
  };

  const handlePaymentSuccess = () => {
    setShowStripeCheckout(false);
    setSelectedPackage(null);
    onPurchaseComplete(); // Trigger data refresh in parent component
  };

  const handlePaymentCancel = () => {
    setShowStripeCheckout(false);
  };

  // Determine package availability based on swimming ability
  // Default to showing both packages if swimming ability is not set
  const canPurchaseEducation = !userProfile?.swimming_ability || userProfile?.swimming_ability === 'No';
  const canPurchaseFreeSwimming = !userProfile?.swimming_ability || userProfile?.swimming_ability === 'Yes';

  if (showStripeCheckout) {
    return (
      <StripeCheckout 
        packageType={selectedPackage}
        price={packagePrices[selectedPackage]}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    );
  }

  return (
    <div className="package-purchase">
      <div className="package-purchase-header">
        <h2>Select a Package</h2>
        <button className="close-package-btn" onClick={onCancel}>
          <FaTimes />
        </button>
      </div>
      
      {fetchingProfile ? (
        <div className="loading-message">Loading your profile information...</div>
      ) : error ? (
        <div className="error-message">
          {error}
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      ) : (
        <>
          {userProfile?.swimming_ability && (
            <div className="swimming-status">
              <p>Your swimming ability status: <strong>{userProfile.swimming_ability || 'Not specified'}</strong></p>
              <p className="package-eligibility-note">
                {userProfile.swimming_ability === 'No' 
                  ? 'You are eligible for the Education Package to learn how to swim.' 
                  : userProfile.swimming_ability === 'Yes'
                    ? 'You are eligible for the Free Swimming Package.'
                    : 'Please update your profile with your swimming ability to see eligible packages.'}
              </p>
            </div>
          )}
          
          {!userProfile?.swimming_ability && (
            <div className="swimming-status warning">
              <p>Your swimming ability is not set in your profile. You may need to update your profile before purchasing a package.</p>
            </div>
          )}

          <div className="package-options">
            <div 
              className={`package-card ${selectedPackage === 'education' ? 'selected' : ''} ${!canPurchaseEducation && userProfile?.swimming_ability ? 'disabled' : ''}`}
              onClick={() => canPurchaseEducation || !userProfile?.swimming_ability ? setSelectedPackage('education') : null}
              style={(!canPurchaseEducation && userProfile?.swimming_ability) ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
            >
              <h3>Education Package</h3>
              <ul>
                <li>12 sessions for swimming education</li>
                <li>Valid for 3 months</li>
                <li>Available 7:00 - 18:00</li>
                <li>For those who <strong>need to learn</strong> swimming</li>
              </ul>
              <p className="price">${packagePrices.education}</p>
              {!canPurchaseEducation && userProfile?.swimming_ability && (
                <div className="package-unavailable-message">
                  Available only for users who don't know how to swim
                </div>
              )}
            </div>
            <div 
              className={`package-card ${selectedPackage === 'free_swimming' ? 'selected' : ''} ${!canPurchaseFreeSwimming && userProfile?.swimming_ability ? 'disabled' : ''}`}
              onClick={() => canPurchaseFreeSwimming || !userProfile?.swimming_ability ? setSelectedPackage('free_swimming') : null}
              style={(!canPurchaseFreeSwimming && userProfile?.swimming_ability) ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
            >
              <h3>Free Swimming Package</h3>
              <ul>
                <li>18 sessions for free swimming</li>
                <li>Valid for 3 months</li>
                <li>Available 7:00 - 24:00</li>
                <li>For those who <strong>already know</strong> how to swim</li>
              </ul>
              <p className="price">${packagePrices.free_swimming}</p>
              {!canPurchaseFreeSwimming && userProfile?.swimming_ability && (
                <div className="package-unavailable-message">
                  Available only for users who know how to swim
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      <button 
        className="purchase-btn" 
        onClick={handlePurchase}
        disabled={!selectedPackage || loading || fetchingProfile || error}
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </div>
  );
};

export default PackagePurchase;