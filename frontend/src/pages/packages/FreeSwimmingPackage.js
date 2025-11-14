import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./PackagePage.css";

const FreeSwimmingPackage = () => {
  const [price, setPrice] = useState(150); // Default fallback price

  useEffect(() => {
    // Fetch package prices from the backend
    const fetchPackagePrices = async () => {
      try {
        const response = await axios.get('/api/member/package-prices');
        if (response.data && response.data.prices && response.data.prices.free_swimming) {
          setPrice(response.data.prices.free_swimming);
        }
      } catch (error) {
        console.error('Error fetching package prices:', error);
      }
    };

    fetchPackagePrices();
  }, []);

  return (
    <div className="package-page">
      <header className="package-hero">
        <h1>Free Swimming Package</h1>
        <p>Perfect for experienced swimmers focusing on fitness and health.</p>
      </header>
      <section className="package-details">
        <h2>Package Details</h2>
        <ul>
          <li><strong>Sessions:</strong> 18 Sessions</li>
          <li><strong>Validity:</strong> Valid for 3 months</li>
          <li><strong>Available:</strong> 7:00 - 24:00</li>
          <li><strong>Price:</strong> ${price}</li>
        </ul>
        <Link to="/register" className="package-button">Register Now</Link>
      </section>
    </div>
  );
};

export default FreeSwimmingPackage;
