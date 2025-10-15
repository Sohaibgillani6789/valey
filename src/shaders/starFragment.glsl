uniform vec3 uSunsetColor;
uniform vec3 uZenithColor;
uniform float uTime;
varying vec3 vWorldPosition;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    float sunHeight = normalize(vWorldPosition).y;
    float blendFactor = smoothstep(-0.2, 0.4, sunHeight);
    vec3 skyColor = mix(uSunsetColor, uZenithColor, blendFactor);

    // 🌟 GRID-BASED STARS WITH INDIVIDUAL MOVEMENT PATTERNS
    vec2 uv = vWorldPosition.xz * 20.0; // Star density
    
    // Base horizontal scroll - smooth and continuous
    uv.x += uTime * 0.2;
    
    // Create grid cells
    vec2 grid = floor(uv);
    vec2 gridF = fract(uv);
    
    // Generate unique ID for each star
    float starId = hash(grid);
    
    // 🌟 INDIVIDUAL STAR MOVEMENT PATTERNS
    // Each star moves slightly differently based on its ID
    vec2 starOffset = vec2(0.0);
    
    // Horizontal movement variations
    starOffset.x += sin(uTime * 0.5 + starId * 6.283) * 0.1; // Side-to-side sway
    starOffset.y += cos(uTime * 0.3 + starId * 12.566) * 0.05; // Vertical bob
    
    // Apply individual star movement
    vec2 starPos = gridF - 0.5 + starOffset;
    
    // Generate star with slight size variation
    float starSize = 0.02 + starId * 0.03; // Different sizes
    float star = 1.0 - smoothstep(0.0, starSize, length(starPos));
    
    // Only show some cells as stars
    float starMask = step(0.92, starId); // Slightly more stars
    
    // 🌟 TWINKLING EFFECT
    float twinkle = (sin(uTime * 2.0 + starId * 10.0) * 0.3 + 0.7);
    
    // Combine everything
    float stars = star * starMask * twinkle;
    
    // Fade stars near horizon
    float visible = smoothstep(0.5, 0.9, blendFactor);
    
    skyColor = mix(skyColor, vec3(1.0), stars * visible * 6.0);

    gl_FragColor = vec4(skyColor, 1.0);
}