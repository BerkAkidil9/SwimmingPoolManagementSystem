/**
 * One-time script to create user4 account
 * Run: node scripts/create-user4.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const USER = {
  email: 'cs401projesi+user4@gmail.com',
  password: 'Z*x*C*v*B*123',
  name: 'User',
  surname: 'Four',
  phone: '05460000004',
  date_of_birth: '1990-01-15',
  gender: 'Male',
  swimming_ability: 'Yes',
};

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash(USER.password, 10);
    
    const [result] = await db.promise().query(
      `INSERT INTO users (
        name, surname, email, password, phone, date_of_birth, gender, swimming_ability,
        terms_accepted, privacy_accepted, marketing_accepted,
        email_verified, verification_status, health_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 1, 'approved', 'pending')`,
      [
        USER.name,
        USER.surname,
        USER.email,
        hashedPassword,
        USER.phone,
        USER.date_of_birth,
        USER.gender,
        USER.swimming_ability,
      ]
    );

    const userId = result.insertId;
    console.log('User created with ID:', userId);

    await db.promise().query(
      `INSERT INTO health_info (
        user_id, blood_type, allergies, chronic_conditions, medications,
        height, weight, emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, has_heart_problems, chest_pain_activity,
        balance_dizziness, other_chronic_disease, prescribed_medication,
        bone_joint_issues, doctor_supervised_activity
      ) VALUES (?, 'O+', NULL, NULL, NULL, 175, 70, 'Emergency Contact', '05551234567', 'Other', 0, 0, 0, 0, 0, 0, 0)`,
      [userId]
    );

    console.log('Health info created.');
    console.log('\n--- Account created successfully ---');
    console.log('Email:', USER.email);
    console.log('Password:', USER.password);
    console.log('You can now login at /login');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('User already exists. Updating password...');
      const hashedPassword = await bcrypt.hash(USER.password, 10);
      await db.promise().query(
        'UPDATE users SET password = ?, email_verified = 1, verification_status = ? WHERE email = ?',
        [hashedPassword, 'approved', USER.email]
      );
      console.log('Password updated. Email:', USER.email, 'Password:', USER.password);
      process.exit(0);
    }
    console.error('Error:', err);
    process.exit(1);
  }
}

createUser();
