var e=`#version 300 es
in vec2 a_position;
uniform vec2 u_resolution;
uniform vec2 u_position;
uniform float u_scroll;
uniform float u_border;
uniform vec2 u_size;

out vec2 v_uv;
out vec2 v_uv_inset;
out vec2 v_screenUV;


void main() {

    v_uv_inset = 0.5 * (a_position + 1.0); // UV

    float width = u_size.x / u_resolution.x;
    float height = u_size.y / u_resolution.y;
    float x = -1.0 + width + 2.0 * (u_position.x / u_resolution.x);
    float y = 1.0 - height + 2.0 * ((-u_position.y + u_scroll) / u_resolution.y);
    vec2 n_position = vec2(width * a_position.x + x, height * a_position.y + y);

    float b_width = (u_border * 2.0 + u_size.x) / u_resolution.x;
    float b_height = (u_border * 2.0 + u_size.y) / u_resolution.y;

    float b_x = -1.0 + b_width + 2.0 * ((-u_border + u_position.x) / u_resolution.x);
    float b_y = 1.0 - b_height + 2.0 * ((-(-u_border + u_position.y) + u_scroll) / u_resolution.y);
    vec2 b_position = vec2(b_width * a_position.x + b_x, b_height * a_position.y + b_y);

    float x_border_ratio = ((u_border * 2.0 + u_size.x) / u_resolution.x) / width;
    float y_border_ratio = ((u_border * 2.0 + u_size.y) / u_resolution.y) / height;

    v_uv = 0.5 * (vec2(a_position.x * x_border_ratio, a_position.y * y_border_ratio) + 1.0); // UV
    v_screenUV = (vec2((width + u_border * 2.0 / u_resolution.x) * a_position.x + x, (height + u_border * 2.0 / u_resolution.y) * a_position.y + y) + 1.0) / 2.0;


    gl_Position = vec4(b_position.xy, 0.0, 1.0);
}
`,t=`#version 300 es
precision highp float;
in vec2 v_uv;
in vec2 v_screenUV;
uniform float u_time;
uniform float u_pixel_size;
uniform float u_border;
uniform float u_hover;
uniform float u_nocursor;

uniform float u_reveal_progress;
uniform float u_parallax_progress;
uniform float u_scale;
uniform float u_invert;
uniform float u_distort_content;
uniform float u_gap;

uniform vec2 u_resolution;
uniform vec2 u_content_dimensions;
uniform vec2 u_size;
uniform vec2 u_cursor_hover;
uniform vec3 u_content_theme;
uniform sampler2D u_grid;
uniform sampler2D u_content;
uniform sampler2D u_cursor;
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


vec4 imageCover(vec2 uv, vec2 imageDimensions, float columns, float rows) {
    vec2 st = uv;

    float columnsF = columns;
    float rowsF = rows;

    float containerRatio = u_size.x / u_size.y;
    float imageRatio = imageDimensions.x / imageDimensions.y;

    st.x /= max(1.0, imageRatio / containerRatio);
    st.y /= max(1.0, containerRatio / imageRatio);

    float y_difference = max(0.0, (containerRatio - imageRatio) / containerRatio);
    float x_difference = max(0.0, (imageRatio - containerRatio) / imageRatio);

    st.y += y_difference / 2.0;
    st.x += x_difference / 2.0;

    columnsF = max(columns, (u_size.x / u_pixel_size) / (containerRatio / imageRatio));
    rowsF = max(rows, (u_size.y / u_pixel_size) / (imageRatio / containerRatio));

    return vec4(st.x, st.y, columnsF, rowsF);
}


void main() {

    vec2 uv = v_uv;

    float scale = u_scale;//1.3;


    float columns = u_size.x / u_pixel_size;
    float rows = u_size.y / u_pixel_size;
        float fullColumns = u_resolution.x / u_pixel_size;
    float fullRows = u_resolution.y / u_pixel_size;

    float roundedX = round((uv.x) * columns * 1.0) / columns / 1.0;
    float roundedY = round((uv.y) * rows * 1.0) / rows / 1.0;

    vec2 roundedUV = vec2(roundedX, roundedY);


    // ----------------------------------- Hover -----------------------------------

    float roundedScreenX = round(v_screenUV.x * fullColumns) / fullColumns;
    float roundedScreenY = round(v_screenUV.y * fullRows) / fullRows;

    vec2 roundedScreenUV = vec2(roundedScreenX, roundedScreenY);

    vec2 pq = roundedScreenUV;

    vec2 normalized_screen_uv = vec2(roundedScreenUV.x * (u_resolution.x / u_resolution.y), roundedScreenUV.y);

    float time = u_time / 20000.0;

    pq += 0.1 * noise(normalized_screen_uv * 2.0 * rotation2d(time) * 4.0 + sin(time));


    vec2 cursor_hover = u_cursor_hover / u_resolution;
    cursor_hover.y = 1.0 - cursor_hover.y;
    vec2 correction = cursor_hover - pq.xy;
    correction.x *= u_resolution.x / u_resolution.y;



    float mouse_pct = length(correction);

    float gap = u_gap;

    float full_length = sqrt(pow(u_resolution.x / 2.0, 2.0) + pow(u_resolution.y, 2.0)) / u_resolution.y;

    float hover = u_hover * full_length;

    float affected_area = smoothstep(hover - gap * hover, hover,mouse_pct / (1.0 + gap) / full_length);


    // ----------------------------------- Image Cover -----------------------------------

    vec4 imageCoverVal = imageCover(uv, u_content_dimensions, columns, rows);
    vec2 st = vec2(imageCoverVal.rg);
    columns = imageCoverVal.b;
    rows = imageCoverVal.a;

    vec2 uv_resolution = vec2(v_screenUV.x * fullColumns, v_screenUV.y * fullRows);

    // ----------------------------------- Render -----------------------------------


    vec4 cursor = texture(u_cursor, v_screenUV) * (1.0 - u_nocursor);
    vec4 cursor_rounded = texture(u_cursor, roundedScreenUV) * (1.0 - u_nocursor);

    float x_strength = min(1.0, 4.0 * (1.0 - min(1.0, abs(uv.x * 2.0 - 1.0))));
    float y_strength = min(1.0, 4.0 * (1.0 - min(1.0, abs(uv.y * 2.0 - 1.0))));

    vec2 cursorOffset = vec2(cursor.rg) * ((0.08 * x_strength * y_strength) + 0.02);
    vec2 image_uv = st - cursorOffset * u_distort_content;
    vec2 image_uv_opacity = uv - cursorOffset;

    float x_opacity = 1.0 - min(1.0, ceil(max(0.0, abs(image_uv_opacity.x * 2.0 - 1.0) - 1.0)));
    float y_opacity = 1.0 - min(1.0, ceil(max(0.0, abs(image_uv_opacity.y * 2.0 - 1.0) - 1.0)));


    vec2 scaled_uv = image_uv * 2.0 - 1.0;
    scaled_uv *= 1.0 / scale;

    scaled_uv.y += u_parallax_progress * (scale - 1.0) / 2.0;
    scaled_uv = (scaled_uv + 1.0) / 2.0;


    vec4 tex = texture(u_content, scaled_uv);
    vec4 grid = texture(u_grid, uv);

    float hover_f = drawLLLogo(uv_resolution, min(1.0, u_hover * 10.0) *  (1.0 - affected_area), 1.0);

    float cursor_f;

    cursor_f += drawLLLogo(uv_resolution, length(cursor_rounded.rg), 1.0) * u_distort_content;
    cursor_f = min(1.0, cursor_f + hover_f);

    cursor_f = u_invert * max(0.0, 1.0 - cursor_f) + (1.0 - u_invert) * cursor_f;



    vec4 final_pass = tex * (1.0 - cursor_f) + grid * cursor_f;


    float noise_val = 0.5 * noise(roundedUV * 2.0 * rotation2d(time) * 4.0);

    float grid_progress = min(1.0, u_reveal_progress * 1.5);
    float full_progress = min(1.0, max(0.0, u_reveal_progress * 1.5 - 0.5));

    float backdrop_opacity = 1.0;
    float grid_opacity = 1.0 - smoothstep(0.0, 1.0, 1.0 - grid_progress + noise_val * (1.0 - grid_progress));
    float full_opacity = 1.0 - smoothstep(0.0, 1.0, 1.0 - full_progress + noise_val * (1.0 - full_progress));

    grid_opacity = drawLLLogo(uv_resolution, grid_opacity, 1.0);
    full_opacity = drawLLLogo(uv_resolution, full_opacity, 1.0);


    grid_opacity = max(0.0, grid_opacity - full_opacity);
    backdrop_opacity = max(0.0, backdrop_opacity - grid_opacity - full_opacity);

    vec3 content_colour = u_content_theme / 255.0;


    FragColor = vec4(content_colour * backdrop_opacity + grid.rgb * grid_opacity + final_pass.rgb * full_opacity, x_opacity * y_opacity);
}



`,n=`#version 300 es
in vec2 a_position;
uniform vec2 u_resolution;
uniform vec2 u_position;
uniform float u_scroll;
uniform float u_border;
uniform vec2 u_size;
out vec2 v_uv;
out vec2 v_screenUV;
out float v_x;
out float v_y;
out float v_width;
out float v_height;

void main() {

    float width = u_size.x / u_resolution.x;
    float height = u_size.y / u_resolution.y;
    float x = -1.0 + width + 2.0 * (u_position.x / u_resolution.x);
    float y = 1.0 - height + 2.0 * ((-u_position.y + u_scroll) / u_resolution.y);

    float b_width = (u_border * 2.0 + u_size.x) / u_resolution.x;
    float b_height = (u_border * 2.0 + u_size.y) / u_resolution.y;

    float b_x = -1.0 + b_width + 2.0 * ((-u_border + u_position.x) / u_resolution.x);
    float b_y = 1.0 - b_height + 2.0 * ((-(-u_border + u_position.y) + u_scroll) / u_resolution.y);

    v_screenUV = (vec2((width) * a_position.x + x, (height) * a_position.y + y) + 1.0) / 2.0;

	v_uv = 0.5 * (a_position + 1.0);

    v_x = u_position.x / u_resolution.x;
    // v_y = (-u_position.y + u_scroll) / u_resolution.y;
    v_y = ((u_resolution.y - (u_position.y + u_size.y)) + u_scroll) / u_resolution.y;
    v_width = width;
    v_height = height;



    gl_Position = vec4(a_position.xy, 0.0, 1.0);
}
`;export{t as n,e as r,n as t};