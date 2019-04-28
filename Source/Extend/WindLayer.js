/*
 * @LastEditors: bingqixuan
 * @Date: 2019-03-27 18:17:10
 * @LastEditTime: 2019-04-11 15:03:05
 */
define([
    '../Core/Cartesian2',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/DeveloperError',
    '../Core/GeometryInstance',
    '../Core/PixelFormat',
    '../Core/Rectangle',
    '../Core/RectangleGeometry',
    '../Core/Resource',
    '../Scene/EllipsoidSurfaceAppearance',
    '../Scene/Material',
    '../Scene/Primitive',
    '../Scene/PrimitiveCollection',
    '../Renderer/PixelDatatype',
    '../Renderer/Sampler',
    '../Renderer/Texture',
    '../Renderer/TextureMagnificationFilter',
    '../Renderer/TextureMinificationFilter'
],function(
    Cartesian2,
    defaultValue,
    defined,
    DeveloperError,
    GeometryInstance,
    PixelFormat,
    Rectangle,
    RectangleGeometry,
    Resource,
    EllipsoidSurfaceAppearance,
    Material,
    Primitive,
    PrimitiveCollection,
    PixelDatatype,
    Sampler,
    Texture,
    TextureMagnificationFilter,
    TextureMinificationFilter
){
    'use strict';

    /**
     * @description: 风可视化图层
     * @param {type} options
     * @return
     */
    function WindLayer(options){
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;

        if (!defined(options.data)) {
            throw new DeveloperError('options.data is required.');
        }
        this._data = options.data;

        // use a smaller earth radius to make sure distance to camera > 0
        this.globeBoundingSphere = new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, 0.99 * 6378137.0);
        this.viewerParameters = {};
        this.updateViewerParameters();

        DataProcess.loadData(fileOptions).then(
            (windData) => {
                this.particleSystem = new ParticleSystem(this.scene.context, windData,
                    particleSystemOptions, fileOptions, this.viewerParameters);

                // the order of primitives.add should respect the dependency of primitives
                this.scene.primitives.add(this.particleSystem.primitives.particlesUpdate);
                this.scene.primitives.add(this.particleSystem.primitives.particlesRandomize);
                this.scene.primitives.add(this.particleSystem.primitives.segments);
                this.scene.primitives.add(this.particleSystem.primitives.trails);
                this.scene.primitives.add(this.particleSystem.primitives.screen);

                this.setupEventListeners();

                if (mode.debug) {
                    this.debug();
                }
            });

        this.imageryLayers = this.viewer.imageryLayers;
        this.setGlobeLayer(displayOptions);
    }

    return WindLayer;
});
