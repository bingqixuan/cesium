define([
    '../Core/ComponentDatatype',
    '../Core/defined',
    '../Core/Geometry',
    '../Core/GeometryAttribute',
    '../Core/GeometryAttributes',
    '../Core/Math',
    '../Core/Resource',
    '../Renderer/Framebuffer',
    '../Renderer/Texture',
    '../Scene/Appearance',
    '../ThirdParty/when'
], function (
    ComponentDatatype,
    defined,
    Geometry,
    GeometryAttribute,
    GeometryAttributes,
    CesiumMath,
    Resource,
    Framebuffer,
    Texture,
    Appearance,
    when
) {
    'use strict';

    function WindUtil() {

    }

    WindUtil.loadText = function (filePath) {
        var resource = Resource.createIfNeeded(filePath);
        var promise = resource.fetchText();
        return when(promise).then(function (text) {
            return text;
        });
    };

    var fullscreenQuad;
    WindUtil.getFullscreenQuad = function () {
        if (!defined(fullscreenQuad)) {
            fullscreenQuad = new Geometry({
                attributes: new GeometryAttributes({
                    position: new GeometryAttribute({
                        componentDatatype: ComponentDatatype.FLOAT,
                        componentsPerAttribute: 3,
                        //  v3----v2
                        //  |     |
                        //  |     |
                        //  v0----v1
                        values: new Float32Array([
                            -1, -1, 0, // v0
                            1, -1, 0, // v1
                            1, 1, 0, // v2
                            -1, 1, 0, // v3
                        ])
                    }),
                    st: new GeometryAttribute({
                        componentDatatype: ComponentDatatype.FLOAT,
                        componentsPerAttribute: 2,
                        values: new Float32Array([
                            0, 0,
                            1, 0,
                            1, 1,
                            0, 1,
                        ])
                    })
                }),
                indices: new Uint32Array([3, 2, 0, 0, 2, 1])
            });
        }
        return fullscreenQuad;
    };

    WindUtil.createTexture = function (options, typedArray) {
        if (defined(typedArray)) {
            // typed array needs to be passed as source option, this is required by Cesium.Texture
            var source = {};
            source.arrayBufferView = typedArray;
            options.source = source;
        }

        var texture = new Texture(options);
        return texture;
    };

    WindUtil.createFramebuffer = function (context, colorTexture, depthTexture) {
        var framebuffer = new Framebuffer({
            context: context,
            colorTextures: [colorTexture],
            depthTexture: depthTexture
        });
        return framebuffer;
    };

    WindUtil.createRawRenderState = function (options) {
        var translucent = true;
        var closed = false;
        var existing = {
            viewport: options.viewport,
            depthTest: options.depthTest,
            depthMask: options.depthMask,
            blending: options.blending
        };

        var rawRenderState = Appearance.getDefaultRenderState(translucent, closed, existing);
        return rawRenderState;
    }

    WindUtil.viewRectangleToLonLatRange = function (viewRectangle) {
        var range = {};

        var postiveWest = CesiumMath.mod(viewRectangle.west, CesiumMath.TWO_PI);
        var postiveEast = CesiumMath.mod(viewRectangle.east, CesiumMath.TWO_PI);
        var width = viewRectangle.width;

        var longitudeMin;
        var longitudeMax;
        if (width > CesiumMath.THREE_PI_OVER_TWO) {
            longitudeMin = 0.0;
            longitudeMax = CesiumMath.TWO_PI;
        } else {
            if (postiveEast - postiveWest < width) {
                longitudeMin = postiveWest;
                longitudeMax = postiveWest + width;
            } else {
                longitudeMin = postiveWest;
                longitudeMax = postiveEast;
            }
        }

        range.lon = {
            min: CesiumMath.toDegrees(longitudeMin),
            max: CesiumMath.toDegrees(longitudeMax)
        }

        var south = viewRectangle.south;
        var north = viewRectangle.north;
        var height = viewRectangle.height;

        var extendHeight = height > CesiumMath.PI / 12 ? height / 2 : 0;
        var extendedSouth = CesiumMath.clampToLatitudeRange(south - extendHeight);
        var extendedNorth = CesiumMath.clampToLatitudeRange(north + extendHeight);

        // extend the bound in high latitude area to make sure it can cover all the visible area
        if (extendedSouth < -CesiumMath.PI_OVER_THREE) {
            extendedSouth = -CesiumMath.PI_OVER_TWO;
        }
        if (extendedNorth > CesiumMath.PI_OVER_THREE) {
            extendedNorth = CesiumMath.PI_OVER_TWO;
        }

        range.lat = {
            min: CesiumMath.toDegrees(extendedSouth),
            max: CesiumMath.toDegrees(extendedNorth)
        }

        return range;
    }

    return WindUtil;
});
