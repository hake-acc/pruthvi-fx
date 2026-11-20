/**
 * Hero Avatar Engine v3.0
 * Uses me.png as the authentic pixel-perfect base artwork.
 * Overlays cursor-tracking eye pupils with line-boil jitter.
 */
(function () {
  'use strict';

  var animCanvas = document.createElement('canvas');
  animCanvas.width = 1920;
  animCanvas.height = 1080;
  var ctx = animCanvas.getContext('2d');

  var portrait = new Image();
  portrait.src = '/images/me.png';
  var portraitReady = false;
  portrait.onload = function() { portraitReady = true; };

  var mouseX = 960, mouseY = 540;
  var curMouseX = 960, curMouseY = 540;
  var frame = 0;
  var lastBoilTime = 0;
  var isRunning = false;
  var animReqId = null;
  var targetHeroBt = null;

  window.addEventListener('mousemove', function(e) {
    mouseX = (e.clientX / window.innerWidth) * 1920;
    mouseY = (e.clientY / window.innerHeight) * 1080;
  }, { passive: true });

  function getJitter(seed) {
    var n = Math.sin(seed * 719.3 + frame * 17.13) * 43758.5453;
    return (n - Math.floor(n) - 0.5) * 1.6;
  }

  // Eye positions measured from me.png (1920x1080 space)
  var LEFT_EYE   = { x: 835,  y: 475 };
  var RIGHT_EYE  = { x: 1015, y: 462 };

  function drawFrame(now) {
    if (!isRunning) return;

    if (now - lastBoilTime > 85) {
      lastBoilTime = now;
      frame = (frame + 1) % 3;
    }

    curMouseX += (mouseX - curMouseX) * 0.07;
    curMouseY += (mouseY - curMouseY) * 0.07;

    var j = getJitter;

    ctx.clearRect(0, 0, 1920, 1080);
    ctx.fillStyle = '#FED500';
    ctx.fillRect(0, 0, 1920, 1080);

    if (portraitReady) {
      ctx.drawImage(portrait, 0, 0, 1920, 1080);
    }

    // Erase the static eye pupils from the image
    ctx.fillStyle = '#FED500';
    ctx.beginPath();
    ctx.ellipse(LEFT_EYE.x + j(1), LEFT_EYE.y + j(2), 28 + j(3), 20 + j(4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(RIGHT_EYE.x + j(5), RIGHT_EYE.y + j(6), 28 + j(7), 20 + j(8), 0, 0, Math.PI * 2);
    ctx.fill();

    // Compute cursor-tracked pupil positions
    var ldx = curMouseX - LEFT_EYE.x;
    var ldy = curMouseY - LEFT_EYE.y;
    var lAngle = Math.atan2(ldy, ldx);
    var lDist = Math.min(11, Math.hypot(ldx, ldy) * 0.018);
    var lPupilX = LEFT_EYE.x + Math.cos(lAngle) * lDist;
    var lPupilY = LEFT_EYE.y + Math.sin(lAngle) * lDist * 0.6;

    var rdx = curMouseX - RIGHT_EYE.x;
    var rdy = curMouseY - RIGHT_EYE.y;
    var rAngle = Math.atan2(rdy, rdx);
    var rDist = Math.min(11, Math.hypot(rdx, rdy) * 0.018);
    var rPupilX = RIGHT_EYE.x + Math.cos(rAngle) * rDist;
    var rPupilY = RIGHT_EYE.y + Math.sin(rAngle) * rDist * 0.6;

    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0a0a';

    // Left upper eyelid arc
    ctx.lineWidth = 7 + j(20);
    ctx.beginPath();
    ctx.moveTo(LEFT_EYE.x - 26 + j(21), LEFT_EYE.y + 7 + j(22));
    ctx.quadraticCurveTo(LEFT_EYE.x + j(23), LEFT_EYE.y - 14 + j(24), LEFT_EYE.x + 26 + j(25), LEFT_EYE.y + 4 + j(26));
    ctx.stroke();

    // Left lower eyelid
    ctx.lineWidth = 4.5 + j(27);
    ctx.beginPath();
    ctx.moveTo(LEFT_EYE.x - 22 + j(28), LEFT_EYE.y + 8 + j(29));
    ctx.quadraticCurveTo(LEFT_EYE.x + j(30), LEFT_EYE.y + 17 + j(31), LEFT_EYE.x + 22 + j(32), LEFT_EYE.y + 8 + j(33));
    ctx.stroke();

    // Right upper eyelid arc
    ctx.lineWidth = 7 + j(34);
    ctx.beginPath();
    ctx.moveTo(RIGHT_EYE.x - 26 + j(35), RIGHT_EYE.y + 7 + j(36));
    ctx.quadraticCurveTo(RIGHT_EYE.x + j(37), RIGHT_EYE.y - 14 + j(38), RIGHT_EYE.x + 26 + j(39), RIGHT_EYE.y + 4 + j(40));
    ctx.stroke();

    // Right lower eyelid
    ctx.lineWidth = 4.5 + j(41);
    ctx.beginPath();
    ctx.moveTo(RIGHT_EYE.x - 22 + j(42), RIGHT_EYE.y + 8 + j(43));
    ctx.quadraticCurveTo(RIGHT_EYE.x + j(44), RIGHT_EYE.y + 17 + j(45), RIGHT_EYE.x + 22 + j(46), RIGHT_EYE.y + 8 + j(47));
    ctx.stroke();

    // Pupils
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(lPupilX + j(50), lPupilY + j(51), 9 + j(52), 11 + j(53), -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rPupilX + j(54), rPupilY + j(55), 9 + j(56), 11 + j(57), 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Push updated texture to WebGL backdrop
    if (targetHeroBt && targetHeroBt.gridLayer) {
      var gl  = targetHeroBt.composer && targetHeroBt.composer.gl;
      var btex = targetHeroBt.backdropItem && targetHeroBt.backdropItem.texture && targetHeroBt.backdropItem.texture.texture;
      if (gl && btex) {
        gl.bindTexture(gl.TEXTURE_2D, btex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, animCanvas);
      }
      targetHeroBt.stepGrid();
    }

    animReqId = requestAnimationFrame(drawFrame);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    animReqId = requestAnimationFrame(drawFrame);
  }

  function hookHeroBackdrop() {
    var page = window.$ && window.$.instances && window.$.instances.get('page');
    if (!page || !page.instances) return false;

    var heroBt = null;
    page.instances.forEach(function(v, k) {
      if (
        (v && v.key && v.key.includes('hero_extended')) ||
        (k && k.dataset && k.dataset.component === 'blocks/backdrop_theme' && k.closest && k.closest('.ll-section--hero_extended'))
      ) {
        heroBt = v;
      }
    });

    if (!heroBt || !heroBt.gridLayer) return false;

    targetHeroBt = heroBt;
    heroBt.inView = true;
    if (heroBt.canvas) heroBt.canvas.add(heroBt);

    heroBt.nogrid = true;
    heroBt.nogrid_progress = 1;
    heroBt.gridLayer.uniforms.set('u_nogrid',             { value: 1 });
    heroBt.gridLayer.uniforms.set('u_nogrid_progress',    { value: 1 });
    heroBt.gridLayer.uniforms.set('u_render_content',     { value: 1 });
    heroBt.gridLayer.uniforms.set('u_reveal_progress',    { value: 1 });
    heroBt.gridLayer.uniforms.set('u_content_dimensions', { value: [1920, 1080] });

    if (heroBt.backdropItem && heroBt.backdropItem.texture) {
      heroBt.backdropItem.texture.player = animCanvas;
      heroBt.gridLayer.uniforms.set('u_content', { value: heroBt.backdropItem.texture });
    } else if (heroBt.composer && heroBt.composer.gl) {
      var gl  = heroBt.composer.gl;
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      if (portraitReady) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, animCanvas);
      }
      heroBt.backdropItem = {
        texture: { texture: tex, player: animCanvas, bufferIndex: 0 },
        width: 1920,
        height: 1080,
        destroy: function() {}
      };
      heroBt.gridLayer.uniforms.set('u_content', { value: heroBt.backdropItem.texture });
    }

    var heroVideo = document.querySelector('.ll-section--hero_extended video');
    if (heroVideo && !heroVideo.paused) heroVideo.pause();

    heroBt.stepGrid();
    return true;
  }

  var hookTries = 0;
  function tryBackdropHook() {
    if (hookHeroBackdrop()) return;
    hookTries++;
    if (hookTries < 80) setTimeout(tryBackdropHook, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { start(); tryBackdropHook(); });
  } else {
    start();
    tryBackdropHook();
  }

  window.addEventListener('load', function() { start(); tryBackdropHook(); });

  window.__heroAvatarEngine = {
    start: start,
    getCanvas: function() { return animCanvas; }
  };
})();
