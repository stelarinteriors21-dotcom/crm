const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log("Navigating to Dashboard...");
  await page.goto('http://localhost:3005/dashboard', { waitUntil: 'networkidle' });
  
  const artifactDir = 'C:/Users/abhij/.gemini/antigravity/brain/5d682c1b-fb04-4567-9922-9e13294f15fd/scratch';
  
  // 1. Snapshot Dashboard
  await page.screenshot({ path: path.join(artifactDir, 'dashboard-before.png') });
  console.log("Saved dashboard-before.png");

  // 2. Go to Add Lead Page
  console.log("Navigating to Add Lead...");
  await page.goto('http://localhost:3005/add/single', { waitUntil: 'networkidle' });
  
  // Fill the form
  await page.fill('input[name="name"]', 'Test Lead E2E');
  await page.fill('input[name="phone"]', '9998887776');
  await page.click('button:has-text("ADD LEAD")');
  
  console.log("Adding lead...");
  await page.waitForURL('**/leads');
  await page.waitForTimeout(1000); // Wait for animation
  await page.screenshot({ path: path.join(artifactDir, 'leads-grid.png') });
  console.log("Saved leads-grid.png");

  // 3. Go back to Dashboard to see the Banner
  console.log("Navigating to Dashboard to check Banner...");
  await page.goto('http://localhost:3005/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // Wait for render
  await page.screenshot({ path: path.join(artifactDir, 'dashboard-with-banner.png') });
  console.log("Saved dashboard-with-banner.png");

  // 4. Click Accept
  console.log("Accepting lead...");
  await page.click('button:has-text("Accept")');
  await page.waitForTimeout(1000); // Wait for action
  await page.screenshot({ path: path.join(artifactDir, 'dashboard-after-accept.png') });
  console.log("Saved dashboard-after-accept.png");

  await browser.close();
  console.log("Test completed successfully!");
})();
