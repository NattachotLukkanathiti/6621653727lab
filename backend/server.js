const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend")));

// ================== DB ==================
const db = mysql.createConnection({
  host: "mysql",
  user: "test",
  password: "1234",
  database: "testSahagit"
});

db.connect(err => {
  if (err) return console.log(err);
  console.log("MySQL Connected");
});

// ================== SECRET ==================
const ACCESS_SECRET = "secret";
const REFRESH_SECRET = "refresh_secret";

// ================== JWT Middleware ==================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({
      error: { code: "NO_TOKEN", message: "No token", details: {} }
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, ACCESS_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          error: {
            code: "TOKEN_EXPIRED",
            message: "Token expired, please refresh",
            details: {}
          }
        });
      }
      return res.status(401).json({
        error: { code: "INVALID_TOKEN", message: "Invalid token", details: {} }
      });
    }

    req.user = user;
    next();
  });
}

function authorizeRole(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "No permission", details: {} }
      });
    }
    next();
  };
}

// ================== REGISTER ==================
app.post("/users", async (req, res) => {
  const { Username, Password, role } = req.body;

  try {
    const hashed = await bcrypt.hash(Password, 10);
    const id = uuidv4(); // ✅ สร้าง id

    db.query(
      "INSERT INTO users(id,username,password_hash,role) VALUES(?,?,?,?)",
      [id, Username, hashed, role || "DISPATCHER"],
      (err) => {
        if (err) {
          console.log(err); // 🔥 สำคัญ
          return res.status(500).json(err);
        }
        res.json({ message: "Register success" });
      }
    );
  } catch (err) {
    
    res.status(500).json(err);
  }
});
// ================== LOGIN ==================
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err, result) => {

      if (result.length === 0) {
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }

      const user = result[0];

      const match = await bcrypt.compare(password, user.password_hash);

      if (!match) {
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }

      // token...
    }
  );
});
// ================== REFRESH ==================
app.post("/auth/refresh", (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(401).json({
      error: {
        code: "NO_REFRESH",
        message: "No refresh token",
        details: {}
      }
    });
  }

  jwt.verify(refresh_token, REFRESH_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        error: {
          code: "INVALID_REFRESH",
          message: "Refresh token expired, please login again",
          details: {}
        }
      });
    }

    const newAccess = jwt.sign(
      { id: user.id, role: user.role },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ access_token: newAccess });
  });
});

// ================== PROTECTED ROUTES ==================
app.use(authenticateToken);

// DISPATCHER + ADMIN


// ADMIN ONLY
app.delete("/products/:id", authorizeRole(["ADMIN"]), (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM products WHERE id=?", [id], err => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Deleted" });
  });
});

// ================== START ==================
app.listen(8001, () => console.log("Server running on 8001"));