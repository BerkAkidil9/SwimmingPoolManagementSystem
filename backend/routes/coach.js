const express = require("express");
const router = express.Router();
const db = require("../config/database");
const path = require("path");
const fs = require("fs");
const { isCoach } = require("../middleware/auth");

// Get list of approved members with their swimming knowledge status
router.get("/members", isCoach, async (req, res) => {
  try {
    const [users] = await db.promise().query(`
      SELECT id, name, surname, swimming_ability
      FROM users
      WHERE role = 'user'
        AND verification_status = 'approved'
        AND health_status = 'approved'
      ORDER BY surname ASC, name ASC
    `);

    res.json(users);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Error fetching members" });
  }
});

// Update swimming knowledge status of a member
router.put("/members/:userId/swimming-status", isCoach, async (req, res) => {
  const { userId } = req.params;
  const { swimming_ability } = req.body;

  const val = String(swimming_ability || "").toLowerCase();
  if (!["yes", "no"].includes(val)) {
    return res.status(400).json({ error: "Invalid swimming ability value" });
  }
  const dbVal = val === "yes" ? "Yes" : "No";

  try {
    const [rows] = await db.promise().query(
      `UPDATE users SET swimming_ability = ? WHERE id = ? RETURNING id`,
      [dbVal, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "Swimming ability updated successfully" });
  } catch (error) {
    console.error("Error updating swimming status:", error);
    res.status(500).json({ error: "Error updating swimming ability" });
  }
});

module.exports = router;
