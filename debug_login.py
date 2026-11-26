import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox', '--disable-gpu'])
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        
        page.on('console', lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: print(f"[PAGE ERROR] {err}"))
        page.on('request', lambda req: print(f"[REQ] {req.method} {req.url}"))
        page.on('response', lambda res: print(f"[RES] {res.status} {res.url}"))
        
        await page.goto('https://pruthvi-fx.vercel.app/#ad', wait_until='domcontentloaded')
        await page.wait_for_timeout(2500)
        
        user_input = page.locator('input[placeholder="Enter admin ID"]')
        pass_input = page.locator('input[placeholder="Enter password"]')
        
        print("user_input count:", await user_input.count())
        print("pass_input count:", await pass_input.count())
        
        await user_input.click()
        await user_input.fill('admin@pruthvi-fx.com')
        
        await pass_input.click()
        await pass_input.fill('PruthviAdmin2026!#')
        
        print("user val:", await user_input.input_value())
        print("pass val:", await pass_input.input_value())
        
        btn = page.locator('button:has-text("Sign In to Dashboard")')
        await btn.click()
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path='C:/Users/Administrator/.gemini/antigravity/brain/5d4fbe82-9e37-4ebc-9b39-deb18f6d9789/debug_after_login_click.png')
        print("Saved debug_after_login_click.png")
        
        await browser.close()

asyncio.run(run())
