import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run():
    print("Starting Playwright with --disable-gpu ...", flush=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            args=['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox']
        )
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        
        page.on('console', lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}", flush=True))
        page.on('pageerror', lambda err: print(f"[BROWSER ERROR] {err}", flush=True))
        
        print("Navigating to https://pruthvi-fx.vercel.app/#ad ...", flush=True)
        await page.goto('https://pruthvi-fx.vercel.app/#ad', wait_until='domcontentloaded')
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/step1_live_admin_gate.png')
        print("Saved step1_live_admin_gate.png", flush=True)
        
        user_input = page.locator('input[type="text"]').first
        pass_input = page.locator('input[type="password"]').first
        btn = page.locator('button[type="submit"]').first
        
        if await user_input.count() > 0:
            print("Entering credentials on live site...", flush=True)
            await user_input.fill('admin@pruthvi-fx.com')
            await pass_input.fill('PruthviAdmin2026!#')
            await page.wait_for_timeout(500)
            await btn.click(force=True)
            await page.wait_for_timeout(3000)
            
        await page.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/step2_live_admin_dashboard.png')
        print("Saved step2_live_admin_dashboard.png", flush=True)
        
        modal = page.locator('[role="dialog"]')
        work_tab = modal.locator('button:has-text("Work & Cats")').first
        await work_tab.click(force=True)
        await page.wait_for_timeout(1000)
        
        thumb_subtab = modal.locator('button:has-text("Thumbnails")').first
        await thumb_subtab.click(force=True)
        await page.wait_for_timeout(1000)
        
        # Select Category: Minecraft
        cat_select = modal.locator('select').first
        await cat_select.select_option(value='minecraft')
        
        # Fill Thumbnail Title
        title_input = modal.locator('input[placeholder*="100 Players"]').first
        await title_input.fill('JJ - Ultimate Fortress Invasion')
        print("Filled title: JJ - Ultimate Fortress Invasion", flush=True)
        
        # Fill Client Name
        client_input = modal.locator('input[placeholder*="SenpaiSpider"]').first
        await client_input.fill('JJ')
        print("Filled client: JJ", flush=True)
        
        # Upload JJ.png
        jj_path = 'C:/Users/Administrator/Downloads/JJ.png'
        print(f"Uploading file {jj_path} (exists={os.path.exists(jj_path)})...", flush=True)
        file_input = modal.locator('input[type="file"]').first
        await file_input.set_input_files(jj_path)
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/step3_live_admin_jj_compressed.png')
        print("Saved step3_live_admin_jj_compressed.png", flush=True)
        
        # Click Add Thumbnail Live
        add_btn = modal.locator('button:has-text("Add Thumbnail Live"), button:has-text("Add Thumbnail")').first
        print("Clicking Add Thumbnail Live...", flush=True)
        await add_btn.click(force=True)
        await page.wait_for_timeout(4000)
        
        await page.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/step4_live_admin_after_submit.png')
        print("Saved step4_live_admin_after_submit.png", flush=True)
        
        # Click View Portfolio to close admin modal
        view_portfolio_btn = modal.locator('button:has-text("View Portfolio")').first
        if await view_portfolio_btn.count() > 0:
            await view_portfolio_btn.click(force=True)
            await page.wait_for_timeout(2000)
            print("Closed admin modal", flush=True)
            
        # Scroll to Work section
        work_sec = page.locator('#work')
        await work_sec.scroll_into_view_if_needed()
        await page.wait_for_timeout(1000)
        
        # Click Minecraft category
        mc_btn = page.locator('#work button:has-text("Minecraft")').first
        if await mc_btn.count() > 0:
            await mc_btn.click(force=True)
            await page.wait_for_timeout(2500)
            print("Opened Minecraft category view", flush=True)
            
        await page.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/step5_live_site_with_jj.png')
        print("Saved step5_live_site_with_jj.png", flush=True)
        
        await browser.close()
        print("Playwright automation finished cleanly!", flush=True)

asyncio.run(run())
