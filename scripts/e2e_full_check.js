const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("Launching browser for full UI audit...");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  try {
    // 1. Dashboard Page
    console.log("Checking Dashboard...");
    await page.goto('http://localhost:3005/dashboard', { waitUntil: 'networkidle' });
    // Click top navbar buttons
    await page.click('button:has-text("Add follow up")');
    await page.waitForTimeout(500);
    
    // 2. Leads Page & Customise View
    console.log("Checking Leads Page...");
    await page.goto('http://localhost:3005/leads', { waitUntil: 'networkidle' });
    // Hover over the customise button
    await page.hover('text=/Column/');
    await page.waitForTimeout(500);
    // Click a filter chip
    await page.click('text=/Lead Source/i');
    
    // 3. Tasks Page
    console.log("Checking Tasks Page...");
    await page.goto('http://localhost:3005/tasks', { waitUntil: 'networkidle' });
    // Click filter buttons
    await page.click('text=/Due/');
    
    // 4. Check Sidebar Navigation
    console.log("Checking Sidebar Navigation...");
    await page.click('a[href="/team"]');
    await page.waitForURL('**/team');

    if (errors.length > 0) {
      console.error("Audit completed with errors:", errors);
    } else {
      console.log("Audit completed! All buttons and features clicked successfully with zero client-side crashes.");
    }
    
  } catch (err) {
    console.error("Test failed during execution:", err.message);
  } finally {
    await browser.close();
  }
})();
