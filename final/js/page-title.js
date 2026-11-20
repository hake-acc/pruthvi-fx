/**
 * Dynamic Tab Title Marquee:
 * When user leaves/blurs the tab, scrolls calling phrases smoothly across the tab title
 * without emojis, so the full text is legible even on narrow tabs.
 * Immediately restores the original title on tab focus/return.
 */
(() => {
    'use strict';

    const ORIGINAL_TITLE = document.title || 'Aarav Pilania — Creative Developer & Motion Designer';

    const CALLING_PHRASES = [
        'Where are you going? Come back!',
        'Hey, don\'t leave me hanging...',
        'Still so much cool craft to explore!',
        'Wait, you haven\'t seen the rest...',
        'Taking a quick break? Come back!',
        'The pixels miss your cursor...',
        'Don\'t go yet, the best part is next!'
    ];

    let tickerInterval = null;
    let lastIdx = -1;

    function getNextPhrase() {
        let idx;
        do {
            idx = Math.floor(Math.random() * CALLING_PHRASES.length);
        } while (idx === lastIdx && CALLING_PHRASES.length > 1);
        lastIdx = idx;
        return CALLING_PHRASES[idx];
    }

    function startMarquee() {
        stopMarquee();
        const phrase = getNextPhrase();
        const fullString = phrase + '   ***   ';
        let offset = 0;

        // Immediately show the start of the phrase
        document.title = fullString;

        tickerInterval = setInterval(() => {
            offset = (offset + 1) % fullString.length;
            document.title = fullString.slice(offset) + fullString.slice(0, offset);
        }, 260);
    }

    function stopMarquee() {
        if (tickerInterval) {
            clearInterval(tickerInterval);
            tickerInterval = null;
        }
        document.title = ORIGINAL_TITLE;
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            startMarquee();
        } else {
            stopMarquee();
        }
    });

    window.addEventListener('blur', () => {
        if (!document.hidden && !tickerInterval) {
            startMarquee();
        }
    });

    window.addEventListener('focus', () => {
        stopMarquee();
    });
})();
