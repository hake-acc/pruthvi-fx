/**
 * Authentic Lama Lama WebGL2 Pipeline
 * Direct extracted shaders from lamalama.com:
 * - official_shader_0: Vertex Shader (Xi)
 * - official_shader_5: Background Grid & Video Shader (rv) with drawLLLogo
 * - official_backdrop_theme_transition: Section Transition Shader (b) with u_topProgress / u_bottomProgress
 * - official_shader_6 & 7: Fluid mouse cursor vector field (ov, sv)
 */

(function () {
    'use strict';

    const VS_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
out vec2 v_screenUV;
out float v_x;
out float v_y;
out float v_width;
out float v_height;

void main() {
	v_uv = 0.5 * (a_position + 1.0);
	v_screenUV = 0.5 * (a_position + 1.0);
    v_x = 0.0;
    v_y = 0.0;
    v_width = 1.0;
    v_height = 1.0;
    gl_Position = vec4(a_position.xy, 0.0, 1.0);
}
`;
    const FS_GRID_SOURCE = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec2 v_screenUV;
in float v_x;
in float v_y;
in float v_width;
in float v_height;

uniform vec2 u_content_dimensions;
uniform vec2 u_position;
uniform vec2 u_resolution;
uniform float u_render_content;
uniform float u_parallax_progress;
uniform float u_reveal_progress;
uniform float u_transparent;

uniform float u_time;
uniform float u_border;
uniform float u_scale;
uniform float u_scroll;
uniform float u_nogrid;
uniform float u_nogrid_progress;
uniform float u_image_hover;
uniform float u_nocursor;
uniform float u_pixel_size;
uniform float u_distort_content;
uniform float u_mirror;


uniform sampler2D u_content;
uniform sampler2D u_cursor;
uniform vec2 u_size;

uniform vec3 u_theme;
uniform vec3 u_content_theme;
uniform vec3 u_cursor_theme;

out vec4 FragColor;

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.98923445328, 4.137643425614414))) * 43758.54432453);
 }


float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);

    return res*res;
}

mat2 rotation2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);

    return mat2(
        c, -s,
        s, c
    );
}


float checkEqual(float first, float second) {
    float difference = abs(first - second);
    float inverted_number = ceil(1.0 * difference / 20.0);

    return (1.0 - inverted_number);
}



float drawLLLogo(vec2 rect, float opacity, float full) {

    float x = mod(round(mod(rect.x, 1.0) * 4.0 + 0.5 + 1.0), 4.0);
    float y = mod(round(mod(rect.y, 1.0) * 4.0 + 0.5), 4.0);
    // float x = round((mod(rect.x - 0.125, 1.0) - 0.125) * 4.0);
    // float y = round((mod(rect.y - 0.125, 1.0) - 0.125) * 4.0);

    float divider = (7.0 + 9.0 * full);
    float progress = 1.0 / divider;
    float offset = 0.0;

    float output_opacity = 0.0;

    // Opacity
    float block_1 = step(1.0 - opacity, progress * (0.0 + offset));
    float block_2 = step(1.0 - opacity, progress * (1.0 + offset));
    float block_3 = step(1.0 - opacity, progress * (2.0 + offset));
    float block_4 = step(1.0 - opacity, progress * (3.0 + offset));
    float block_5 = step(1.0 - opacity, progress * (4.0 + offset));
    float block_6 = step(1.0 - opacity, progress * (5.0 + offset));
    float block_7 = step(1.0 - opacity, progress * (6.0 + offset));

    // Full
    float block_8 = full * step(1.0 - opacity, progress * (7.0 + offset));
    float block_9 = full * step(1.0 - opacity, progress * (8.0 + offset));
    float block_10 = full * step(1.0 - opacity, progress * (9.0 + offset));
    float block_11 = full * step(1.0 - opacity, progress * (10.0 + offset));
    float block_12 = full * step(1.0 - opacity, progress * (11.0 + offset));
    float block_13 = full * step(1.0 - opacity, progress * (12.0 + offset));
    float block_14 = full * step(1.0 - opacity, progress * (13.0 + offset));
    float block_15 = full * step(1.0 - opacity, progress * (14.0 + offset));
    float block_16 = full * step(1.0 - opacity, progress * (15.0 + offset));

    //
    output_opacity += block_1 * checkEqual(0.0, x) * checkEqual(0.0, y);
    output_opacity += block_2 * checkEqual(0.0, x) * checkEqual(2.0, y);
    output_opacity += block_3 * checkEqual(2.0, x) * checkEqual(1.0, y);
    output_opacity += block_4 * checkEqual(3.0, x) * checkEqual(3.0, y);
    output_opacity += block_5 * checkEqual(1.0, x) * checkEqual(3.0, y);
    output_opacity += block_6 * checkEqual(0.0, x) * checkEqual(1.0, y);
    output_opacity += block_7 * checkEqual(2.0, x) * checkEqual(0.0, y);

    // Full
    output_opacity += block_8 * checkEqual(0.0, x) * checkEqual(3.0, y);
    output_opacity += block_9 * checkEqual(1.0, x) * checkEqual(2.0, y);
    output_opacity += block_10 * checkEqual(3.0, x) * checkEqual(2.0, y);
    output_opacity += block_11 * checkEqual(3.0, x) * checkEqual(0.0, y);
    output_opacity += block_12 * checkEqual(2.0, x) * checkEqual(3.0, y);
    output_opacity += block_13 * checkEqual(2.0, x) * checkEqual(2.0, y);
    output_opacity += block_14 * checkEqual(1.0, x) * checkEqual(0.0, y);
    output_opacity += block_15 * checkEqual(1.0, x) * checkEqual(1.0, y);
    output_opacity += block_16 * checkEqual(3.0, x) * checkEqual(1.0, y);

    return min(1.0, output_opacity);
}

vec4 imageCoverValues(vec2 imageDimensions) {

    float containerRatio = u_size.x / u_size.y;
    float imageRatio = imageDimensions.x / imageDimensions.y;

    float y_difference = max(0.0, (containerRatio - imageRatio) / containerRatio);
    float x_difference = max(0.0, (imageRatio - containerRatio) / imageRatio);

    return vec4(containerRatio, imageRatio, x_difference, y_difference);
}


vec4 imageCover(vec2 uv, vec2 imageDimensions, float columns, float rows) {
    vec2 st = uv;

    float columnsF = columns;
    float rowsF = rows;

    vec4 imageCoverVals = imageCoverValues(imageDimensions);

    st.x /= max(1.0, imageCoverVals.g / imageCoverVals.r);
    st.y /= max(1.0, imageCoverVals.r / imageCoverVals.g);
    st.y += imageCoverVals.a / 2.0;
    st.x += imageCoverVals.b / 2.0;

    columnsF = max(columns, (u_size.x / (u_pixel_size / u_scale)) / (imageCoverVals.r / imageCoverVals.g));
    rowsF = max(rows, (u_size.y / (u_pixel_size / u_scale)) / (imageCoverVals.g / imageCoverVals.r));

    return vec4(st.x, st.y, columnsF, rowsF);
}


vec2 uvResolutionSmall(vec2 st, float columns, float rows, vec2 cp, float xOffsetPosition, float yOffsetPosition) {
    float yDifference = st.y - cp.y;
    yDifference = mod(yDifference * rows * 4.0 , 4.0);
    float xDifference = st.x - cp.x;
    xDifference = mod(xDifference * columns * 4.0, 4.0);

    float yOffset = mod(0.5 + yDifference + yOffsetPosition, 4.0);
    float xOffset = mod(0.5 + xDifference + xOffsetPosition, 4.0);

    float xSmall = (round((st.x) * columns * 4.0 - xOffset) + xOffset) / columns / 4.0;
    float ySmall = (round((st.y) * rows * 4.0 - yOffset) + yOffset) / rows / 4.0;

    return vec2(xSmall, ySmall);
}


void main() {

    vec2 uv = v_uv;
    vec2 screenUV = v_screenUV;

    float scroll = (u_position.y + u_scroll) / u_resolution.y / ((u_size.y) / u_resolution.y);

    vec2 image_uv = uv * 2.0 - 1.0;
    image_uv *= 1.0 / u_scale;
    image_uv.y += u_parallax_progress * (u_scale - 1.0) / 2.0;
    image_uv = (image_uv + 1.0) / 2.0;

    float columns = u_scale * u_size.x / (u_pixel_size);
    float rows = u_scale * u_size.y / (u_pixel_size);

    float fullColumns = u_resolution.x / u_pixel_size;
    float fullRows = u_resolution.y / u_pixel_size;

    float roundedX = (round((uv.x) * columns * 1.0)) / columns / 1.0;
    float roundedY = ((round((uv.y) * rows * 1.0)) * rows) / rows / 1.0;




    vec2 roundedUV = vec2(roundedX, roundedY);
    vec2 uv_resolution = vec2(v_screenUV.x * fullColumns, v_screenUV.y * fullRows);


    // ----------------------------------- Image Cover -----------------------------------

    vec4 imageCoverVal = imageCover(image_uv, u_content_dimensions, columns, rows);
    vec2 st = vec2(imageCoverVal.rg);

    vec2 cp = st;
    vec4 imageCoverVals = imageCoverValues(u_content_dimensions);
    cp.y -= imageCoverVals.a / 2.0;
    cp.x -= imageCoverVals.b / 2.0;
    cp *= u_scale;
    cp.y -= (((u_scale - imageCoverVals.a * u_scale) / 2.0) * u_parallax_progress + 1.0) * (u_scale - 1.0) / 2.0;

    cp.x -= (u_scale - 1.0) / 2.0;
    cp.y += (imageCoverVals.a / 2.0) * (u_scale - 1.0);
    cp.x += (imageCoverVals.b / 2.0) * (u_scale - 1.0);
    cp *= 1.0 / u_scale;



    // ----------------------------------- Vector field -----------------------------------

    float roundedScreenX = round(screenUV.x * fullColumns) / fullColumns;
    float roundedScreenY = round(screenUV.y * fullRows) / fullRows;

    vec2 roundedScreenUV = vec2(roundedScreenX, roundedScreenY);

    vec2 vectorField = texture(u_cursor, roundedScreenUV).rg;

    float x_strength = min(1.0, 4.0 * (1.0 - min(1.0, abs(roundedUV.x * 2.0 - 1.0))));
    float y_strength = min(1.0, 4.0 * (1.0 - min(1.0, abs(roundedUV.y * 2.0 - 1.0))));

    vec2 cursorOffset = vec2(vectorField.rg) * ((0.08 * x_strength * y_strength) + 0.02);



    vec2 gh = st - cursorOffset;

    float x_opacity = 1.0 - ceil(max(0.0, abs(gh.x * 2.0 - 1.0) - 1.0));
    float y_opacity = 1.0 - ceil(max(0.0, abs(gh.y * 2.0 - 1.0) - 1.0));

    columns = imageCoverVal.b;
    rows = imageCoverVal.a;



    // ----------------------------------- Image offset -----------------------------------


    float column_offset = v_x * fullColumns * 4.0;
    float row_offset = v_y * fullRows * 4.0;


    // ----------------------------------- Effect sizing -----------------------------------

    vec2 uv_resolution_small = uvResolutionSmall(st, columns, rows, cp, -column_offset, -row_offset);


    // ----------------------------------- Cursor -----------------------------------

    float cursor_f = 0.0;

    cursor_f += drawLLLogo(uv_resolution, length(vectorField), 0.0) * (1.0 - u_nocursor);


    // ----------------------------------- Image -----------------------------------

    vec2 texture_uv = (u_nogrid * st + (1.0 - u_nogrid) * uv_resolution_small) - cursorOffset * u_distort_content;

    texture_uv.x = u_mirror * (1.0 - texture_uv.x) + (1.0 - u_mirror) * texture_uv.x;


    vec4 tex = u_render_content * (u_reveal_progress * texture(u_content, texture_uv) + (1.0 - u_reveal_progress) * vec4(0.4));
    float imageRGB = (tex.r + tex.g + tex.b) / 3.0;



    // ----------------------------------- Variables -----------------------------------


    vec3 backdrop_colour = u_theme / 255.0;
    vec3 content_colour = u_content_theme / 255.0;
    vec3 cursor_colour = u_cursor_theme / 255.0;


    // ----------------------------------- Draw -----------------------------------

    float f = drawLLLogo(uv_resolution, imageRGB, 1.0 - u_render_content);


    // ----------------------------------- Render -----------------------------------


    vec3 background = vec3(1.0);
    float content_opacity = min(1.0, max(0.0, (f - cursor_f)));
    vec3 content = vec3(content_opacity);
    vec3 nogrid_content = vec3(min(1.0, max(0.0, tex.r - cursor_f)), min(1.0, max(0.0, tex.g - cursor_f)), min(1.0, max(0.0, tex.b - cursor_f)));



    float noise_val = 0.1 * noise(roundedUV * 2.0 * rotation2d(u_time / 20000.0) * 4.0);

    float nogrid_opacity = 1.0 - smoothstep(0.0, 1.0, 1.0 - u_nogrid_progress + noise_val * (1.0 - u_nogrid_progress));

    nogrid_opacity *= u_nogrid;

    nogrid_opacity = drawLLLogo(uv_resolution, nogrid_opacity, 1.0);

    vec3 backdrop = nogrid_opacity * nogrid_content + (1.0 - nogrid_opacity) * content * content_colour;

    float cursor_opacity = min(1.0, max(0.0, (cursor_f)));
    vec3 cursor = vec3(cursor_opacity);


    float backdrop_opacity = nogrid_opacity + (1.0 - nogrid_opacity) * content_opacity + (1.0 - nogrid_opacity) * cursor_opacity;


    vec3 final_pass = backdrop + cursor;

    float final_opacity = ceil(final_pass.r) * ceil(final_pass.g) * ceil(final_pass.b);

         float background_opacity = (1.0 - min(1.0, backdrop_opacity));
    background *= (1.0 - nogrid_opacity) * (1.0 - final_opacity);

    final_opacity = ((1.0 - u_transparent) * background_opacity + backdrop_opacity + cursor_opacity) * ((u_distort_content * (x_opacity * y_opacity)) + (1.0 - u_distort_content));

    FragColor = vec4(backdrop_colour * background_opacity + backdrop + cursor * cursor_colour, final_opacity);
}
`;
    const FS_TRANS_SOURCE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_input;
uniform float u_topProgress;
uniform float u_bottomProgress;
uniform vec2 u_resolution;
uniform float u_pixel_size;




out vec4 FragColor;


float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.98923445328, 4.137643425614414))) * 43758.54432453);
 }


float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);

    return res*res;
}

float checkEqual(float first, float second) {
    float difference = abs(first - second);
    float inverted_number = ceil(1.0 * difference / 20.0);

    return (1.0 - inverted_number);
}



float drawLLLogo(vec2 rect, float opacity, float full, float inverted, float yOffset) {


    float x = mod(round(mod(rect.x, 1.0) * 4.0 + 1.0 + 0.5), 4.0);
    float y = mod(round(mod(rect.y, 1.0) * 4.0 + 0.5 + yOffset), 4.0);

    float divider = (7.0 + 9.0 * full);
    float progress = 1.0 / divider;
    float inverted_offset = 16.0 * inverted;
    float offset = 0.0;

    float output_opacity = 0.0;

    // Opacity
    float block_1 = step(1.0 - opacity, progress * (abs(inverted_offset - 0.0) + offset));
    float block_2 = step(1.0 - opacity, progress * (abs(inverted_offset - 1.0) + offset));
    float block_3 = step(1.0 - opacity, progress * (abs(inverted_offset - 2.0) + offset));
    float block_4 = step(1.0 - opacity, progress * (abs(inverted_offset - 3.0) + offset));
    float block_5 = step(1.0 - opacity, progress * (abs(inverted_offset - 4.0) + offset));
    float block_6 = step(1.0 - opacity, progress * (abs(inverted_offset - 5.0) + offset));
    float block_7 = step(1.0 - opacity, progress * (abs(inverted_offset - 6.0) + offset));

    // Full
    float block_8 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 7.0) + offset));
    float block_9 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 8.0) + offset));
    float block_10 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 9.0) + offset));
    float block_11 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 10.0) + offset));
    float block_12 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 11.0) + offset));
    float block_13 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 12.0) + offset));
    float block_14 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 13.0) + offset));
    float block_15 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 14.0) + offset));
    float block_16 = full * step(1.0 - opacity, progress * (abs(inverted_offset - 15.0) + offset));

    //
    output_opacity += block_1 * checkEqual(0.0, x) * checkEqual(0.0, y);
    output_opacity += block_2 * checkEqual(0.0, x) * checkEqual(2.0, y);
    output_opacity += block_3 * checkEqual(2.0, x) * checkEqual(1.0, y);
    output_opacity += block_4 * checkEqual(3.0, x) * checkEqual(3.0, y);
    output_opacity += block_5 * checkEqual(1.0, x) * checkEqual(3.0, y);
    output_opacity += block_6 * checkEqual(0.0, x) * checkEqual(1.0, y);
    output_opacity += block_7 * checkEqual(2.0, x) * checkEqual(0.0, y);

    // Full
    output_opacity += block_8 * checkEqual(0.0, x) * checkEqual(3.0, y);
    output_opacity += block_9 * checkEqual(1.0, x) * checkEqual(2.0, y);
    output_opacity += block_10 * checkEqual(3.0, x) * checkEqual(2.0, y);
    output_opacity += block_11 * checkEqual(3.0, x) * checkEqual(0.0, y);
    output_opacity += block_12 * checkEqual(2.0, x) * checkEqual(3.0, y);
    output_opacity += block_13 * checkEqual(2.0, x) * checkEqual(2.0, y);
    output_opacity += block_14 * checkEqual(1.0, x) * checkEqual(0.0, y);
    output_opacity += block_15 * checkEqual(1.0, x) * checkEqual(1.0, y);
    output_opacity += block_16 * checkEqual(3.0, x) * checkEqual(1.0, y);

    return min(1.0, output_opacity) * ceil(opacity);
}



void main() {

    float gap = 0.2;


    vec2 uv = v_uv;

    float columns = u_resolution.x / (u_pixel_size);
    float rows = u_resolution.y / (u_pixel_size);

    // grid is half offset top
    // here is centred
    float yOffset = 0.0;//0.5 - mod(rows, 1.0) / 2.0;

    float roundedX = round((uv.x) * columns) / columns;
    float roundedY = round((uv.y + (yOffset / 4.0 / rows)) * rows) / rows;


    // vec2 roundedUV = vec2(roundedX, roundedY);

    float xSmall = (round((uv.x) * columns * 4.0 - 0.5) + 0.5) / columns / 4.0;
    float ySmall = (round((uv.y + (yOffset / 4.0 / rows)) * rows * 4.0 - 0.5) + 0.5) / rows / 4.0;

    vec2 roundedUV = vec2(xSmall, ySmall);


    float noise_val = 0.5 * noise(roundedUV * 2.0 * 4.0);





    // float strength = 0.05;
    float strength = 0.15;
    roundedUV = vec2(roundedUV.x, roundedUV.y * (1.0 - strength * 2.0) + strength + strength * noise_val);



    // roundedUV.y += 0.1 * noise(roundedUV * 3.0 * 4.0);


    vec2 uv_resolution = vec2(uv.x * columns, uv.y * rows);
    // vec2 uv_resolution = vec2(roundedUV.x * columns, roundedUV.y * rows);


    float inverse = step(0.5, (uv.y - u_bottomProgress));

    // ----------------------------------- Opacity -----------------------------------

    float opacity = 0.0;


    // opacity = 1.0 - smoothstep((1.0 + gap) * u_logo_progress - gap, (1.0 + gap) * u_logo_progress, gh.y);
    // opacity = 1.0 - smoothstep((1.0 + gap) * u_topProgress - gap, (1.0 + gap) * u_topProgress, roundedUV.y);
    // opacity -= 1.0 - smoothstep((1.0 + gap) * u_bottomProgress - gap, (1.0 + gap) * u_bottomProgress, roundedUV.y);
    opacity = smoothstep((roundedUV.y * (1.0 - gap)) - gap, (roundedUV.y * (1.0 - gap)), u_topProgress - gap);
    opacity -= smoothstep((roundedUV.y * (1.0 - gap)) - gap, (roundedUV.y * (1.0 - gap)), u_bottomProgress - gap);


    float after_opacity = drawLLLogo(uv_resolution, opacity, 1.0, inverse, yOffset);
    vec4 tex = texture(u_input, uv);



    FragColor = vec4(tex.rgb, after_opacity);
}
`;
    const FS_VEL_INJECT = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec2 v_uv_local;

uniform sampler2D u_velocity;
uniform vec2 u_vector;
uniform vec2 u_cursor;
uniform vec2 u_resolution;

out vec2 FragColor;


void main() {
    float strength = 0.04;
    float radius = 0.04;
    // float radius = 0.1;

    vec2 uv = v_uv;
    vec2 velocity = texture(u_velocity, uv).rg;

    vec2 pq = uv.xy;

    vec2 cursor = u_cursor / u_resolution;
    vec2 correction = cursor - pq.xy;
    correction.x *= u_resolution.x / u_resolution.y;

    float mouse_pct = length(correction);


    // Apply a radial falloff so effect decays with distance
    float influence = exp(-mouse_pct * mouse_pct / (radius * radius));

    // Inject cursor movement into velocity field
    velocity += influence * u_vector * strength;

    FragColor = velocity;
}
`;
    const FS_VEL_DECAY = `#version 300 es
precision highp float;
in vec2 v_uv;

uniform sampler2D u_previous;
uniform float u_delta;

out vec2 FragColor;


void main() {


    float delta = u_delta;
    vec2 uv = v_uv;


    // ---- PREVIOUS -----
    FragColor = texture(u_previous, v_uv).rg * (1.0 - min(0.5, delta / 250.0));
}

`;

    function compileShader(gl, type, src, name) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('GL Error in ' + name + ':', gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return null;
        }
        return s;
    }

    function createProgram(gl, vsSrc, fsSrc, name) {
        const v = compileShader(gl, gl.VERTEX_SHADER, vsSrc, name + '_VS');
        const f = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc, name + '_FS');
        if (!v || !f) return null;
        const p = gl.createProgram();
        gl.attachShader(p, v);
        gl.attachShader(p, f);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error('Program link error in ' + name + ':', gl.getProgramInfoLog(p));
            gl.deleteProgram(p);
            return null;
        }
        return p;
    }

    class LamaLamaGLApp {
        constructor() {
            this.canvas = null;
            this.gl = null;
            this.quadBuffer = null;
            this.gridProgram = null;
            this.transProgram = null;
            this.velInjectProg = null;
            this.velDecayProg = null;

            this.gridFBO = null;
            this.gridTexture = null;

            this.simW = 128;
            this.simH = 128;
            this.simFBO = [null, null];
            this.simTex = [null, null];
            this.simIdx = 0;

            this.video = null;
            this.videoTex = null;
            this.videoReady = false;

            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.GRID_SIZE = 8.0;

            this.mousePos = [window.innerWidth / 2, window.innerHeight / 2];
            this.lastMousePos = [window.innerWidth / 2, window.innerHeight / 2];
            this.mouseVector = [0, 0];
            this.lastMoveTime = 0;

            this.section = null;
            this.topProgress = 1.0;
            this.bottomProgress = 0.0;
            this.inView = false;
            this.startTime = performance.now();
            window._lamaApp = this;

            this.init();
        }

        init() {
            this.createCanvas();
            this.initGL();
            this.setupVideo();
            this.bindEvents();
            this.render();
        }

        createCanvas() {
            let c = document.querySelector('canvas.js-canvas');
            if (!c) {
                c = document.getElementById('lamaCanvas');
            }
            if (!c) {
                c = document.createElement('canvas');
                c.className = 'js-canvas fixed inset-0 w-full h-full pointer-events-none';
                const main = document.querySelector('main#page') || document.body.firstChild;
                if (main && main.parentNode) {
                    main.parentNode.insertBefore(c, main);
                } else {
                    document.body.appendChild(c);
                }
            }
            c.id = 'lamaCanvas';
            c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2;display:block;';
            this.canvas = c;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }

        initGL() {
            const gl = this.canvas.getContext('webgl2', {
                alpha: true,
                antialias: false,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: false
            });
            if (!gl) {
                console.error('WebGL2 not available');
                return;
            }
            this.gl = gl;

            // Fullscreen Quad Buffer
            const quadVertices = new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                 1,  1
            ]);
            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

            // Compile Programs
            this.gridProgram = createProgram(gl, VS_SOURCE, FS_GRID_SOURCE, 'GridProgram');
            this.transProgram = createProgram(gl, VS_SOURCE, FS_TRANS_SOURCE, 'TransProgram');
            this.velInjectProg = createProgram(gl, VS_SOURCE, FS_VEL_INJECT, 'VelInjectProg');
            this.velDecayProg = createProgram(gl, VS_SOURCE, FS_VEL_DECAY, 'VelDecayProg');

            // Setup FBO for Grid
            this.initGridFBO();

            // Setup Vector Field FBOs (Ping-Pong)
            this.initSimFBO();

            // Video Texture
            this.videoTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            // Default 128x128 gentle luminance pattern so there's never a blank frame
            const initialPattern = new Uint8Array(128 * 128 * 4);
            for (let y = 0; y < 128; y++) {
                for (let x = 0; x < 128; x++) {
                    const idx = (y * 128 + x) * 4;
                    const val = Math.floor(128 + 120 * Math.sin(x * 0.12) * Math.cos(y * 0.12));
                    initialPattern[idx] = val;
                    initialPattern[idx + 1] = val;
                    initialPattern[idx + 2] = val;
                    initialPattern[idx + 3] = 255;
                }
            }
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialPattern);
        }

        initGridFBO() {
            const gl = this.gl;
            if (this.gridFBO) gl.deleteFramebuffer(this.gridFBO);
            if (this.gridTexture) gl.deleteTexture(this.gridTexture);

            this.gridFBO = gl.createFramebuffer();
            this.gridTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.gridFBO);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.gridTexture, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        initSimFBO() {
            const gl = this.gl;
            for (let i = 0; i < 2; i++) {
                if (this.simFBO[i]) gl.deleteFramebuffer(this.simFBO[i]);
                if (this.simTex[i]) gl.deleteTexture(this.simTex[i]);

                this.simFBO[i] = gl.createFramebuffer();
                this.simTex[i] = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.simTex[i]);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.simW, this.simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                gl.bindFramebuffer(gl.FRAMEBUFFER, this.simFBO[i]);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.simTex[i], 0);
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        setupVideo() {
            let v = document.querySelector('.ll-section--services video');
            if (!v) {
                v = document.getElementById('servicesBgVideo');
            }
            if (!v) {
                v = document.createElement('video');
                v.id = 'servicesBgVideo';
                const container = document.querySelector('.ll-section--services') || document.body;
                container.appendChild(v);
            }
            v.id = 'servicesBgVideo';
            v.src = '/videos/services-bg.mp4';
            v.autoplay = true;
            v.loop = true;
            v.muted = true;
            v.playsInline = true;
            v.setAttribute('playsinline', '');
            v.setAttribute('webkit-playsinline', '');
            v.setAttribute('muted', '');
            v.preload = 'auto';
            v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.001;pointer-events:none;z-index:-1;';

            const playVideo = () => {
                v.play().then(() => {
                    this.videoReady = true;
                }).catch(() => {});
            };
            playVideo();
            ['click', 'scroll', 'wheel', 'touchstart', 'mousemove'].forEach(ev => {
                window.addEventListener(ev, playVideo, { once: true, passive: true });
            });
            this.video = v;
        }

        bindEvents() {
            window.addEventListener('resize', () => {
                this.width = window.innerWidth;
                this.height = window.innerHeight;
                this.canvas.width = this.width;
                this.canvas.height = this.height;
                this.initGridFBO();
            });

            window.addEventListener('mousemove', (e) => {
                const now = performance.now();
                const dt = Math.max(1, now - this.lastMoveTime);
                const x = e.clientX;
                const y = window.innerHeight - e.clientY;

                this.mouseVector[0] = (x - this.lastMousePos[0]) / dt * 5.0;
                this.mouseVector[1] = (y - this.lastMousePos[1]) / dt * 5.0;

                this.lastMousePos[0] = this.mousePos[0];
                this.lastMousePos[1] = this.mousePos[1];

                this.mousePos[0] = x;
                this.mousePos[1] = y;
                this.lastMoveTime = now;
            });
        }

        updateScroll() {
            if (!this.section) {
                this.section = document.querySelector('.ll-section--services');
            }
            if (!this.section) {
                this.inView = true;
                this.topProgress = 1.0;
                this.bottomProgress = 0.0;
                return;
            }

            const rect = this.section.getBoundingClientRect();
            const vh = window.innerHeight;

            // Is section anywhere near viewport?
            if (rect.bottom < -vh || rect.top > vh * 2) {
                this.inView = false;
                return;
            }
            this.inView = true;

            // Top entry progress: 0 when rect.top == vh, 1 when rect.top <= 0
            if (rect.top >= vh) {
                this.topProgress = 0.0;
            } else if (rect.top <= 0) {
                this.topProgress = 1.0;
            } else {
                this.topProgress = 1.0 - (rect.top / vh);
            }

            // Bottom exit progress: 0 when rect.bottom >= vh, 1 when rect.bottom <= 0
            if (rect.bottom >= vh) {
                this.bottomProgress = 0.0;
            } else if (rect.bottom <= -0.1 * vh) {
                this.bottomProgress = 1.0;
            } else if (rect.bottom < vh) {
                this.bottomProgress = 1.0 - (rect.bottom / vh);
            } else {
                this.bottomProgress = 0.0;
            }
        }

        render() {
            requestAnimationFrame(() => this.render());

            this.updateScroll();
            if (!this.inView || this.topProgress <= 0.001) {
                if (this.canvas) this.canvas.style.opacity = '0';
                return;
            }
            if (this.canvas) this.canvas.style.opacity = '1';

            const gl = this.gl;
            if (!gl) return;

            const time = performance.now() - this.startTime;

            // 1. Update video texture
            if (this.video && this.video.readyState >= 2) {
                gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
            }

            // 2. Step Fluid Simulation (Ping-Pong)
            let readIdx = this.simIdx;
            let writeIdx = 1 - this.simIdx;

            // Decay pass
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.simFBO[writeIdx]);
            gl.viewport(0, 0, this.simW, this.simH);
            gl.useProgram(this.velDecayProg);
            this.bindQuad(this.velDecayProg);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.simTex[readIdx]);
            gl.uniform1i(gl.getUniformLocation(this.velDecayProg, 'u_previous'), 0);
            gl.uniform1f(gl.getUniformLocation(this.velDecayProg, 'u_delta'), 16.6);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // Inject pass
            readIdx = writeIdx;
            writeIdx = 1 - writeIdx;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.simFBO[writeIdx]);
            gl.viewport(0, 0, this.simW, this.simH);
            gl.useProgram(this.velInjectProg);
            this.bindQuad(this.velInjectProg);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.simTex[readIdx]);
            gl.uniform1i(gl.getUniformLocation(this.velInjectProg, 'u_velocity'), 0);
            gl.uniform2f(gl.getUniformLocation(this.velInjectProg, 'u_vector'), this.mouseVector[0], this.mouseVector[1]);
            gl.uniform2f(gl.getUniformLocation(this.velInjectProg, 'u_cursor'), this.mousePos[0], this.mousePos[1]);
            gl.uniform2f(gl.getUniformLocation(this.velInjectProg, 'u_resolution'), this.width, this.height);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            this.simIdx = writeIdx;
            // Dampen mouse vector
            this.mouseVector[0] *= 0.90;
            this.mouseVector[1] *= 0.90;

            // 3. Render Grid Layer to gridFBO
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.gridFBO);
            gl.viewport(0, 0, this.width, this.height);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(this.gridProgram);
            this.bindQuad(this.gridProgram);

            // Bind video to u_content (texture 0)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
            gl.uniform1i(gl.getUniformLocation(this.gridProgram, 'u_content'), 0);

            // Bind fluid to u_cursor (texture 1)
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.simTex[this.simIdx]);
            gl.uniform1i(gl.getUniformLocation(this.gridProgram, 'u_cursor'), 1);

            // Uniforms
            gl.uniform2f(gl.getUniformLocation(this.gridProgram, 'u_content_dimensions'), 1440.0, 1920.0);
            gl.uniform2f(gl.getUniformLocation(this.gridProgram, 'u_position'), 0.0, 0.0);
            gl.uniform2f(gl.getUniformLocation(this.gridProgram, 'u_resolution'), this.width, this.height);
            gl.uniform2f(gl.getUniformLocation(this.gridProgram, 'u_size'), this.width, this.height);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_pixel_size'), this.GRID_SIZE);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_time'), time);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_border'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_scale'), 1.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_scroll'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_nogrid'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_nogrid_progress'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_image_hover'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_nocursor'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_distort_content'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_mirror'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_render_content'), 1.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_parallax_progress'), 0.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_reveal_progress'), 1.0);
            gl.uniform1f(gl.getUniformLocation(this.gridProgram, 'u_transparent'), 0.0);

            // Exact Lama Lama Palette
            gl.uniform3f(gl.getUniformLocation(this.gridProgram, 'u_theme'), 0.0, 0.0, 0.0); // pitch black
            gl.uniform3f(gl.getUniformLocation(this.gridProgram, 'u_content_theme'), 249.0, 244.0, 235.0); // #f9f4eb
            gl.uniform3f(gl.getUniformLocation(this.gridProgram, 'u_cursor_theme'), 249.0, 244.0, 235.0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // 4. Final Transition Pass to Screen
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.width, this.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            gl.useProgram(this.transProgram);
            this.bindQuad(this.transProgram);

            // Bind grid texture to u_input (texture 0)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
            gl.uniform1i(gl.getUniformLocation(this.transProgram, 'u_input'), 0);

            gl.uniform1f(gl.getUniformLocation(this.transProgram, 'u_topProgress'), this.topProgress);
            gl.uniform1f(gl.getUniformLocation(this.transProgram, 'u_bottomProgress'), this.bottomProgress);
            gl.uniform2f(gl.getUniformLocation(this.transProgram, 'u_resolution'), this.width, this.height);
            gl.uniform1f(gl.getUniformLocation(this.transProgram, 'u_pixel_size'), this.GRID_SIZE);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.disable(gl.BLEND);
        }

        bindQuad(prog) {
            const gl = this.gl;
            const posLoc = gl.getAttribLocation(prog, 'a_position');
            if (posLoc !== -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new LamaLamaGLApp());
    } else {
        new LamaLamaGLApp();
    }
})();
