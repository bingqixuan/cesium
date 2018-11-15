define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/Math',
        './SceneMode'
    ], function(
        Cartesian3,
        defined,
        CesiumMath,
        SceneMode) {
    'use strict';

    /**
     * Blends the atmosphere to geometry far from the camera for horizon views. Allows for additional
     * performance improvements by rendering less geometry and dispatching less terrain requests.
     *
     * @alias Fog
     * @constructor
     */
    function Fog() {
        /**
         * <code>true</code> if fog is enabled, <code>false</code> otherwise.
         * @type {Boolean}
         * @default true
         */
        this.enabled = true;
        /**
         * 确定雾密度的标量。完全处于雾中的地形将被剔除。
         * 当这个数字接近1.0时，雾的密度增加，当它接近0时密度减小。
         * 雾越浓（密度越大），地形就越容易被剔除。例如，如果摄像机位于椭球面上的高度为1000.m，将该值增加到3.0e-3将会导致许多靠近视角的瓦片被剔除。
         * Decreasing the value will push the fog further from the viewer, but decrease performance as more of the terrain is rendered.
         * 降低浓度值将使雾远离视角，但是随着地形的渲染，性能会降低。
         * @type {Number}
         * @default 2.0e-4
         */
        this.density = 2.0e-4;
        /**
         * 当地形瓦片部分处于雾中时，用来增加其屏幕空间误差（sse）的因子。其效果是减少渲染所需的地形块的数量。如果设置为0，该特性将被禁用。
         * 如果为山区增加数值，则需要的瓦片会更少，但地平线附近的地形网格分辨率可能会明显降低。
         * 如果该值在相对平坦的区域内增加，则地平线上几乎不会有明显的变化。
         * @type {Number}
         * @default 2.0
         */
        this.screenSpaceErrorFactor = 2.0;
        /**
         * The minimum brightness of the fog color from lighting. A value of 0.0 can cause the fog to be completely black. A value of 1.0 will not affect the brightness at all.
         * 从光照中产生的雾色的最小亮度。如果值为0.0，雾就会完全变黑。1.0的值不会影响亮度。
         * @type {Number}
         * @default 0.1
         */
        this.minimumBrightness = 0.03;
    }

    // These values were found by sampling the density at certain views and finding at what point culled tiles impacted the view at the horizon.
    // 这些数值是通过对某些视图的密度进行抽样，并找出在什么点上剔除的瓦片影响了地平线上的视图而得出的。
    var heightsTable = [359.393, 800.749, 1275.6501, 2151.1192, 3141.7763, 4777.5198, 6281.2493, 12364.307, 15900.765, 49889.0549, 78026.8259, 99260.7344, 120036.3873, 151011.0158, 156091.1953, 203849.3112, 274866.9803, 319916.3149, 493552.0528, 628733.5874];
    var densityTable = [2.0e-5, 2.0e-4, 1.0e-4, 7.0e-5, 5.0e-5, 4.0e-5, 3.0e-5, 1.9e-5, 1.0e-5, 8.5e-6, 6.2e-6, 5.8e-6, 5.3e-6, 5.2e-6, 5.1e-6, 4.2e-6, 4.0e-6, 3.4e-6, 2.6e-6, 2.2e-6];

    // Scale densities by 1e6 to bring lowest value to ~1. Prevents divide by zero.
    // 刻度密度为1e6，使最低值为~1。防止除以0
    for (var i = 0; i < densityTable.length; ++i) {
        densityTable[i] *= 1.0e6;
    }
    // Change range to [0, 1].
    var tableStartDensity = densityTable[1];
    var tableEndDensity = densityTable[densityTable.length - 1];
    for (var j = 0; j < densityTable.length; ++j) {
        densityTable[j] = (densityTable[j] - tableEndDensity) / (tableStartDensity - tableEndDensity);
    }

    var tableLastIndex = 0;

    function findInterval(height) {
        var heights = heightsTable;
        var length = heights.length;

        if (height < heights[0]) {
            tableLastIndex = 0;
            return tableLastIndex;
        } else if (height > heights[length - 1]) {
            tableLastIndex = length - 2;
            return tableLastIndex;
        }

        // Take advantage of temporal coherence by checking current, next and previous intervals
        // for containment of time.
        if (height >= heights[tableLastIndex]) {
            if (tableLastIndex + 1 < length && height < heights[tableLastIndex + 1]) {
                return tableLastIndex;
            } else if (tableLastIndex + 2 < length && height < heights[tableLastIndex + 2]) {
                ++tableLastIndex;
                return tableLastIndex;
            }
        } else if (tableLastIndex - 1 >= 0 && height >= heights[tableLastIndex - 1]) {
            --tableLastIndex;
            return tableLastIndex;
        }

        // The above failed so do a linear search.
        var i;
        for (i = 0; i < length - 2; ++i) {
            if (height >= heights[i] && height < heights[i + 1]) {
                break;
            }
        }

        tableLastIndex = i;
        return tableLastIndex;
    }

    var scratchPositionNormal = new Cartesian3();

    Fog.prototype.update = function(frameState) {
        var enabled = frameState.fog.enabled = this.enabled;
        if (!enabled) {
            return;
        }

        var camera = frameState.camera;
        var positionCartographic = camera.positionCartographic;

        // Turn off fog in space.
        if (!defined(positionCartographic) || positionCartographic.height > 800000.0 || frameState.mode !== SceneMode.SCENE3D) {
            frameState.fog.enabled = false;
            return;
        }

        var height = positionCartographic.height;
        var i = findInterval(height);
        var t = CesiumMath.clamp((height - heightsTable[i]) / (heightsTable[i + 1] - heightsTable[i]), 0.0, 1.0);
        var density = CesiumMath.lerp(densityTable[i], densityTable[i + 1], t);

        // Again, scale value to be in the range of densityTable (prevents divide by zero) and change to new range.
        var startDensity = this.density * 1.0e6;
        var endDensity = (startDensity / tableStartDensity) * tableEndDensity;
        density = (density * (startDensity - endDensity)) * 1.0e-6;

        // Fade fog in as the camera tilts toward the horizon.
        var positionNormal = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
        var dot = Math.abs(Cartesian3.dot(camera.directionWC, positionNormal));
        density *= 1.0 - dot;

        frameState.fog.density = density;
        frameState.fog.sse = this.screenSpaceErrorFactor;
        frameState.fog.minimumBrightness = this.minimumBrightness;
    };

    return Fog;
});
