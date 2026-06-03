import express from "express";
import path from "path";
import { google } from "googleapis";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "5mb" }));

  // Helper to initialize Google Sheets client
  const getSheetsClient = (serviceAccountString?: string, accessToken?: string) => {
    if (accessToken) {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      return google.sheets({ version: "v4", auth });
    }

    if (serviceAccountString) {
      try {
        const credentials = JSON.parse(serviceAccountString);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        return google.sheets({ version: "v4", auth });
      } catch (error) {
        throw new Error("Kredensial Service Account tidak valid. Pastikan format JSON benar.");
      }
    }
    
    throw new Error("Kredensial Google Sheets tidak ditemukan.");
  };

  const getSheetIdByName = async (sheets: any, spreadsheetId: string, sheetName: string) => {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = response.data.sheets.find((s: any) => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
  };

  const ensureSheetExists = async (sheets: any, spreadsheetId: string, sheetName: string, headers: string[]) => {
    const sheetId = await getSheetIdByName(sheets, spreadsheetId, sheetName);
    if (!sheetId) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: sheetName } }
          }]
        }
      });
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] }
      });
    }
  };

  app.post("/api/sheets/test", async (req, res) => {
    try {
      console.log("TEST CONNECTION REQ BODY:", req.body);
      const { serviceAccount, spreadsheetId, accessToken } = req.body;
      if ((!serviceAccount && !accessToken) || !spreadsheetId) return res.status(400).json({ error: "Missing credentials" });
      
      const sheets = getSheetsClient(serviceAccount, accessToken);
      
      // Try to get the spreadsheet metadata to test permissions
      const response = await sheets.spreadsheets.get({ spreadsheetId });
      
      // Ensure Transactions sheet exists
      await ensureSheetExists(sheets, spreadsheetId, "Transactions", [
        "id", "date", "description", "type", "amount", "accountId", "accountName", "accountCode", "unit"
      ]);

      res.json({ success: true, title: response.data.properties?.title });
    } catch (error: any) {
      const isPermissionError = error.message?.includes("permission") || error.code === 403;
      const errMsg = isPermissionError 
        ? "Google Sheets menolak akses. Pastikan Anda SUDAH membagikan (Share) file Google Sheet tersebut ke alamat email Service Account (client_email) dengan akses Editor."
        : error.message || "Failed to connect to Google Sheets";
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/sheets/transactions", async (req, res) => {
    try {
      const { serviceAccount, spreadsheetId, accessToken } = req.body;
      const sheets = getSheetsClient(serviceAccount, accessToken);
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Transactions!A2:I",
      });

      const rows = response.data.values || [];
      const transactions = rows.map((row: any[]) => ({
        id: row[0] || "",
        date: row[1] || "",
        description: row[2] || "",
        type: row[3] as "income" | "expense",
        amount: parseFloat(row[4]) || 0,
        accountId: row[5] || "",
        accountName: row[6] || "",
        accountCode: row[7] || "",
        unit: row[8] || "",
      }));

      res.json(transactions);
    } catch (error: any) {
      const isPermissionError = error.message?.includes("permission") || error.code === 403;
      const errMsg = isPermissionError 
        ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor."
        : error.message || "Failed to fetch transactions";
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/sheets/transactions/add", async (req, res) => {
    try {
      const { serviceAccount, spreadsheetId, transaction, accessToken } = req.body;
      const sheets = getSheetsClient(serviceAccount, accessToken);
      
      const values = [
        [
          transaction.id,
          transaction.date,
          transaction.description,
          transaction.type,
          transaction.amount,
          transaction.accountId || "",
          transaction.accountName || "",
          transaction.accountCode || "",
          transaction.unit || ""
        ]
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Transactions!A:I",
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });

      res.json({ success: true });
    } catch (error: any) {
      const isPermissionError = error.message?.includes("permission") || error.code === 403;
      const errMsg = isPermissionError 
        ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor."
        : error.message || "Failed to add transaction";
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/sheets/transactions/update", async (req, res) => {
    try {
      const { serviceAccount, spreadsheetId, transaction, accessToken } = req.body;
      const sheets = getSheetsClient(serviceAccount, accessToken);
      
      const getResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Transactions!A:I" });
      const rows = getResponse.data.values || [];
      
      const rowIndex = rows.findIndex((row: any[]) => row[0] === transaction.id);
      if (rowIndex === -1) return res.status(404).json({ error: "Transaction not found" });

      const range = `Transactions!A${rowIndex + 1}:I${rowIndex + 1}`;
      const values = [
        [
          transaction.id,
          transaction.date,
          transaction.description,
          transaction.type,
          transaction.amount,
          transaction.accountId || "",
          transaction.accountName || "",
          transaction.accountCode || "",
          transaction.unit || ""
        ]
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });

      res.json({ success: true });
    } catch (error: any) {
      const isPermissionError = error.message?.includes("permission") || error.code === 403;
      const errMsg = isPermissionError 
        ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor."
        : error.message || "Failed to update transaction";
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/sheets/transactions/delete", async (req, res) => {
    try {
      const { serviceAccount, spreadsheetId, id, accessToken } = req.body;
      const sheets = getSheetsClient(serviceAccount, accessToken);
      
      // Get the row index
      const getResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Transactions!A:A" });
      const rows = getResponse.data.values || [];
      const rowIndex = rows.findIndex((row: any[]) => row[0] === id);
      
      if (rowIndex === -1) return res.status(404).json({ error: "Transaction not found" });

      const sheetId = await getSheetIdByName(sheets, spreadsheetId, "Transactions");

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                }
              }
            }
          ]
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      const isPermissionError = error.message?.includes("permission") || error.code === 403;
      const errMsg = isPermissionError 
        ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor."
        : error.message || "Failed to delete transaction";
      res.status(500).json({ error: errMsg });
    }
  });

  // Di Vercel, kita tidak menjalankan app.listen() dan tidak menggunakan Vite Middleware
  // Kita langsung eksport `app` agar Vercel mengenali ini sebagai Serverless Function
  if (!process.env.VERCEL) {
    async function startLocalServer() {
      // Vite middleware for development
      if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
    
    startLocalServer();
  }

  export default app;
