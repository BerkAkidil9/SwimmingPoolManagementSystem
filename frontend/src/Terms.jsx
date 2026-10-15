import React from 'react';
import './Terms.css';

function Terms() {
  return (
    <div className="terms">
      <div className="terms-container">
        <h1>Terms and Conditions</h1>
        <div className="terms-content">
          <section>
            <h2>1. Safety Rules</h2>
            <p>Please read and follow these safety rules carefully:</p>
            <ul>
              <li>Follow all posted safety rules and staff instructions</li>
              <li>No running around the pool area</li>
              <li>No diving in shallow areas</li>
              <li>Children under 12 must be supervised by an adult</li>
              <li>Proper swimming attire is required</li>
            </ul>
          </section>

          <section>
            <h2>2. Membership</h2>
            <p>By becoming a member, you agree to these terms:</p>
            <ul>
              <li>Membership is non-transferable</li>
              <li>Members must present valid ID upon entry</li>
              <li>Membership fees are non-refundable</li>
              <li>Management reserves the right to terminate membership for rule violations</li>
            </ul>
          </section>

          <section>
            <h2>3. Health and Hygiene</h2>
            <p>For everyone's safety and well-being:</p>
            <ul>
              <li>Shower before entering the pool</li>
              <li>Do not enter the pool if you have any contagious conditions</li>
              <li>Report any health concerns to staff immediately</li>
              <li>Follow all posted hygiene guidelines</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Terms;
