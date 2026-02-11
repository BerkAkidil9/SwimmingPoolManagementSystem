const express = require("express");
const router = express.Router();
const db = require("../config/database");

router.get("/pools", async (req, res) => {
  try {
    const [pools] = await db.promise().query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM sessions s 
         WHERE s.pool_id = p.id AND s.type = 'education' AND s.session_date >= CURDATE()) as education_sessions,
        (SELECT COUNT(*) FROM sessions s 
         WHERE s.pool_id = p.id AND s.type = 'free_swimming' AND s.session_date >= CURDATE()) as free_swimming_sessions
      FROM Pools p
    `);
    res.json(pools);
  } catch (err) {
    console.error("Error fetching pools:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
