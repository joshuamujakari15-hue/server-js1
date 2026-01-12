import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Fuse from "fuse.js";
import nodemailer from "nodemailer";

// TODO: Implement rate limiting middleware (npm install express-rate-limit)
// const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Resolve __dirname for ES modules and set static frontend path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

const DATA_FILE = "trainingData.json";
const ADMIN_KEY = process.env.ADMIN_KEY || "supersecret123"; // Use environment variable for security
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "joshuamujakari15@gmail.com";

// Load training data
let trainingData = [];
try {
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  trainingData = JSON.parse(data);
} catch (err) {
  console.error("Error loading training data:", err);
}

// Configure Fuse.js
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: ["patterns"]
};
let fuse = new Fuse(trainingData, fuseOptions);

// Save training data
function saveTrainingData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(trainingData, null, 2), "utf-8");
  fuse = new Fuse(trainingData, fuseOptions);
}

// Nodemailer via SendGrid
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey", // this must literally be the string "apikey"
    pass: process.env.SENDGRID_API_KEY
  }
});

// Chatbot + contact form route
app.post("/api/chat", async (req, res) => {
  // Validate request
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ reply: "Invalid request format" });
  }

  if (req.body.action === "contact") {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const name = (req.body.name || "Unknown").trim();
    const email = (req.body.email || "Not provided").trim();
    const message = (req.body.message || "").trim();

    // Validate required contact fields
    if (!name || !message) {
      return res.json({ reply: "❌ Name and message are required." });
    }

    if (email && email !== "Not provided" && !emailRegex.test(email)) {
      return res.json({ reply: "❌ Please provide a valid email address." });
    }

    const mailOptions = {
      from: `"JoshWebs Contact" <${process.env.ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: "New Contact Message from Website",
      text: `
New contact submission:

Name: ${name}
Email: ${email}

Message:
${message}
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Contact email sent to admin");

      // Auto-reply to customer
      if (email !== "Not provided") {
        const autoReply = {
          from: `"JoshWebs" <${process.env.ADMIN_EMAIL}>`,
          to: email,
          subject: "We received your message – JoshWebs",
          text: `
Hi ${name},

Thank you for contacting JoshWebs! 👋

We’ve received your message and will get back to you as soon as possible.

Your message:
"${message}"

Best regards,
JoshWebs Team
https://joshwebs.com
          `
        };

        await transporter.sendMail(autoReply);
        console.log("✅ Auto-reply sent to customer");
      }

      return res.json({
        reply: "✅ Thank you! Your message has been sent. We’ll contact you soon."
      });

    } catch (error) {
      console.error("❌ Email error:", error);
      return res.json({
        reply: "❌ Failed to send message. Please try again later."
      });
    }
  } else {
    // Chatbot logic - add input validation
    const msg = (req.body.message || "").toLowerCase().trim();
    
    if (!msg) {
      return res.json({ reply: "Please ask me something!" });
    }

    const teach = req.body.teach?.trim();
    const key = req.body.key;

    let reply = "Thanks for contacting JoshWebs! Could you tell me more about your project?";

    const result = fuse.search(msg);

    if (result.length > 0 && result[0].score < 0.4) {
      reply = result[0].item.reply;
    } else if (teach) {
      if (key === ADMIN_KEY) {
        const existing = trainingData.find(item => item.reply === teach);
        if (existing) {
          if (!existing.patterns.includes(msg)) {
            existing.patterns.push(msg);
            saveTrainingData();
          }
        } else {
          trainingData.push({ patterns: [msg], reply: teach });
          saveTrainingData();
        }
        reply = "Got it! I’ve learned something new. Thanks!";
      } else {
        reply = "❌ You are not authorized to teach me.";
      }
    } else {
      reply = "I don’t know that yet. An admin can teach me if needed.";
    }

    res.json({ reply });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Backend is live and running");
});

// Serve frontend static files
app.use(express.static(FRONTEND_DIR));

// SPA fallback: serve index.html for non-API GET requests
app.get("*", (req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  return res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// 404 handler (for API and other missing endpoints)
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Listen on Render-assigned port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`✅ JoshWebs full-stack server running on port ${PORT}`)
);
