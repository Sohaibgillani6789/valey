varying vec2 vUv;
varying vec2 cloudUV;
varying vec3 vColor;

uniform float iTime;

void main() {
  vUv = uv;
  cloudUV = uv;
  vColor = color;

  vec3 cpos = position;

  float waveSize = 10.0;
  float tipDistance = 0.3;
  float centerDistance = 0.1;

  // Animate blade tips (white vertices)
  if (color.x > 0.6) {
    cpos.x += sin((iTime / 500.0) + (uv.x * waveSize)) * tipDistance;
  }
  // Animate blade centers (gray vertices)
  else if (color.x > 0.0) {
    cpos.x += sin((iTime / 500.0) + (uv.x * waveSize)) * centerDistance;
  }

  // Move cloud UVs slowly over time
  cloudUV.x += iTime / 20000.0;
  cloudUV.y += iTime / 10000.0;

  // Final position
  vec4 mvPosition = projectionMatrix * modelViewMatrix * vec4(cpos, 1.0);
  gl_Position = mvPosition;
}
