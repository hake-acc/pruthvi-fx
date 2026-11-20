var e=`#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_pixel_size;
uniform float u_show;
uniform float u_time;
uniform sampler2D u_input;
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



void main() {

    vec2 uv = v_uv;

    vec2 st = uv * 2.0 - 1.0;
    st.x *= u_resolution.x / u_resolution.y;


    float columns = u_resolution.x / (u_pixel_size);
    float rows = u_resolution.y / (u_pixel_size);

    float y = uv.y;

    float roundedX = round((st.x) * (rows / 2.0)) / (rows / 2.0);
    float roundedY = round((st.y) * (rows / 2.0)) / (rows / 2.0);

    vec2 roundedUV = vec2(roundedX, roundedY);


    float noise_val = 0.2 * noise(roundedUV * rotation2d(u_time / 20000.0) * 4.0);



    // Circle
    roundedUV += 0.1 * noise(roundedUV * 3.0 * rotation2d(u_time / 20000.0) * 4.0);





    float full_length = (sqrt(pow(u_resolution.x, 2.0) + pow(u_resolution.y, 2.0)) / u_resolution.y);

    float show = 1.0 - smoothstep(0.0, 1.0, 1.0 - u_show + noise_val * (1.0 - u_show));


    vec4 tex = texture(u_input, uv);


    // FragColor = vec4(u_show);
    // FragColor = vec4(tex.rgb, show);
    FragColor = vec4(tex.rgb, show);
    // FragColor = vec4(1.0, 0.0, 0.0, show);
}
`;export{e as t};