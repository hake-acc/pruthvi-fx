import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        
        # TAB 1: Live portfolio site visitor view
        tab_visitor = await context.new_page()
        tab_visitor.on('console', lambda msg: print(f"[VISITOR CONSOLE] {msg.text}"))
        print("Tab 1: Navigating to live site https://pruthvi-fx.vercel.app/ ...")
        await tab_visitor.goto('https://pruthvi-fx.vercel.app/', wait_until='domcontentloaded')
        await tab_visitor.wait_for_timeout(3000)
        
        # Scroll down to Work section
        work_sec = tab_visitor.locator('#work')
        await work_sec.scroll_into_view_if_needed()
        await tab_visitor.wait_for_timeout(1500)
        
        # Click on Minecraft category in Tab 1 to see existing thumbnails
        cat_btn = tab_visitor.locator('#work button:has-text("Minecraft")').first
        if await cat_btn.count() > 0:
            await cat_btn.click(force=True)
            await tab_visitor.wait_for_timeout(1500)
            
        await tab_visitor.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/live_tab1_before_upload.png')
        print("Tab 1: Captured live_tab1_before_upload.png")
        
        # TAB 2: Live admin panel
        tab_admin = await context.new_page()
        tab_admin.on('console', lambda msg: print(f"[ADMIN CONSOLE] {msg.text}"))
        print("Tab 2: Navigating to https://pruthvi-fx.vercel.app/#ad ...")
        await tab_admin.goto('https://pruthvi-fx.vercel.app/#ad', wait_until='domcontentloaded')
        await tab_admin.wait_for_timeout(3000)
        
        await tab_admin.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/live_tab2_admin_gate.png')
        print("Tab 2: Captured live_tab2_admin_gate.png")
        
        # Fill credentials
        user_input = tab_admin.locator('input[type="text"]').first
        pass_input = tab_admin.locator('input[type="password"]').first
        submit_btn = tab_admin.locator('button[type="submit"]').first
        
        print("Tab 2: Entering admin credentials...")
        await user_input.fill('admin@pruthvi-fx.com')
        await pass_input.fill('PruthviAdmin2026!#')
        await submit_btn.click(force=True)
        await tab_admin.wait_for_timeout(3000)
        
        modal = tab_admin.locator('[role="dialog"]')
        await tab_admin.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/live_tab2_admin_dashboard.png')
        print("Tab 2: Captured live_tab2_admin_dashboard.png")
        
        # Click 'Work & Cats' tab
        work_tab = modal.locator('button:has-text("Work & Cats")').first
        await work_tab.click(force=True)
        await tab_admin.wait_for_timeout(1000)
        
        # Click 'Thumbnails' subtab
        thumb_subtab = modal.locator('button:has-text("Thumbnails")').first
        await thumb_subtab.click(force=True)
        await tab_admin.wait_for_timeout(1000)
        
        # Select category: Minecraft
        cat_select = modal.locator('select').first
        await cat_select.select_option(value='minecraft')
        
        # Fill Thumbnail Title
        title_input = modal.locator('input[placeholder*="100 Players"]').first
        await title_input.fill('JJ - Ultimate Fortress Invasion')
        print("Tab 2: Filled thumbnail title: JJ - Ultimate Fortress Invasion")
        
        # Fill Client Name
        client_input = modal.locator('input[placeholder*="SenpaiSpider"]').first
        await client_input.fill('JJ')
        print("Tab 2: Filled client name: JJ")
        
        # Upload JJ.png from Downloads
        jj_path = 'C:/Users/Administrator/Downloads/JJ.png'
        print(f"Tab 2: Uploading {jj_path} (exists={os.path.exists(jj_path)}) ...")
        file_input = modal.locator('input[type="file"]').first
        await file_input.set_input_files(jj_path)
        
        # Wait for compression & preview
        await tab_admin.wait_for_timeout(2500)
        await tab_admin.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/live_tab2_admin_jj_filled.png')
        print("Tab 2: Captured live_tab2_admin_jj_filled.png")
        
        # Click Add Thumbnail Live
        add_btn = modal.locator('button:has-text("Add Thumbnail Live"), button:has-text("Add Thumbnail")').first
        print("Tab 2: Clicking Add Thumbnail Live...")
        await add_btn.click(force=True)
        await tab_admin.wait_for_timeout(4000)
        
        await tab_admin.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/live_tab2_admin_jj_saved.png')
        print("Tab 2: Captured live_tab2_admin_jj_saved.png")
        
        # SWITCH BACK TO TAB 1 (WITHOUT RELOADING!)
        print("Switching back to Tab 1 to verify instant Firestore live update without page reload...")
        await tab_visitor.bring_to_front()
        # Wait up to 5 seconds for live onSnapshot update to render
        await tab_visitor.wait_for_timeout(3500)
        
        await tab_visitor.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/live_tab1_instant_update.png')
        print("Tab 1: Captured live_tab1_instant_update.png")
        
        # Verify JJ thumbnail text exists in Tab 1
        jj_card = tab_visitor.locator('text=JJ - Ultimate Fortress Invasion')
        count = await jj_card.count()
        print(f"Tab 1 DOM check: Found {count} element(s) with text 'JJ - Ultimate Fortress Invasion'")
        
        await browser.close()
        print("Automation run completed.")

asyncio.run(run())
