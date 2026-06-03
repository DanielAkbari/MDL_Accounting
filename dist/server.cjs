var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_googleapis = require("googleapis");
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
app.use(import_express.default.json({ limit: "5mb" }));
var getSheetsClient = (serviceAccountString, accessToken) => {
  if (accessToken) {
    const auth = new import_googleapis.google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return import_googleapis.google.sheets({ version: "v4", auth });
  }
  if (serviceAccountString) {
    try {
      const credentials = JSON.parse(serviceAccountString);
      const auth = new import_googleapis.google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
      });
      return import_googleapis.google.sheets({ version: "v4", auth });
    } catch (error) {
      throw new Error("Kredensial Service Account tidak valid. Pastikan format JSON benar.");
    }
  }
  throw new Error("Kredensial Google Sheets tidak ditemukan.");
};
var getSheetIdByName = async (sheets, spreadsheetId, sheetName) => {
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.data.sheets.find((s) => s.properties.title === sheetName);
  return sheet ? sheet.properties.sheetId : null;
};
var ensureSheetExists = async (sheets, spreadsheetId, sheetName, headers) => {
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
    if (!serviceAccount && !accessToken || !spreadsheetId) return res.status(400).json({ error: "Missing credentials" });
    const sheets = getSheetsClient(serviceAccount, accessToken);
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    await ensureSheetExists(sheets, spreadsheetId, "Transactions", [
      "id",
      "date",
      "description",
      "type",
      "amount",
      "accountId",
      "accountName",
      "accountCode",
      "unit"
    ]);
    res.json({ success: true, title: response.data.properties?.title });
  } catch (error) {
    const isPermissionError = error.message?.includes("permission") || error.code === 403;
    const errMsg = isPermissionError ? "Google Sheets menolak akses. Pastikan Anda SUDAH membagikan (Share) file Google Sheet tersebut ke alamat email Service Account (client_email) dengan akses Editor." : error.message || "Failed to connect to Google Sheets";
    res.status(500).json({ error: errMsg });
  }
});
app.post("/api/sheets/transactions", async (req, res) => {
  try {
    const { serviceAccount, spreadsheetId, accessToken } = req.body;
    const sheets = getSheetsClient(serviceAccount, accessToken);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Transactions!A2:I"
    });
    const rows = response.data.values || [];
    const transactions = rows.map((row) => ({
      id: row[0] || "",
      date: row[1] || "",
      description: row[2] || "",
      type: row[3],
      amount: parseFloat(row[4]) || 0,
      accountId: row[5] || "",
      accountName: row[6] || "",
      accountCode: row[7] || "",
      unit: row[8] || ""
    }));
    res.json(transactions);
  } catch (error) {
    const isPermissionError = error.message?.includes("permission") || error.code === 403;
    const errMsg = isPermissionError ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor." : error.message || "Failed to fetch transactions";
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
      requestBody: { values }
    });
    res.json({ success: true });
  } catch (error) {
    const isPermissionError = error.message?.includes("permission") || error.code === 403;
    const errMsg = isPermissionError ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor." : error.message || "Failed to add transaction";
    res.status(500).json({ error: errMsg });
  }
});
app.post("/api/sheets/transactions/update", async (req, res) => {
  try {
    const { serviceAccount, spreadsheetId, transaction, accessToken } = req.body;
    const sheets = getSheetsClient(serviceAccount, accessToken);
    const getResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Transactions!A:I" });
    const rows = getResponse.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === transaction.id);
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
      requestBody: { values }
    });
    res.json({ success: true });
  } catch (error) {
    const isPermissionError = error.message?.includes("permission") || error.code === 403;
    const errMsg = isPermissionError ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor." : error.message || "Failed to update transaction";
    res.status(500).json({ error: errMsg });
  }
});
app.post("/api/sheets/transactions/delete", async (req, res) => {
  try {
    const { serviceAccount, spreadsheetId, id, accessToken } = req.body;
    const sheets = getSheetsClient(serviceAccount, accessToken);
    const getResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Transactions!A:A" });
    const rows = getResponse.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === id);
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
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      }
    });
    res.json({ success: true });
  } catch (error) {
    const isPermissionError = error.message?.includes("permission") || error.code === 403;
    const errMsg = isPermissionError ? "Google Sheets menolak akses. Pastikan email Service Account memiliki akses Editor." : error.message || "Failed to delete transaction";
    res.status(500).json({ error: errMsg });
  }
});
if (!process.env.VERCEL) {
  async function startLocalServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await (0, import_vite.createServer)({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      const distPath = import_path.default.join(process.cwd(), "dist");
      app.use(import_express.default.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(import_path.default.join(distPath, "index.html"));
      });
    }
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startLocalServer();
}
var server_default = app;
//# sourceMappingURL=server.cjs.map
