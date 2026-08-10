import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function runAutonomousAgent() {
  const screenshotsDir = path.resolve(process.cwd(), "artifacts/agent-screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log("🤖 [AI Agent] Starting Autonomous Browser Simulation...");
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 600,
    });
  } catch {
    browser = await chromium.launch({
      headless: false,
      slowMo: 600,
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    // 1. Open App Home
    console.log("🌐 Step 1: Navigating to http://localhost:3001/home...");
    await page.goto("http://localhost:3001/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, "01-home.png") });
    console.log("📸 Saved: 01-home.png");

    // 2. Open New Document via direct navigation or shortcut 'n'
    console.log("✏️ Step 2: Navigating to new document editor...");
    await page.goto("http://localhost:3001/doc/new", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // 3. Type title and content
    const titleEditor = page.locator("[placeholder='Untitled'], [contenteditable='true']").first();
    if (await titleEditor.isVisible()) {
      console.log("✍️ Step 3: Typing title & body autonomously...");
      await titleEditor.click();
      await page.keyboard.type("Dokumen Mandiri AI Agent 🚀");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Dokumen ini dibuat dan diketik secara mandiri oleh AI Browser Agent via Playwright!\n\n- Otonom 1: Navigasi Rute\n- Otonom 2: Input Teks Interaktif\n- Otonom 3: Tangkapan Layar Otomatis");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotsDir, "02-new-doc-created.png") });
      console.log("📸 Saved: 02-new-doc-created.png");
    }

    // 4. Return to Home
    console.log("🏠 Step 4: Returning to Dashboard Home...");
    await page.goto("http://localhost:3001/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, "03-home-final.png") });
    console.log("📸 Saved: 03-home-final.png");

    console.log("🎉 [AI Agent] Autonomous UI navigation & interaction finished successfully!");
  } catch (error) {
    console.error("❌ [AI Agent] Error during execution:", error);
    try {
      await page.screenshot({ path: path.join(screenshotsDir, "error.png") });
    } catch {}
  } finally {
    await browser.close();
  }
}

runAutonomousAgent();
