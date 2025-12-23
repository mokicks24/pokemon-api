import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();

// =========================
// Middleware
// =========================
app.use(cors());
app.use(express.json());

// =========================
// Health check
// =========================
app.get("/health", (req, res) => {
  res.json({ status: "API is running" });
});

// =========================
// DB test
// =========================
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// =========================
// CREATE Pokémon
// =========================
app.post("/api/pokemon", async (req, res) => {
  try {
    const { name, nickname, type, level, evolution_line } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = await pool.query(
      `INSERT INTO caught_pokemon
       (name, nickname, type, level, evolution_line)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        nickname || null,
        type || null,
        level || 1,
        evolution_line || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create pokemon" });
  }
});

// =========================
// READ all Pokémon (filter + sort)
// =========================
app.get("/api/pokemon", async (req, res) => {
  try {
    const { type, minLevel } = req.query;

    let query = "SELECT * FROM caught_pokemon";
    const values = [];
    const conditions = [];

    if (type) {
      values.push(type);
      conditions.push(`LOWER(type) = LOWER($${values.length})`);
    }

    if (minLevel) {
      values.push(Number(minLevel));
      conditions.push(`level >= $${values.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY level DESC";

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Pokémon" });
  }
});

// =========================
// GET favorite Pokémon
// =========================
app.get("/api/pokemon/favorites", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM caught_pokemon WHERE is_favorite = true ORDER BY level DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

// =========================
// TOGGLE favorite Pokémon
// =========================
app.patch("/api/pokemon/:id/favorite", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE caught_pokemon
       SET is_favorite = NOT is_favorite
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

// =========================
// READ single Pokémon by ID
// =========================
app.get("/api/pokemon/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM caught_pokemon WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Pokémon" });
  }
});

// =========================
// UPDATE Pokémon
// =========================
app.put("/api/pokemon/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nickname, type, level, evolution_line } = req.body;

    const result = await pool.query(
      `UPDATE caught_pokemon
       SET name = $1,
           nickname = $2,
           type = $3,
           level = $4,
           evolution_line = $5
       WHERE id = $6
       RETURNING *`,
      [name, nickname, type, level, evolution_line, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update pokemon" });
  }
});

// =========================
// DELETE Pokémon
// =========================
app.delete("/api/pokemon/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM caught_pokemon WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    res.json({ message: "Pokemon deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete pokemon" });
  }
});

// =========================
// Root route
// =========================
app.get("/", (req, res) => {
  res.send("Pokemon API is running");
});

// =========================
// Server start
// =========================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});