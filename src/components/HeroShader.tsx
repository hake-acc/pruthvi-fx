import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_scale;
  uniform float u_noise;
  uniform vec2 u_resolution;
  varying vec2 vUv;

  float grain(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 centered(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return p;
  }

  mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  vec3 shade(vec2 uv, float time) {
    vec2 q = rot(0.6) * centered(uv) * 2.0 * u_scale;
    float t = time * 0.6;
    float pixel = 2.0 * u_scale / max(u_resolution.y, 1.0);
    vec3 color = mix(u_color2, u_color2 * 0.45, clamp(length(centered(uv)) * 1.3, 0.0, 1.0));
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float bend = mod(fi, 2.0) * 2.0 - 1.0;
      float crease = (fi - 2.5) * 0.4
                   + 0.26 * sin(q.x * (1.05 + 0.12 * fi) + fi * 1.9 + t * (0.25 + 0.05 * fi))
                   + 0.1 * bend * q.x * q.x;
      float s = q.y - crease;
      float pane = smoothstep(-pixel, pixel, s);
      float back = max(s, 0.0);
      float body = exp(-back * 1.7);
      float fresnel = exp(-back * 8.0);
      float rim = exp(-back * 80.0);
      float inner = exp(-pow((back - 0.045) / 0.014, 2.0));
      float bloom = exp(-abs(s) * 20.0);
      vec3 tint = mix(
        u_color1,
        u_color3,
        clamp(fresnel * 0.6 + 0.08 + 0.14 * sin(fi * 2.1 + q.x * 0.8 + t * 0.2), 0.0, 1.0)
      );
      vec3 light = tint * pane * (body * 0.42 + fresnel * 0.4)
                 + u_color3 * (pane * (rim * 0.6 + inner * 0.12) + bloom * 0.1);
      color += light * (1.0 - color);
    }
    return clamp(color, 0.0, 1.0);
  }

  void main() {
    vec3 color = shade(vUv, u_time);
    if (u_noise > 0.001) {
      float g = grain(vUv * 200.0 + u_time * 0.1);
      color *= 1.0 - u_noise * 0.4 + u_noise * g * 0.4;
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [0.86, 0.15, 0.15];
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

interface HeroShaderProps {
  color1?: string;
  color2?: string;
  color3?: string;
  lightColor1?: string;
  lightColor2?: string;
  lightColor3?: string;
  speed?: number;
  scale?: number;
  noise?: number;
  className?: string;
}

export function HeroShader({
  color1 = '#dc2626',
  color2 = '#140909',
  color3 = '#fca5a5',
  lightColor1 = '#fca5a5',
  lightColor2 = '#f5e1e1',
  lightColor3 = '#fff1f2',
  speed = 0.4,
  scale = 1,
  noise = 0.1,
  className = '',
}: HeroShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const configRef = useRef({
    color1,
    color2,
    color3,
    lightColor1,
    lightColor2,
    lightColor3,
    speed,
    scale,
    noise,
  });

  configRef.current = {
    color1,
    color2,
    color3,
    lightColor1,
    lightColor2,
    lightColor3,
    speed,
    scale,
    noise,
  };

  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    redrawRef.current?.();
  }, [color1, color2, color3, lightColor1, lightColor2, lightColor3, scale, noise]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;

    const program = gl.createProgram();
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!program || !vs || !fs) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      time: gl.getUniformLocation(program, 'u_time'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
      color3: gl.getUniformLocation(program, 'u_color3'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      noise: gl.getUniformLocation(program, 'u_noise'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };

    let elapsed = 0;
    let lastTime: number | null = null;
    let rafId = 0;

    const render = (now: number) => {
      const cfg = configRef.current;
      if (lastTime !== null) {
        elapsed += Math.min((now - lastTime) / 1000, 0.1) * cfg.speed;
      }
      lastTime = now;
      resize();

      const isLight = document.documentElement.dataset.theme === 'light';
      gl.uniform1f(uniforms.time, elapsed);
      gl.uniform3fv(uniforms.color1, hexToRgb(isLight ? cfg.lightColor1 : cfg.color1));
      gl.uniform3fv(uniforms.color2, hexToRgb(isLight ? cfg.lightColor2 : cfg.color2));
      gl.uniform3fv(uniforms.color3, hexToRgb(isLight ? cfg.lightColor3 : cfg.color3));
      gl.uniform1f(uniforms.scale, cfg.scale);
      gl.uniform1f(uniforms.noise, cfg.noise);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    redrawRef.current = () => {
      if (reducedMotion) {
        render(performance.now());
      }
    };

    const loop = (now: number) => {
      render(now);
      if (!reducedMotion) {
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    const observer = new ResizeObserver(() => {
      resize();
      if (reducedMotion) render(performance.now());
    });
    observer.observe(canvas);

    return () => {
      redrawRef.current = null;
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
