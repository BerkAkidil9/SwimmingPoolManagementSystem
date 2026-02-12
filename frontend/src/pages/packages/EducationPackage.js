import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./PackagePage.css";

const EducationPackage = () => {
  const [price, setPrice] = useState(100); // Default fallback price

  useEffect(() => {
    // Fetch package prices from the backend
    const fetchPackagePrices = async () => {
      try {
        const response = await axios.get('/api/member/package-prices');
        if (response.data && response.data.prices && response.data.prices.education) {
          setPrice(response.data.prices.education);
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
        <h1>Education Package</h1>
        <p>Learn swimming with expert instructors in a structured environment.</p>
      </header>
      <section className="package-details">
        <h2>Package Details</h2>
        <ul>
          <li><strong>Sessions:</strong> 12 Sessions</li>
          <li><strong>Validity:</strong> Valid for 3 months</li>
          <li><strong>Available:</strong> 7:00 - 18:00</li>
          <li><strong>Price:</strong> ${price}</li>
        </ul>
        <div className="package-actions">
          <Link to="/" className="package-button secondary">Back to Homepage</Link>
          <Link to="/register" className="package-button">Register Now</Link>
        </div>
      </section>
    </div>
  );
};

export default EducationPackage;
