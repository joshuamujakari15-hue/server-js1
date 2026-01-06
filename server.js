import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import Fuse from "fuse.js";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

// ===== Paths =====
const PUBLIC_DIR = path.join(process.cwd(), "public"); // Correct path to your frontend
const DATA_FILE = path.join(process.cwd(), "trainingData.json");

const ADMIN_KEY = "supersecret123";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "joshuamujakari15@gmail.com";

// ===== Load training data =====
let trainingData = [];
try {
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  trainingData = JSON.parse(data);
} catch (err) {
  console.error("Error loading training data:", err);
}

// ===== Fuse.js setup =====
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  keys: ["patterns"]
};
let fuse = new Fuse(trainingData, fuseOptions);

// ===== Save training data =====
function saveTrainingData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(trainingData, null, 2), "utf-8");
  fuse = new Fuse(trainingData, fuseOptions);
}

// ===== Nodemailer setup =====
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// ===== Chatbot + Contact Form Route =====
app.post("/api/chat", async (req, res) => {
  if (req.body.action === "contact") {
    const name = req.body.name || "Unknown";
    const email = req.body.email || "Not provided";
    const message = req.body.message || "";

    const mailOptions = {
      from: `"JoshWebs Contact" <${process.env.GMAIL_USER}>`,
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
          from: `"JoshWebs" <${process.env.GMAIL_USER}>`,
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
      return res.json({ reply: "❌ Failed to send message. Please try again later." });
    }
  } else {
    // Chatbot logic
    const msg = (req.body.message || "").toLowerCase().trim();
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
          if (!existing.patterns.includes(msg)) existing.patterns.push(msg);
        } else {
          trainingData.push({ patterns: [msg], reply: teach });
        }
        saveTrainingData();
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

// ===== Serve Frontend =====
app.use(express.static(PUBLIC_DIR));

// SPA fallback for frontend routes
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ===== Health Check =====
app.get("/health", (req, res) => {
  res.send("Backend is live and running");
});

// ===== Listen on Render-assigned port =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`✅ JoshWebs full-stack server running on port ${PORT}`)
);
