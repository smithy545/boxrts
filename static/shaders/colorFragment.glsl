#version 300 es

in mediump vec4 vColor;
in mediump vec3 vNormalCoord;
out mediump vec4 vFragColor;

void main(void) {
    vFragColor = vColor;
}