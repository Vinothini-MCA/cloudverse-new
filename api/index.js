require("dotenv").config();

const express = require("express");
const crypto = require("crypto");

const {
  DEFAULT_EVENTS,
  DEFAULT_COMMUNITY_MEMBERS,
  DEFAULT_GALLERY_IMAGES,
  DEFAULT_CONTACT,
  DEFAULT_SLIDER_METADATA
} = require("./defaultData");

const collegeData = require("../server/collegeData");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(express.json({ limit: "6mb" }));

// ======================================================
// ENVIRONMENT VARIABLES
// ======================================================

const SUPABASE_URL =
  (process.env.SUPABASE_URL || "").replace(/\/$/, "");

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "site-images";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "";

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "CloudVerse_01";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "CloudVerse_01";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ======================================================
// DEFAULT DATA
// ======================================================

const defaults = {
  events: DEFAULT_EVENTS,

  community: DEFAULT_COMMUNITY_MEMBERS,

  contact: DEFAULT_CONTACT,

  gallery: DEFAULT_GALLERY_IMAGES.map(x => ({
    id: x.id,
    title: x.title,
    category: x.category,
    images: [
      {
        id: `${x.id}_img_1`,
        url: x.url
      }
    ]
  })),

  slider_metadata: DEFAULT_SLIDER_METADATA,

  site_logo:
    "https://api.dicebear.com/7.x/shapes/svg?seed=CloudVerse&backgroundColor=ec4899"
};

// ======================================================
// SUPABASE
// ======================================================

function configured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_SERVICE_ROLE_KEY
  );
}

async function sb(pathname, options = {}) {
  if (!configured()) {
    throw new Error("Supabase is not configured.");
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${pathname}`,
    {
      ...options,

      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,

        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

        "Content-Type":
          "application/json",

        ...(options.headers || {})
      }
    }
  );

  const text = await res.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch (_) {
    data = text;
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error_description ||
      data?.hint ||
      text ||
      `Supabase error ${res.status}`;

    const err = new Error(msg);

    err.status = res.status;

    throw err;
  }

  return data;
}

// ======================================================
// SUPABASE STORAGE UPLOAD
// ======================================================

async function storageUpload(
  filename,
  bytes,
  contentType
) {
  const path =
    `${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}-${filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/` +
    `${encodeURIComponent(STORAGE_BUCKET)}/` +
    `${encodeURIComponent(path)}`,
    {
      method: "POST",

      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,

        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

        "Content-Type":
          contentType ||
          "application/octet-stream",

        "x-upsert": "false"
      },

      body: bytes
    }
  );

  if (!res.ok) {
    const text = await res.text();

    throw new Error(
      `Image upload failed: ${text}`
    );
  }

  return (
    `${SUPABASE_URL}/storage/v1/object/public/` +
    `${encodeURIComponent(STORAGE_BUCKET)}/` +
    `${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`
  );
}

// ======================================================
// SESSION / COOKIE FUNCTIONS
// ======================================================

function parseCookies(req) {
  const out = {};

  for (
    const part of
    (req.headers.cookie || "").split(";")
  ) {
    const i = part.indexOf("=");

    if (i > -1) {
      out[
        part.slice(0, i).trim()
      ] = decodeURIComponent(
        part.slice(i + 1).trim()
      );
    }
  }

  return out;
}

function makeSession(payload) {
  const body =
    Buffer.from(
      JSON.stringify({
        ...payload,

        exp:
          Date.now() +
          1000 * 60 * 60 * 24 * 7
      })
    ).toString("base64url");

  const sig =
    crypto
      .createHmac(
        "sha256",
        SESSION_SECRET ||
        "dev-only-change-me"
      )
      .update(body)
      .digest("base64url");

  return `${body}.${sig}`;
}

function readSession(req) {
  const token =
    parseCookies(req).cv_session;

  if (!token) {
    return null;
  }

  const [body, sig] =
    token.split(".");

  if (!body || !sig) {
    return null;
  }

  const expected =
    crypto
      .createHmac(
        "sha256",
        SESSION_SECRET ||
        "dev-only-change-me"
      )
      .update(body)
      .digest("base64url");

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expected)
      )
    ) {
      return null;
    }
  } catch (_) {
    return null;
  }

  try {
    const payload =
      JSON.parse(
        Buffer.from(
          body,
          "base64url"
        ).toString("utf8")
      );

    if (
      !payload.exp ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch (_) {
    return null;
  }
}

function setSession(res, payload) {
  const proto =
    String(
      res.req?.headers?.[
        "x-forwarded-proto"
      ] ||
      res.req?.protocol ||
      "http"
    )
      .split(",")[0]
      .trim();

  const secure =
    proto === "https"
      ? "; Secure"
      : "";

  res.setHeader(
    "Set-Cookie",

    `cv_session=${encodeURIComponent(
      makeSession(payload)
    )}; Path=/; HttpOnly${secure}; ` +
    `SameSite=Lax; Max-Age=604800`
  );
}

function clearSession(res) {
  res.setHeader(
    "Set-Cookie",

    "cv_session=; Path=/; HttpOnly; " +
    "Secure; SameSite=Lax; Max-Age=0"
  );
}

function requireAdmin(req, res) {
  const session =
    readSession(req);

  if (!session?.isAdmin) {
    res.status(401).json({
      success: false,
      message:
        "Admin authentication required."
    });

    return null;
  }

  return session;
}

// ======================================================
// USER FUNCTIONS
// ======================================================

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(
      `${password}:${
        SESSION_SECRET ||
        "change-me"
      }`
    )
    .digest("hex");
}

function safeUser(row) {
  return {
    username: row.username,
    name: row.name,
    gender: row.gender,
    category: row.category,
    email: row.email,
    phone: row.phone,
    institution: row.institution,
    isAdmin: Boolean(row.is_admin)
  };
}

// ======================================================
// GEMINI / COLLEGE KNOWLEDGE
// ======================================================

const collegeKnowledge =
  JSON.stringify(
    collegeData,
    null,
    2
  );

const SYSTEM_PROMPT = `
You are the official E.G.S. Pillay Engineering College virtual assistant.

Answer ONLY E.G.S. Pillay Engineering College (EGSPEC) related questions.

Use the supplied college knowledge as your main source.

Never invent fees, dates, faculty names, phone numbers, rankings, placement packages, or other facts.

If information is missing, say:

"I couldn't find reliable information about that in the available E.G.S. Pillay Engineering College information. Please check the official EGSPEC website for the latest details."

For unrelated questions, politely explain that you focus on EGSPEC.

Use simple student-friendly language.

Keep simple answers short and detailed answers structured.

Understand follow-up questions from the conversation.

Official website:
https://egspec.org/

COLLEGE KNOWLEDGE:

${collegeKnowledge}
`;

let gemini =
  GEMINI_API_KEY
    ? new GoogleGenerativeAI(
        GEMINI_API_KEY
      )
    : null;

// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
  "/api/health",
  (req, res) =>
    res.json({
      success: true,

      chatbot:
        "EGSPEC Assistant",

      aiConfigured:
        Boolean(gemini),

      databaseConfigured:
        configured(),

      storageBucket:
        STORAGE_BUCKET,

      model:
        GEMINI_MODEL
    })
);

// ======================================================
// WEBSITE STATE
// ======================================================

app.get(
  "/api/state",
  async (req, res) => {
    try {
      if (!configured()) {
        return res.json({
          success: true,
          data: defaults,
          configured: false
        });
      }

      const rows =
        await sb(
          "app_state?select=key,value"
        );

      const data = {
        ...defaults
      };

      for (
        const row of rows || []
      ) {
        if (
          row.key &&
          row.value !== null
        ) {
          data[row.key] =
            row.value;
        }
      }

      res.json({
        success: true,
        data,
        configured: true
      });

    } catch (e) {
       console.error("State load:", e);

      res.status(500).json({
        success: false,
        message: e?.message || String(e)
      });
    }
  }
);

// ======================================================
// UPDATE WEBSITE STATE
// ======================================================

app.put(
  "/api/state/:key",
  async (req, res) => {

    if (!requireAdmin(req, res)) {
      return;
    }

    const allowed =
      new Set([
        "events",
        "community",
        "contact",
        "gallery",
        "slider_metadata",
        "site_logo"
      ]);

    if (
      !allowed.has(
        req.params.key
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid state key."
      });
    }

    if (!configured()) {
      return res.status(503).json({
        success: false,
        message:
          "Supabase is not configured."
      });
    }

    try {
      await sb(
        "app_state",
        {
          method: "POST",

          headers: {
            Prefer:
              "resolution=merge-duplicates,return=minimal"
          },

          body:
            JSON.stringify({
              key:
                req.params.key,

              value:
                req.body.value
            })
        }
      );

      res.json({
        success: true
      });

    } catch (e) {
      console.error(
        "State save:",
        e.message
      );

      res.status(500).json({
        success: false,
        message:
          "Could not save website data."
      });
    }
  }
);

// ======================================================
// IMAGE UPLOAD
// ======================================================

app.post(
  "/api/upload",
  async (req, res) => {

    if (!requireAdmin(req, res)) {
      return;
    }

    if (!configured()) {
      return res.status(503).json({
        success: false,
        message:
          "Supabase is not configured."
      });
    }

    try {
      const {
        filename,
        contentType,
        base64
      } = req.body || {};

      if (
        !filename ||
        !base64
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Image data is missing."
        });
      }

      const bytes =
        Buffer.from(
          String(base64)
            .replace(
              /^data:[^;]+;base64,/,
              ""
            ),
          "base64"
        );

      if (
        !bytes.length ||
        bytes.length >
          4 * 1024 * 1024
      ) {
        return res.status(413).json({
          success: false,
          message:
            "Image is too large. Please choose a smaller image."
        });
      }

      const url =
        await storageUpload(
          filename,
          bytes,
          contentType
        );

      res.json({
        success: true,
        url
      });

    } catch (e) {
      console.error(
        "Upload:",
        e.message
      );

      res.status(500).json({
        success: false,
        message:
          e.message ||
          "Image upload failed."
      });
    }
  }
);

// ======================================================
// CONTACT FORM
// ======================================================

app.post(
  "/api/contact",
  async (req, res) => {

    if (!configured()) {
      return res.status(503).json({
        success: false,
        message:
          "Form storage is not configured."
      });
    }

    try {
      const allowed = [
        "name",
        "email",
        "subject",
        "message"
      ];

      const row = {};

      for (
        const k of allowed
      ) {
        row[k] =
          String(
            req.body?.[k] || ""
          )
            .trim()
            .slice(0, 2000);
      }

      if (
        !row.name ||
        !row.email ||
        !row.message
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and message are required."
        });
      }

      row.created_at =
        new Date().toISOString();

      await sb(
        "contact_submissions",
        {
          method: "POST",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify(row)
        }
      );

      res.json({
        success: true
      });

    } catch (e) {
      console.error(
        "Contact:",
        e.message
      );

      res.status(500).json({
        success: false,
        message:
          "Could not save your message. Please try again."
      });
    }
  }
);

// ======================================================
// STATISTICS
// ======================================================

app.get(
  "/api/stats",
  async (req, res) => {
    try {
      if (!configured()) {
        return res.json({
          success: true,
          userCount: 0
        });
      }

      const rows =
        await sb(
          "app_users?select=id",
          {
            headers: {
              Prefer:
                "count=exact"
            }
          }
        );

      res.json({
        success: true,

        userCount:
          Array.isArray(rows)
            ? rows.length
            : 0
      });

    } catch (e) {
      res.json({
        success: true,
        userCount: 0
      });
    }
  }
);

// ======================================================
// ADMIN USERS
// ======================================================

app.get(
  "/api/admin/users",
  async (req, res) => {

    if (!requireAdmin(req, res)) {
      return;
    }

    if (!configured()) {
      return res.status(503).json({
        success: false,
        message:
          "Account storage is not configured."
      });
    }

    try {
      const rows =
        await sb(
          "app_users?select=username,name,gender,category,email,phone,institution&order=created_at.desc"
        );

      res.json({
        success: true,
        data: rows || []
      });

    } catch (e) {
      console.error(
        "Users:",
        e.message
      );

      res.status(500).json({
        success: false,
        message:
          "Could not load registered users."
      });
    }
  }
);

// ======================================================
// CONTACT SUBMISSIONS
// ======================================================

app.get(
  "/api/contact/submissions",
  async (req, res) => {

    if (!requireAdmin(req, res)) {
      return;
    }

    try {
      const rows =
        await sb(
          "contact_submissions?select=*&order=created_at.desc&limit=200"
        );

      res.json({
        success: true,
        data: rows
      });

    } catch (e) {
      res.status(500).json({
        success: false,
        message:
          "Could not load submissions."
      });
    }
  }
);

// ======================================================
// REGISTER
// ======================================================

app.post(
  "/api/auth/register",
  async (req, res) => {

    if (!configured()) {
      return res.status(503).json({
        success: false,
        message:
          "Account storage is not configured."
      });
    }

    try {
      const fields = [
        "name",
        "gender",
        "category",
        "email",
        "phone",
        "institution"
      ];

      const user = {};

      for (
        const f of fields
      ) {
        user[f] =
          String(
            req.body?.[f] || ""
          )
            .trim()
            .slice(0, 500);
      }

      const password =
        String(
          req.body?.password || ""
        );

      if (
        !user.name ||
        !user.email ||
        password.length < 4
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide your name, email and a password of at least 4 characters."
        });
      }

      const existing =
        await sb(
          `app_users?select=id&email=eq.${encodeURIComponent(
            user.email
          )}&limit=1`
        );

      if (existing?.length) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists."
        });
      }

      const count =
        await sb(
          "app_users?select=id",
          {
            headers: {
              Prefer:
                "count=exact"
            }
          }
        );

      const username =
        `CloudVerse_${String(
          (count?.length || 0) + 2
        ).padStart(2, "0")}`;

      const row = {
        ...user,

        username,

        password_hash:
          hashPassword(password),

        is_admin: false
      };

      await sb(
        "app_users",
        {
          method: "POST",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify(row)
        }
      );

      setSession(
        res,
        {
          username,
          isAdmin: false,
          email: user.email
        }
      );

      res.json({
        success: true,

        user: {
          ...user,
          username,
          isAdmin: false
        }
      });

    } catch (e) {
      console.error(
        "Register:",
        e.message
      );

      res.status(500).json({
        success: false,
        message:
          "Could not create the account."
      });
    }
  }
);

// ======================================================
// LOGIN
// ======================================================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {
      const username =
        String(
          req.body?.username || ""
        ).trim();

      const password =
        String(
          req.body?.password || ""
        );

      // ADMIN LOGIN

      if (
        username ===
          ADMIN_USERNAME &&
        ADMIN_PASSWORD &&
        password ===
          ADMIN_PASSWORD
      ) {
        const admin = {
          username,

          name:
            "CloudVerse Administrator",

          gender: "N/A",

          category: "Staff",

          email:
            "admin@cloudverse.com",

          phone:
            "+91 9944395848",

          institution:
            "E.G.S. Pillay Engineering College",

          isAdmin: true
        };

        setSession(
          res,
          {
            username,
            isAdmin: true,
            email: admin.email
          }
        );

        return res.json({
          success: true,
          user: admin
        });
      }

      if (!configured()) {
        return res.status(503).json({
          success: false,
          message:
            "Account storage is not configured."
        });
      }

      const rows =
        await sb(
          `app_users?select=*&username=eq.${encodeURIComponent(
            username
          )}&limit=1`
        );

      const row =
        rows?.[0];

      if (
        !row ||
        row.password_hash !==
          hashPassword(password)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid username or password."
        });
      }

      setSession(
        res,
        {
          username:
            row.username,

          isAdmin: false,

          email:
            row.email
        }
      );

      res.json({
        success: true,

        user:
          safeUser(row)
      });

    } catch (e) {
      console.error(
        "Login:",
        e.message
      );

      res.status(500).json({
        success: false,
        message:
          "Sign in failed. Please try again."
      });
    }
  }
);

// ======================================================
// FORGOT PASSWORD
// ======================================================

app.post(
  "/api/auth/forgot",
  async (req, res) => {

    if (!configured()) {
      return res.status(503).json({
        success: false,
        message:
          "Account storage is not configured."
      });
    }

    try {
      const email =
        String(
          req.body?.email || ""
        ).trim();

      const password =
        String(
          req.body?.password || ""
        );

      if (
        !email ||
        password.length < 4
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid email and a password of at least 4 characters."
        });
      }

      const rows =
        await sb(
          `app_users?select=id&email=eq.${encodeURIComponent(
            email
          )}&limit=1`
        );

      if (!rows?.length) {
        return res.status(404).json({
          success: false,
          message:
            "Email not found / Check your email"
        });
      }

      await sb(
        `app_users?email=eq.${encodeURIComponent(
          email
        )}`,
        {
          method: "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({
              password_hash:
                hashPassword(
                  password
                )
            })
        }
      );

      res.json({
        success: true
      });

    } catch (e) {
      console.error(
        "Forgot:",
        e.message
      );

      res.status(500).json({
        success: false,
        message:
          "Could not update the password."
      });
    }
  }
);

// ======================================================
// CURRENT USER
// ======================================================

app.get(
  "/api/auth/me",
  async (req, res) => {

    const s =
      readSession(req);

    if (!s) {
      return res.json({
        success: true,
        user: null
      });
    }

    if (s.isAdmin) {
      return res.json({
        success: true,

        user: {
          username:
            s.username,

          name:
            "CloudVerse Administrator",

          gender: "N/A",

          category: "Staff",

          email:
            s.email,

          phone:
            "+91 9944395848",

          institution:
            "E.G.S. Pillay Engineering College",

          isAdmin: true
        }
      });
    }

    try {
      const rows =
        configured()
          ? await sb(
              `app_users?select=*&username=eq.${encodeURIComponent(
                s.username
              )}&limit=1`
            )
          : [];

      res.json({
        success: true,

        user:
          rows?.[0]
            ? safeUser(rows[0])
            : null
      });

    } catch (_) {
      res.json({
        success: true,
        user: null
      });
    }
  }
);

// ======================================================
// UPDATE PROFILE
// ======================================================

app.put(
  "/api/auth/profile",
  async (req, res) => {

    const s =
      readSession(req);

    if (
      !s ||
      s.isAdmin ||
      !configured()
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required."
      });
    }

    try {
      const patch = {
        name:
          String(
            req.body?.name || ""
          )
            .trim()
            .slice(0, 500),

        phone:
          String(
            req.body?.phone || ""
          )
            .trim()
            .slice(0, 100),

        institution:
          String(
            req.body?.institution || ""
          )
            .trim()
            .slice(0, 500)
      };

      await sb(
        `app_users?username=eq.${encodeURIComponent(
          s.username
        )}`,
        {
          method: "PATCH",

          headers: {
            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify(patch)
        }
      );

      const rows =
        await sb(
          `app_users?select=*&username=eq.${encodeURIComponent(
            s.username
          )}&limit=1`
        );

      res.json({
        success: true,

        user:
          safeUser(rows[0])
      });

    } catch (e) {
      res.status(500).json({
        success: false,
        message:
          "Could not update your profile."
      });
    }
  }
);

// ======================================================
// LOGOUT
// ======================================================

app.post(
  "/api/auth/logout",
  (req, res) => {

    clearSession(res);

    res.json({
      success: true
    });
  }
);

// ======================================================
// GEMINI CHATBOT
// ======================================================

app.post(
  "/api/chat",
  async (req, res) => {

    try {

      // Check Gemini configuration

      if (!gemini) {
        return res.status(503).json({
          success: false,

          message:
            "The AI assistant is not configured yet. Add GEMINI_API_KEY in your .env file."
        });
      }

      // Get messages

      let messages =
        Array.isArray(
          req.body?.messages
        )
          ? req.body.messages
          : [];

      // Support simple message format

      if (
        !messages.length &&
        typeof req.body?.message ===
          "string"
      ) {
        messages = [
          ...(
            Array.isArray(
              req.body.history
            )
              ? req.body.history
              : []
          ),

          {
            role: "user",

            content:
              req.body.message
          }
        ];
      }

      // Clean messages

      const clean =
        messages
          .filter(
            m =>
              m &&
              (
                m.role === "user" ||
                m.role === "assistant"
              ) &&
              typeof m.content ===
                "string"
          )
          .slice(-12)
          .map(
            m => ({
              role:
                m.role,

              content:
                m.content
                  .trim()
                  .slice(0, 3000)
            })
          )
          .filter(
            m =>
              m.content
          );

      if (
        !clean.length ||
        !clean.some(
          m =>
            m.role === "user"
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a question."
        });
      }

      const latestUserIndex =
        clean
          .map(
            m => m.role
          )
          .lastIndexOf(
            "user"
          );

      if (
        latestUserIndex < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a question."
        });
      }

      const history =
        clean.slice(
          0,
          latestUserIndex
        );

      // ==================================================
      // NORMALIZE GEMINI HISTORY
      // ==================================================

      const normalized = [];

      for (
        const m of history
      ) {

        const role =
          m.role ===
            "assistant"
            ? "model"
            : "user";

        // Gemini history must begin with user

        if (
          !normalized.length &&
          role === "model"
        ) {
          continue;
        }

        // Merge consecutive same-role messages

        if (
          normalized.length &&
          normalized[
            normalized.length - 1
          ].role === role
        ) {
          normalized[
            normalized.length - 1
          ].parts[0].text +=
            `\n${m.content}`;
        } else {

          normalized.push({
            role,

            parts: [
              {
                text:
                  m.content
              }
            ]
          });
        }
      }

      // History should end with user

      if (
        normalized.length &&
        normalized[
          normalized.length - 1
        ].role === "model"
      ) {
        normalized.pop();
      }

      // ==================================================
      // CREATE GEMINI MODEL
      // ==================================================

      const model =
        gemini.getGenerativeModel({
          model:
            GEMINI_MODEL,

          systemInstruction:
            SYSTEM_PROMPT,

          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 700
          }
        });

      // ==================================================
      // START CHAT
      // ==================================================

      const chat =
        model.startChat({
          history:
            normalized
        });

      const current =
        clean[
          latestUserIndex
        ].content;

      let result;

      // ==================================================
      // SEND MESSAGE
      // ==================================================

      try {

        result =
          await chat.sendMessage(
            current
          );

      } catch (
        firstError
      ) {

        console.error(
          "First Gemini request failed:",
          firstError
        );

        // Retry temporary errors

        if (
  [
    429,
    500,
    502,
    503,
    504
  ].includes(
    Number(firstError?.status)
  )
) {

  let lastError = firstError;

  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {

    const delay =
      2000 * Math.pow(2, attempt - 1);

    await new Promise(
      resolve =>
        setTimeout(resolve, delay)
    );

    try {

      result =
        await chat.sendMessage(
          current
        );

      lastError = null;
      break;

    } catch (retryError) {

      lastError = retryError;

      console.error(
        `Gemini retry ${attempt} failed:`,
        retryError
      );
    }
  }

  if (!result) {
    throw lastError;
  }

} else {

  throw firstError;

  }
}
      // ==================================================
      // GET ANSWER
      // ==================================================

      const answer =
        result.response.text();

      if (
        !answer?.trim()
      ) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      res.json({
        success: true,

        answer:
          answer.trim()
      });

    } catch (e) {

      // ==================================================
      // DEBUG ERROR
      // ==================================================

      console.error(
        "Chat:",
        e
      );

      const errorMessage =
        e?.message ||
        String(e);

      res.status(500).json({
        success: false,

        message:
          errorMessage
      });
    }
  }
);

// ======================================================
// EXPORT APP
// ======================================================

module.exports = app;