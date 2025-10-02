// flowerFragment.glsl
uniform sampler2D uMap; 
uniform vec3 uBaseColor;  // Base color from material

// Lighting uniforms
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseLightColor;
uniform vec3 uLightDirection;

varying vec2 vUv;
varying vec3 vNormal;

// Color enhancement function
vec3 enhanceColor(vec3 color) {
    // Increase saturation
    vec3 luminance = vec3(0.299, 0.587, 0.114);
    float luminanceValue = dot(color, luminance);
    vec3 saturatedColor = mix(vec3(luminanceValue), color, 1.4); // Increase saturation by 40%
    
    // Add some warmth to the colors
    vec3 warmth = vec3(1.1, 1.0, 0.9);
    return saturatedColor * warmth;
}

void main() {
    // 1. Get base color from texture or material color
    vec4 textureColor = texture2D(uMap, vUv);
    vec3 baseColor;
    float alpha = 1.0;

    // If we have a valid texture, use it
    if (textureColor.a > 0.0 && length(textureColor.rgb) > 0.0) {
        baseColor = textureColor.rgb;
        alpha = textureColor.a;
        
        // Enhance colors based on their predominant hue
        float r = baseColor.r;
        float g = baseColor.g;
        float b = baseColor.b;
        
        // Enhance reds (petals)
        if (r > g && r > b) {
            baseColor.r *= 1.2; // Boost red
            baseColor.g *= 0.9; // Reduce green slightly
            baseColor = mix(baseColor, vec3(1.0, 0.8, 0.8), 0.2); // Add pink tint
        }   
        // Enhance greens (leaves and stems)
        else if (g > r && g > b) {
            baseColor.g *= 1.5; // Boost green
            baseColor = mix(baseColor, vec3(0.8, 1.0, 0.8), 0.1); // Add fresh green tint
        }
        // Enhance yellows (stamen)
        else if (r > 0.5 && g > 0.5 && b < 0.5) {
            baseColor = mix(baseColor, vec3(1.0, 0.9, 0.4), 0.3); // Add golden yellow tint
        }
        
        // Apply general color enhancement
        baseColor = enhanceColor(baseColor);
    } else {
        baseColor = enhanceColor(uBaseColor);
    }

    // 2. Calculate lighting with enhanced ambient
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDirection);
    
    // Softer diffuse lighting
    float NdotL = dot(N, L);
    float diffuseFactor = pow(max(NdotL, 0.0), 0.8); // Soften the falloff
    
    // Enhanced ambient lighting
    vec3 ambient = uAmbientColor * 0.8;
    vec3 diffuse = uDiffuseLightColor * diffuseFactor;
    
    // Add subtle rim lighting
    float rimFactor = 1.0 - max(dot(N, vec3(0.0, 0.0, 1.0)), 0.0);
    vec3 rimLight = vec3(1.0, 0.9, 0.8) * pow(rimFactor, 3.0) * 0.3;
    
    // Combine lighting with rim effect
    vec3 finalLight = ambient + diffuse + rimLight;
    
    // 3. Apply lighting to base color
    vec3 finalColor = baseColor * finalLight;
    
    // 4. Color correction and output
    // Apply enhanced gamma correction for more vibrant colors
    finalColor = pow(finalColor, vec3(1.0/2.4));
    
    // Add subtle color bleeding for more natural look
    float colorBleed = 0.05;
    finalColor += colorBleed * vec3(0.1, 0.05, 0.05); // Subtle warm color bleed
    
    // Ensure colors stay in valid range with smooth clamp
    finalColor = smoothstep(vec3(0.0), vec3(1.0), finalColor);
    
    gl_FragColor = vec4(finalColor, alpha);
}