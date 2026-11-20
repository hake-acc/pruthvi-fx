document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('codedAvatarSvg');
    const svgBackground = document.getElementById('svgBackground');
    const developerPath = document.getElementById('developerPath');
    const aspectContainer = document.getElementById('aspectContainer');
    const avatarGroup = document.getElementById('avatarGroup');
    const toast = document.getElementById('toast');

    // Controls
    const btnPaperTexture = document.getElementById('btnPaperTexture');
    const btnParallax = document.getElementById('btnParallax');
    const btnAnimateDraw = document.getElementById('btnAnimateDraw');
    const btnCopySvg = document.getElementById('btnCopySvg');
    const colorBtns = document.querySelectorAll('.color-btn');

    let parallaxEnabled = true;
    let textureEnabled = true;

    // Apply initial paper texture
    developerPath.classList.add('filter-active');

    // 1. Paper Texture Toggle
    btnPaperTexture.addEventListener('click', () => {
        textureEnabled = !textureEnabled;
        btnPaperTexture.classList.toggle('active', textureEnabled);
        developerPath.classList.toggle('filter-active', textureEnabled);
        showToast(textureEnabled ? 'Marker bleed filter enabled' : 'Clean vector lines enabled');
    });

    // 2. Parallax Toggle
    btnParallax.addEventListener('click', () => {
        parallaxEnabled = !parallaxEnabled;
        btnParallax.classList.toggle('active', parallaxEnabled);
        if (!parallaxEnabled) {
            avatarGroup.style.transform = 'none';
        }
        showToast(parallaxEnabled ? '3D Cursor parallax enabled' : 'Parallax disabled');
    });

    // 3. Smooth Mouse Parallax
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    aspectContainer.addEventListener('mousemove', (e) => {
        if (!parallaxEnabled) return;
        const rect = aspectContainer.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

        targetX = x * 25; // max 25px offset
        targetY = y * 18; // max 18px offset
    });

    aspectContainer.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
    });

    function animateParallax() {
        if (parallaxEnabled) {
            currentX += (targetX - currentX) * 0.1;
            currentY += (targetY - currentY) * 0.1;
            avatarGroup.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
        requestAnimationFrame(animateParallax);
    }
    animateParallax();

    // 4. Replay Drawing Animation
    btnAnimateDraw.addEventListener('click', () => {
        developerPath.classList.remove('animating');
        void developerPath.offsetWidth; // trigger reflow
        developerPath.classList.add('animating');
        showToast('Replaying sketch drawing...');
    });

    // 5. Canvas Color / Themes
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const color = btn.getAttribute('data-color');
            const theme = btn.getAttribute('data-theme');

            if (color === 'transparent') {
                svgBackground.setAttribute('fill', 'none');
                aspectContainer.style.background = 'repeating-conic-gradient(#252528 0% 25%, #18181b 0% 50%) 50% / 16px 16px';
                developerPath.setAttribute('fill', '#fce237');
            } else if (theme === 'theme-dark') {
                svgBackground.setAttribute('fill', '#0f0f10');
                aspectContainer.style.background = '#0f0f10';
                developerPath.setAttribute('fill', '#fce237');
            } else if (theme === 'theme-white') {
                svgBackground.setAttribute('fill', '#ffffff');
                aspectContainer.style.background = '#ffffff';
                developerPath.setAttribute('fill', '#111111');
            } else {
                svgBackground.setAttribute('fill', '#fce237');
                aspectContainer.style.background = '#fce237';
                developerPath.setAttribute('fill', '#101010');
            }
        });
    });

    // 6. Copy Raw SVG to Clipboard
    btnCopySvg.addEventListener('click', async () => {
        const svgClone = svg.cloneNode(true);
        // Reset any inline transform on clone
        const cloneGroup = svgClone.querySelector('#avatarGroup');
        if (cloneGroup) cloneGroup.style.transform = '';
        
        const svgString = new XMLSerializer().serializeToString(svgClone);
        try {
            await navigator.clipboard.writeText(svgString);
            showToast('SVG Code copied to clipboard!');
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            showToast('Press Ctrl+C to copy');
        }
    });

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }
});
