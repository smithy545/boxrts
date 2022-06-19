#version 300 es

layout (location = 0) in mediump vec4 aVertexPosition;
layout (location = 1) in mediump vec4 aVertexColor;
layout (location = 2) in mediump vec3 aVertexNormal;
layout (location = 3) in mediump mat4 aInstanceMatrix;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out mediump vec4 vColor;
out mediump vec3 vNormalCoord;

void main(void) {
    gl_Position = uProjectionMatrix * uViewMatrix * aInstanceMatrix * aVertexPosition;
    vColor = aVertexColor;
    vNormalCoord = aVertexNormal;
}