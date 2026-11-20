/**
 * Falling Text Physics Animation using Matter.js (React Bits FallingText)
 * Triggers on scroll when Slide 2 main paragraph touches the navbar bottom line.
 * Words drop under gravity and settle at the level of the bottom dot below the text.
 * Full mouse drag & toss interactivity.
 */
(function () {
    'use strict';

    function init() {
        const container = document.getElementById('bioContainer') || document.querySelector('.text-impact-bio-container');
        const bioText = document.getElementById('bioText') || document.querySelector('.text-impact-bio');
        const bottomDot = document.getElementById('bioBottomDot') || document.querySelector('.bio-bottom-dot');
        const scrollerEl = document.querySelector('.js-scroller');

        if (!container || !bioText || typeof Matter === 'undefined') {
            setTimeout(init, 50);
            return;
        }

        let effectStarted = false;

        function startFallingPhysics() {
            if (effectStarted) return;
            effectStarted = true;
            window._fallingTextStarted = true;

            const { Engine, World, Bodies, Runner, Mouse, MouseConstraint, Body } = Matter;

            const containerRect = container.getBoundingClientRect();
            const bioTextRect = bioText.getBoundingClientRect();
            const width = containerRect.width;

            // Determine exact floor level from bottom dot
            let floorY = containerRect.height - 20;
            if (bottomDot) {
                const dotRect = bottomDot.getBoundingClientRect();
                floorY = dotRect.top - containerRect.top + (dotRect.height / 2);
            }

            const height = floorY;

            // Lock container and bioText dimensions so page layout below doesn't shift or jump
            container.style.minHeight = `${containerRect.height}px`;
            bioText.style.height = `${bioTextRect.height}px`;
            bioText.style.position = 'relative';
            container.style.position = 'relative';

            // Find all word elements
            const wordSpans = Array.from(bioText.querySelectorAll('.bio-word'));
            if (!wordSpans.length) return;

            // Measure each word's initial geometry relative to container
            const wordData = wordSpans.map(elem => {
                const rect = elem.getBoundingClientRect();
                return {
                    elem,
                    x: rect.left - containerRect.left + rect.width / 2,
                    y: rect.top - containerRect.top + rect.height / 2,
                    w: rect.width,
                    h: rect.height
                };
            });

            // Initialize Matter engine with React Bits physics settings
            const engine = Engine.create();
            engine.world.gravity.y = 1.1;

            const boundaryOpts = {
                isStatic: true,
                render: { visible: false }
            };

            // Boundaries: floor at bottom dot level, walls, ceiling
            const floorThickness = 60;
            const floor = Bodies.rectangle(width / 2, floorY + (floorThickness / 2), width * 2.5, floorThickness, boundaryOpts);
            const leftWall = Bodies.rectangle(-25, height / 2, 50, height * 4, boundaryOpts);
            const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height * 4, boundaryOpts);
            const ceiling = Bodies.rectangle(width / 2, -150, width * 2.5, 60, boundaryOpts);

            // Create physical bodies for each word
            const wordBodies = wordData.map(({ elem, x, y, w, h }) => {
                const body = Bodies.rectangle(x, y, w, h, {
                    restitution: 0.68,
                    frictionAir: 0.012,
                    friction: 0.05,
                    frictionStatic: 0.05,
                    density: 0.001
                });

                // Impart organic initial tumble
                Body.setVelocity(body, {
                    x: (Math.random() - 0.5) * 6.0,
                    y: Math.random() * 2.0
                });
                Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1);
                Body.setAngle(body, (Math.random() - 0.5) * 0.12);

                // Switch to absolute positioning
                elem.style.position = 'absolute';
                elem.style.left = `${x}px`;
                elem.style.top = `${y}px`;
                elem.style.transform = 'translate(-50%, -50%)';

                return { elem, body };
            });

            // Interactive mouse constraint (drag & toss words)
            const mouse = Mouse.create(container);
            const mouseConstraint = MouseConstraint.create(engine, {
                mouse,
                constraint: {
                    stiffness: 0.9,
                    render: { visible: false }
                }
            });

            // Prevent browser default drag behavior
            container.addEventListener('dragstart', e => e.preventDefault());

            World.add(engine.world, [
                floor,
                leftWall,
                rightWall,
                ceiling,
                mouseConstraint,
                ...wordBodies.map(wb => wb.body)
            ]);

            const runner = Runner.create();
            Runner.run(runner, engine);

            // Animation update loop
            function updatePhysicsLoop() {
                wordBodies.forEach(({ body, elem }) => {
                    elem.style.left = `${body.position.x}px`;
                    elem.style.top = `${body.position.y}px`;
                    elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
                });
                requestAnimationFrame(updatePhysicsLoop);
            }
            requestAnimationFrame(updatePhysicsLoop);
        }

        window._startFallingPhysics = startFallingPhysics;

        // Trigger condition:
        // As soon as on scrolling, the paragraph touches the exact pixel line that the top navbar shares
        function checkScrollTrigger() {
            if (effectStarted) return;

            const headerEl = document.querySelector('.ll-header .js-menu') ||
                             document.querySelector('.ll-header') ||
                             document.querySelector('header');

            const navbarBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 68;
            const bioRect = bioText.getBoundingClientRect();

            // When the top of the bio text reaches the bottom line of the navbar:
            if (bioRect.top <= navbarBottom) {
                startFallingPhysics();
                window.removeEventListener('scroll', checkScrollTrigger);
                if (scrollerEl) scrollerEl.removeEventListener('scroll', checkScrollTrigger);
            }
        }

        window.addEventListener('scroll', checkScrollTrigger, { passive: true });
        if (scrollerEl) scrollerEl.addEventListener('scroll', checkScrollTrigger, { passive: true });

        // Continuous RAF check to stay perfectly synced with Lenis smooth scroll
        function rafCheck() {
            if (!effectStarted) {
                checkScrollTrigger();
                requestAnimationFrame(rafCheck);
            }
        }
        requestAnimationFrame(rafCheck);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
