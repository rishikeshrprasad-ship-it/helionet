const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FIGURES_DIR = path.resolve(__dirname, '..', 'figures');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  if (!fs.existsSync(FIGURES_DIR)) {
    fs.mkdirSync(FIGURES_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    await wait(2500); // Wait for loading screen to complete

    // 1. Landing Page (fig01)
    console.log('Capturing fig01_landing_page.png...');
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig01_landing_page.png') });

    // Click "Run the simulation" to go to Orbit
    console.log('Entering Orbit view...');
    const runBtn = await page.$('button[aria-label="Run the simulation"]');
    if (runBtn) {
      await runBtn.click();
      await wait(2000);
    }

    // 2. Calm Orbit View (fig02)
    console.log('Capturing fig02_orbit_view_calm.png...');
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig02_orbit_view_calm.png') });

    // Scrub timeline to find Watch state or Confirmed state
    // Event markers exist on the timeline track
    const eventMarkerButtons = await page.$$('button[aria-label*="Watch"], button[aria-label*="Warning"], button[aria-label*="Alert"], button[aria-label*="Storm"]');
    console.log(`Found ${eventMarkerButtons.length} event marker buttons`);

    // Let's set timeline hours via evaluate directly on store or slider
    await page.evaluate(() => {
      // Find range input for timeline
      const slider = document.querySelector('input[type="range"][aria-label="Simulation time scrubber"]');
      if (slider) {
        slider.value = '18';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await wait(1500);

    // 3. Watch state (fig03)
    console.log('Capturing fig03_watch_state.png...');
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig03_watch_state.png') });

    // Advance slider to peak storm (e.g. 36h)
    await page.evaluate(() => {
      const slider = document.querySelector('input[type="range"][aria-label="Simulation time scrubber"]');
      if (slider) {
        slider.value = '36';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await wait(1500);

    // 4. Confirmed State (fig04)
    console.log('Capturing fig04_confirmed_state.png...');
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig04_confirmed_state.png') });

    // 6. Satellites Decaying & Rerouted (fig06)
    // Switch to Constellation tab if present
    const constellationTab = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Constellation'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    await wait(1500);
    console.log('Capturing fig06_satellites_decaying_rerouted.png...');
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig06_satellites_decaying_rerouted.png') });

    // Switch back to Overview
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Overview'));
      if (btn) btn.click();
    });
    await wait(800);

    // 7. Alert Card cropped (fig07)
    console.log('Capturing fig07_alert_card_statuses.png...');
    const alertCardEl = await page.$('aside[aria-label="Storm Alert Summary"], [data-testid="alert-card"], aside');
    if (alertCardEl) {
      await alertCardEl.screenshot({ path: path.join(FIGURES_DIR, 'fig07_alert_card_statuses.png') });
    } else {
      // Fallback: take viewport clip
      await page.screenshot({
        path: path.join(FIGURES_DIR, 'fig07_alert_card_statuses.png'),
        clip: { x: 24, y: 70, width: 340, height: 450 }
      });
    }

    // 8. Forecast Panel badge (fig08)
    console.log('Capturing fig08_forecast_panel_badge.png...');
    const forecastHeader = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('button, header, div'));
      const forecast = headers.find(h => h.textContent && h.textContent.includes('Forecast'));
      if (forecast) {
        forecast.click();
        return true;
      }
      return false;
    });
    await wait(1000);
    const forecastEl = await page.$('aside[aria-label="Space Weather Forecast"], [data-testid="forecast-panel"]');
    if (forecastEl) {
      await forecastEl.screenshot({ path: path.join(FIGURES_DIR, 'fig08_forecast_panel_badge.png') });
    } else {
      await page.screenshot({
        path: path.join(FIGURES_DIR, 'fig08_forecast_panel_badge.png'),
        clip: { x: 1440 - 350, y: 70, width: 330, height: 480 }
      });
    }

    // 13. Timeline markers (fig13)
    console.log('Capturing fig13_timeline_markers.png...');
    const timelineEl = await page.$('nav[aria-label="Simulation playback and timeline"], [data-testid="timeline-panel"], footer');
    if (timelineEl) {
      await timelineEl.screenshot({ path: path.join(FIGURES_DIR, 'fig13_timeline_markers.png') });
    } else {
      await page.screenshot({
        path: path.join(FIGURES_DIR, 'fig13_timeline_markers.png'),
        clip: { x: 300, y: 900 - 100, width: 840, height: 90 }
      });
    }

    // 12. Validation View (fig12)
    console.log('Capturing fig12_validation_view.png...');
    // Open Validation modal from menu
    await page.evaluate(() => {
      const menuTrigger = document.querySelector('[data-testid="topbar-menu-trigger"]');
      if (menuTrigger) (menuTrigger).click();
    });
    await wait(500);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const valBtn = buttons.find(b => b.textContent && b.textContent.includes('Validation'));
      if (valBtn) valBtn.click();
    });
    await wait(1200);
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig12_validation_view.png') });

    // Close validation modal
    await page.keyboard.press('Escape');
    await wait(500);

    // 9 & 10: Moon Surface view & Dose Panel
    console.log('Navigating to Moon surface view...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const moonBtn = buttons.find(b => b.textContent && (b.textContent.includes('Go to the Moon') || b.textContent.includes('Moon')));
      if (moonBtn) moonBtn.click();
    });
    await wait(3000); // 1.8s flight + load

    // 9. Moon Surface Rover Route (fig09)
    console.log('Capturing fig09_moon_surface_rover_route.png...');
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig09_moon_surface_rover_route.png') });

    // 10. Dose Panel Rising (fig10)
    console.log('Capturing fig10_dose_panel_rising.png...');
    const doseEl = await page.$('aside[aria-label*="Dose"], [data-testid="dose-meter"]');
    if (doseEl) {
      await doseEl.screenshot({ path: path.join(FIGURES_DIR, 'fig10_dose_panel_rising.png') });
    } else {
      await page.screenshot({
        path: path.join(FIGURES_DIR, 'fig10_dose_panel_rising.png'),
        clip: { x: 1440 - 350, y: 70, width: 330, height: 420 }
      });
    }

    // 5. Phone Bottom Sheet (fig05: 390x844)
    console.log('Capturing fig05_phone_bottom_sheet.png at 390x844...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    // Go to orbit on phone
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await wait(2000);
    const phoneRunBtn = await page.$('button[aria-label="Run the simulation"]');
    if (phoneRunBtn) {
      await phoneRunBtn.click();
      await wait(2000);
    }
    await page.screenshot({ path: path.join(FIGURES_DIR, 'fig05_phone_bottom_sheet.png') });

    console.log('All browser screenshots successfully captured!');
  } catch (err) {
    console.error('Error during capture:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
