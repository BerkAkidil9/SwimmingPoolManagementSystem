/**
 * Gmail API için Refresh Token alma script (tek seferlik)
 *
 * Çalıştırma:
 *   1. .env'de GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET dolu olmalı
 *   2. Google Cloud Console'da:
 *      - Gmail API etkinleştir
 *      - OAuth consent screen → Scopes → https://www.googleapis.com/auth/gmail.send ekle
 *      - Credentials → OAuth 2.0 Client → Authorized redirect URIs'ye http://localhost:3333/oauth2callback ekle
 *   3. node scripts/get-gmail-refresh-token.js
 *   4. Tarayıcı açılacak, Gmail hesabınla giriş yap ve izin ver
 *   5. Çıkan GMAIL_REFRESH_TOKEN değerini .env'e ekle
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
    console.error("Hata: .env'de GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET tanımlı olmalı.");
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
          "<h1>Başarılı!</h1><p>Bu pencereyi kapatabilirsin. Terminale dön.</p>"
        );
        server.close();
        resolve(code);
      }
    });
    server.listen(3333, () => {
      console.log("\nTarayıcı açılıyor... Gmail hesabınla giriş yap ve izin ver.\n");
      console.log("Açılmazsa bu linki kopyalayıp tarayıcıya yapıştır:\n");
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
    console.error("Hata: Authorization code alınamadı.");
    process.exit(1);
  }

  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    console.error("Hata: Refresh token alınamadı. Gmail hesabınla tekrar dene.");
    process.exit(1);
  }

  console.log("\n--- .env dosyana ekle (veya güncelle): ---\n");
  console.log(`GMAIL_USER=senin@gmail.com`);
  console.log(`GMAIL_REFRESH_TOKEN=${refreshToken}`);
  console.log("\n------------------------------------------\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
