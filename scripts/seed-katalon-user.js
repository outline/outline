/**
 * Crea un API key de prueba para el usuario Esteban en la BD de desarrollo.
 * Uso: node scripts/seed-katalon-user.js
 */
const { Client } = require("pg");
const crypto = require("crypto");

const USER_ID = "732d17be-93c2-485b-bcff-0f6031c767b5";
const KEY_NAME = "katalon-e2e-test";

function randomString(len) {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

function hashSecret(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function main() {
  const client = new Client({
    host: "127.0.0.1",
    port: 5433,
    user: "outlineuser",
    password: "pass",
    database: "outline",
  });

  await client.connect();

  // Insertar Google como proveedor de autenticación si no existe
  const providerId = crypto.randomUUID();
  const nowTs = new Date().toISOString();
  await client.query(
    `INSERT INTO authentication_providers (id, name, "providerId", enabled, "teamId", "createdAt")
     VALUES ($1, 'google', 'google', true, 'a0bfd5db-7557-480f-abfa-fad099b66cf1', $2)
     ON CONFLICT DO NOTHING`,
    [providerId, nowTs]
  );
  console.log("✅ Google auth provider registrado en BD");

  // Borrar key anterior de prueba si existe
  await client.query(`DELETE FROM "apiKeys" WHERE name = $1`, [KEY_NAME]);

  const secret = `ol_api_${randomString(38)}`;
  const secretHash = hashSecret(secret);
  const last4 = secret.slice(-4);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await client.query(
    `INSERT INTO "apiKeys" (id, name, secret, hash, last4, "userId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, KEY_NAME, secret, secretHash, last4, USER_ID, now, now]
  );

  await client.end();

  console.log("\n✅ API Key creado exitosamente");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`TOKEN: ${secret}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nCopia este TOKEN y pégalo en RevisionHistoryFilter.groovy");
  console.log('en la variable: def AUTH_TOKEN = "<pega aqui>"\n');
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
