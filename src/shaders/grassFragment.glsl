uniform sampler2D textures[4];   // textures[0] = grass, textures[1] = clouds
varying vec2 vUv;
varying vec2 cloudUV;

void main() {
  // Base grass
  float contrast = 1.65;       // push contrast a bit more than creator
  float brightness = 0.05;     // lower brightness to avoid washed-out yellow
  
  vec3 color = texture2D(textures[0], vUv).rgb;
  color = (color - 0.4) * contrast + 0.6; // contrast curve
  color += vec3(brightness);

  // Cloud shadows
  vec3 clouds = texture2D(textures[1], cloudUV).rgb;
  float cloudMix = 0.15; // less than 0.4 → feels more like shadows
  color = mix(color, clouds, cloudMix);

  // Final output
  gl_FragColor = vec4(color, 1.0);
}
