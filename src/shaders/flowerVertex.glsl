// flowerVertex.glsl (CORRECTED)

uniform float uTime;
uniform vec3 uWindDirection;
uniform float uWindSpeed;
uniform float uWindStrength;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
    // uv and normal are implicitly available here
    vUv = uv;
    
    // IMPORTANT: Transform the normal from local space to view space (for lighting)
    // The previous error was here. Use the standard attribute 'normal' directly.
    vNormal = normalize(normalMatrix * normal); // This line is correct for lighting

    // --- Wind Calculation ---
    float heightInfluence = position.y; 
    float wave = sin(uTime * uWindSpeed + position.x * 2.0 + position.z * 1.5) * heightInfluence * uWindStrength;

    vec3 animatedPosition = position;
    animatedPosition.xz += uWindDirection.xz * wave;

    // Final position calculation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition, 1.0);
}