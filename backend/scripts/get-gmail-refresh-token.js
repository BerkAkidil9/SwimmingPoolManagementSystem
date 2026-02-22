/**
 * Get Gmail API Refresh Token (one-time)
 *
 * Usage:
 *   1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 *   2. In Google Cloud Console:
 *      - Enable Gmail API
 *      - OAuth consent screen → Scopes → add https://www.googleapis.com/auth/gmail.send
 *      - Credentials → OAuth 2.0 Client → Add http://localhost:3333/oauth2callback to Authorized redirect URIs
 *   3. node scripts/get-gmail-refresh-token.js
 *   4. Browser opens; sign in with Gmail and grant permission
 *   5. Add the displayed GMAIL_REFRESH_TOKEN to .env
 */
require("dotenv").config();
const http = require("http");
const { OAuth2Client } = require("google-auth-library");

const REDIRECT_URI = "http://localhost:3333/oauth2callback";
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env");
    process.exit(1);
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  const codePromise = new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost:3333`);
      if (url.pathname === "/oauth2callback") {
        const code = url.searchParams.get("code");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>Success!</h1><p>You can close this window. Return to the terminal.</p>"
        );
        server.close();
        resolve(code);
      }
    });
    server.listen(3333, () => {
      console.log("\nOpening browser... Sign in with Gmail and grant permission.\n");
      console.log("If it doesn't open, copy this link to your browser:\n");
      console.log(authUrl);
      console.log("\n");
      if (process.platform === "win32") {
        require("child_process").exec(`cmd /c start "" "${authUrl}"`);
      } else if (process.platform === "darwin") {
        require("child_process").exec(`open "${authUrl}"`);
      } else {
        require("child_process").exec(`xdg-open "${authUrl}"`);
      }
    });
    server.on("error", reject);
  });

  const code = await codePromise;
  if (!code) {
    console.error("Error: Authorization code not received.");
    process.exit(1);
  }

  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    console.error("Error: Refresh token not received. Try again with your Gmail account.");
    process.exit(1);
  }

  console.log("\n--- Add to your .env (or update): ---\n");
  console.log(`GMAIL_USER=your@gmail.com`);
  console.log(`GMAIL_REFRESH_TOKEN=${refreshToken}`);
  console.log("\n------------------------------------------\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
