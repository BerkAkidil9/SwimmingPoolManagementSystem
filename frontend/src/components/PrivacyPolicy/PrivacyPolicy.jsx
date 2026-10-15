import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="privacy-policy">
            <div className="privacy-policy-container">
                <h1>Privacy Policy</h1>
                <div className="policy-content">
                    <section>
                        <h2>1. Information We Collect</h2>
                        <p>We collect the following types of information when you register for our swimming pool services:</p>
                        <ul>
                            <li>Personal Information (name, surname, date of birth, gender)</li>
                            <li>Contact Information (email address, phone number)</li>
                            <li>Health Information (medical conditions, allergies, emergency contacts)</li>
                            <li>Identity Documents (ID card)</li>
                            <li>Profile Photos</li>
                        </ul>
                    </section>

                    <section>
                        <h2>2. How We Use Your Information</h2>
                        <p>Your information is used for:</p>
                        <ul>
                            <li>Managing your swimming pool membership</li>
                            <li>Emergency contact purposes</li>
                            <li>Health and safety compliance</li>
                            <li>Communication about services and updates</li>
                            <li>Legal and regulatory compliance</li>
                        </ul>
                    </section>

                    <section>
                        <h2>3. Data Security</h2>
                        <p>We implement appropriate security measures to protect your personal information:</p>
                        <ul>
                            <li>Secure data encryption</li>
                            <li>Regular security assessments</li>
                            <li>Limited staff access to personal data</li>
                            <li>Secure data storage systems</li>
                        </ul>
                    </section>

                    <section>
                        <h2>4. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Access your personal data</li>
                            <li>Request data correction</li>
                            <li>Request data deletion</li>
                            <li>Withdraw consent</li>
                            <li>File a complaint with supervisory authorities</li>
                        </ul>
                    </section>

                    <section>
                        <h2>5. Data Retention</h2>
                        <p>We retain your personal information for as long as necessary to:</p>
                        <ul>
                            <li>Provide our services</li>
                            <li>Comply with legal obligations</li>
                            <li>Resolve disputes</li>
                            <li>Enforce our agreements</li>
                        </ul>
                    </section>

                    <section>
                        <h2>6. Contact Us</h2>
                        <p>For any privacy-related questions or concerns, please contact us at:</p>
                        <div className="contact-info">
                            <p>Email: privacy@swimmingpool.com</p>
                            <p>Phone: +90 123 456 7890</p>
                            <p>Address: Swimming Pool Project, Istanbul, Turkey</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
