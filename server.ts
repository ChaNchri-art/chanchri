import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to store spreadsheet ID locally if environment variable isn't set
const SHEET_CONFIG_FILE = path.join(process.cwd(), "sheet_config.json");

function getOAuth2Client() {
  const clientId = process.env.PRIMARY_OAUTH_CLIENT_ID;
  const clientSecret = process.env.PRIMARY_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.PRIMARY_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

let cachedSpreadsheetId: string | null = process.env.SPREADSHEET_ID || null;

if (!cachedSpreadsheetId && fs.existsSync(SHEET_CONFIG_FILE)) {
  try {
    const config = JSON.parse(fs.readFileSync(SHEET_CONFIG_FILE, "utf-8"));
    if (config.spreadsheetId) {
      cachedSpreadsheetId = config.spreadsheetId;
    }
  } catch (e) {
    console.error("Failed to read sheet_config.json", e);
  }
}

async function getOrCreateSpreadsheet(): Promise<{ spreadsheetId: string; url: string }> {
  const auth = getOAuth2Client();
  if (!auth) {
    throw new Error("Google Workspace OAuth credentials not configured.");
  }

  const sheets = google.sheets({ version: "v4", auth });

  if (cachedSpreadsheetId) {
    try {
      // Verify spreadsheet exists and is accessible
      await sheets.spreadsheets.get({ spreadsheetId: cachedSpreadsheetId });
      return {
        spreadsheetId: cachedSpreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${cachedSpreadsheetId}`,
      };
    } catch (err) {
      console.warn("Existing spreadsheet invalid or inaccessible, creating a new one...", err);
      cachedSpreadsheetId = null;
    }
  }

  // Create a new Google Spreadsheet
  const resource = {
    properties: {
      title: "Commandes Cha.Nechri - Store Orders",
    },
    sheets: [
      {
        properties: {
          title: "Commandes",
        },
      },
    ],
  };

  const createRes = await sheets.spreadsheets.create({
    requestBody: resource,
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Failed to obtain spreadsheet ID from Google Sheets API");
  }

  cachedSpreadsheetId = spreadsheetId;

  // Save ID locally
  try {
    fs.writeFileSync(SHEET_CONFIG_FILE, JSON.stringify({ spreadsheetId }, null, 2));
  } catch (err) {
    console.error("Could not write sheet_config.json", err);
  }

  // Initialize Header Row
  const headers = [
    "Date & Heure",
    "N° Commande",
    "Nom du Client",
    "N° Téléphone",
    "Wilaya",
    "Mode Livraison",
    "Adresse / Commune",
    "Articles Commandés",
    "Sous-Total (DA)",
    "Frais Livraison (DA)",
    "Total Général (DA)",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Commandes!A1:K1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers],
    },
  });

  // Optional: Apply header styling (Bold, Gray background)
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.15, green: 0.23, blue: 0.38 }, // Navy blue accent
                  textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
        ],
      },
    });
  } catch (formatErr) {
    console.warn("Header formatting skipped", formatErr);
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

// API Routes
app.get("/api/sheets-info", async (req, res) => {
  try {
    const auth = getOAuth2Client();
    if (!auth) {
      return res.json({
        connected: false,
        message: "OAuth credentials missing. Connect Google Workspace to enable Sheets.",
      });
    }

    const { spreadsheetId, url } = await getOrCreateSpreadsheet();
    return res.json({
      connected: true,
      spreadsheetId,
      url,
    });
  } catch (err: any) {
    console.error("Error in /api/sheets-info:", err);
    return res.status(500).json({
      connected: false,
      error: err?.message || "Failed to retrieve Google Sheet status",
    });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.order_no || !order.customer_name) {
      return res.status(400).json({ success: false, error: "Invalid order payload" });
    }

    const auth = getOAuth2Client();
    if (!auth) {
      console.warn("OAuth credentials not configured. Order received locally but not pushed to Sheets.");
      return res.json({ success: true, sheetUpdated: false, message: "Order processed without Google Sheets integration." });
    }

    const { spreadsheetId, url } = await getOrCreateSpreadsheet();
    const sheets = google.sheets({ version: "v4", auth });

    // Format items string
    const itemsList = Array.isArray(order.items)
      ? order.items.map((i: any) => `${i.name || i.id} (x${i.qty || 1}) - ${i.lineTotal || i.unitPrice || 0} DA`).join("; ")
      : "—";

    const dateStr = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Algiers" });

    const row = [
      dateStr,
      order.order_no || "—",
      order.customer_name || "—",
      order.customer_phone || "—",
      order.wilaya || "—",
      order.delivery_type === "domicile" ? "Domicile" : "Bureau",
      order.address || "—",
      itemsList,
      order.items_total || 0,
      order.shipping_fee || 0,
      order.grand_total || 0,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Commandes!A:K",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });

    console.log(`Order ${order.order_no} successfully appended to Google Sheet ${spreadsheetId}`);
    return res.json({
      success: true,
      sheetUpdated: true,
      spreadsheetId,
      url,
    });
  } catch (err: any) {
    console.error("Failed to append order to Google Sheet:", err);
    return res.status(500).json({
      success: false,
      sheetUpdated: false,
      error: err?.message || "Server error while appending to Google Sheet",
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
