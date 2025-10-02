uniform vec3 uSunsetColor;
uniform vec3 uZenithColor;
varying vec3 vWorldPosition;

// Simple random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    float sunHeight = normalize(vWorldPosition).y;
    float blendFactor = smoothstep(-0.2, 0.4, sunHeight);
    vec3 skyColor = mix(uSunsetColor, uZenithColor, blendFactor);

    // Star generation
    float stars = step(0.995, random(vWorldPosition.xz * 30.0)); // fewer, smaller stars
    // Only show stars in the dark blue (zenith) area
    float starMask = step(0.7, blendFactor); // 1 if blendFactor > 0.7 (zenith)
    float starBrightness = 4.5; // bigger, brighter stars
    skyColor = mix(skyColor, vec3(1.0) * starBrightness, stars * starMask);

    gl_FragColor = vec4(skyColor, 1.0);
}
