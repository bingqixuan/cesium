/*
 * @LastEditors: bingqixuan
 * @Date: 2019-03-22 17:26:51
 * @LastEditTime: 2019-03-22 18:57:21
 */
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec3 prevPosition3DHigh;
attribute vec3 prevPosition3DLow;
attribute vec3 nextPosition3DHigh;
attribute vec3 nextPosition3DLow;
attribute vec2 expandAndWidth;
attribute vec4 color;
attribute float batchId;
uniform float currentTime;
uniform float trailLength;

varying float v_time;
varying vec4 v_color;

void main()
{
    float expandDir = expandAndWidth.x;
    float width = abs(expandAndWidth.y) + 0.5;
    bool usePrev = expandAndWidth.y < 0.0;

    vec4 p = czm_computePosition();
    vec4 prev = czm_computePrevPosition();
    vec4 next = czm_computeNextPosition();

    v_color = color;
    vTime = 1.0 - (currentTime - positions.z) / trailLength;

    float angle;
    vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev, angle);
    gl_Position = czm_viewportOrthographic * positionWC;

#ifdef LOG_DEPTH
    czm_vertexLogDepth(czm_modelViewProjectionRelativeToEye * p);
#endif
}
