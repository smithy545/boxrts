#version 300 es

struct Material {
    mediump vec3 ambientColor;
    mediump vec3 diffuseColor;
    mediump vec3 specularColor;
    mediump vec3 transmissionFilter;
    mediump float illuminationModel;
    mediump float dissolveFactor;
    mediump float specularExponent;
    mediump float sharpness;
    mediump float refractionIndex;
};
in mediump vec2 vTextureCoord;
in mediump vec3 vNormalCoord;
out mediump vec4 vFragColor;

uniform Material uMaterial;
uniform sampler2D uSampler;

void main(void) {
    vFragColor = texture(uSampler, vTextureCoord);
}