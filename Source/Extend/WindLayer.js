/*
 * @LastEditors: bingqixuan
 * @Date: 2019-03-27 18:17:10
 * @LastEditTime: 2019-04-28 10:58:32
 */
define([
    './WindDataProcess',
    './WindParticleSystem',
    './WindUtil',
    '../Core/BoundingSphere',
    '../Core/Cartesian3',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/DeveloperError'
],function(
    WindDataProcess,
    WindParticleSystem,
    WindUtil,
    BoundingSphere,
    Cartesian3,
    defaultValue,
    defined,
    DeveloperError
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
        this.scene = options.scene;
        this.camera = this.scene.camera;
        this.fileOptions = options.fileOptions;
        this.particleSystemOptions = {
            dropRate: 0.003,
            dropRateBump: 0.01,
            fadeOpacity: 0.996,
            lineWidth: 4,
            maxParticles: 16384,
            particleHeight: 100,
            speedFactor: 4
        }

        // use a smaller earth radius to make sure distance to camera > 0
        this.globeBoundingSphere = new BoundingSphere(Cartesian3.ZERO, 0.99 * 6378137.0);
        this.viewerParameters = {};
        this.updateViewerParameters();

        WindDataProcess.loadData(this.fileOptions).then(
            (windData) => {
                this.particleSystem = new WindParticleSystem(this.scene.context, windData,
                    this.particleSystemOptions, this.fileOptions, this.viewerParameters);

                // the order of primitives.add should respect the dependency of primitives
                this.scene.primitives.add(this.particleSystem.primitives.particlesUpdate);
                this.scene.primitives.add(this.particleSystem.primitives.particlesRandomize);
                this.scene.primitives.add(this.particleSystem.primitives.segments);
                this.scene.primitives.add(this.particleSystem.primitives.trails);
                this.scene.primitives.add(this.particleSystem.primitives.screen);

                this.setupEventListeners();

                // if (mode.debug) {
                //     this.debug();
                // }
            });

        this.imageryLayers = this.scene.imageryLayers;
    }

    WindLayer.prototype.updateViewerParameters = function() {
        var viewerParameters = {};

        var viewRectangle = this.camera.computeViewRectangle(this.scene.globe.ellipsoid);
        viewerParameters.lonLatRange = WindUtil.viewRectangleToLonLatRange(viewRectangle);

        viewerParameters.pixelSize = this.camera.getPixelSize(
            this.globeBoundingSphere,
            this.scene.drawingBufferWidth,
            this.scene.drawingBufferHeight
        );

        if (viewerParameters.pixelSize == 0) {
            viewerParameters.pixelSize = this.viewerParameters.pixelSize;
        }

        this.viewerParameters = viewerParameters;
    }


    WindLayer.prototype.setupEventListeners = function() {
        const that = this;

        this.camera.moveStart.addEventListener(function () {
            that.scene.primitives.show = false;
        });

        this.camera.moveEnd.addEventListener(function () {
            that.updateViewerParameters();
            that.particleSystem.refreshParticle(that.viewerParameters, false);
            that.scene.primitives.show = true;
        });

        var resized = false;
        window.addEventListener("resize", function () {
            resized = true;
            that.scene.primitives.show = false;
        });

        this.scene.preRender.addEventListener(function () {
            if (resized) {
                that.particleSystem.canvasResize(that.scene.context);
                resized = false;
                that.scene.primitives.show = true;
            }
        });

        window.addEventListener('particleSystemOptionsChanged', function (event) {
            that.particleSystem.applyParticleSystemOptions(event.detail);
        });

        window.addEventListener('displayOptionsChanged', function (event) {
            that.setGlobeLayer(event.detail);
        });
    }

    WindLayer.prototype.debug = function() {
        const that = this;

        var animate = function () {
            that.viewer.resize();
            that.viewer.render();
            requestAnimationFrame(animate);
        }

        var spector = new SPECTOR.Spector();
        spector.displayUI();
        spector.spyCanvases();

        animate();
    }

    return WindLayer;
});
