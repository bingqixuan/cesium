define([
    './WindDataProcess',
    './WindPrimitive',
    './WindUtil',
    '../Core/Cartesian2',
    '../Core/Cartesian3',
    '../Core/Color',
    '../Core/ComponentDatatype',
    '../Core/Geometry',
    '../Core/GeometryAttribute',
    '../Core/GeometryAttributes',
    '../Core/PixelFormat',
    '../Core/PrimitiveType',
    '../Renderer/ClearCommand',
    '../Renderer/PixelDatatype',
    '../Renderer/Sampler',
    '../Renderer/ShaderSource',
    '../Renderer/TextureMagnificationFilter',
    '../Renderer/TextureMinificationFilter',
    '../Scene/DepthFunction',
    '../Shaders/Extend/WindFullScreenVS',
    '../Shaders/Extend/WindRandomFS',
    '../Shaders/Extend/WindScreenDrawFS',
    '../Shaders/Extend/WindSegmentDrawFS',
    '../Shaders/Extend/WindSegmentDrawVS',
    '../Shaders/Extend/WindTrailDrawFS',
    '../Shaders/Extend/WindUpdateFS',
], function(
    WindDataProcess,
    WindPrimitive,
    WindUtil,
    Cartesian2,
    Cartesian3,
    Color,
    ComponentDatatype,
    Geometry,
    GeometryAttribute,
    GeometryAttributes,
    PixelFormat,
    PrimitiveType,
    ClearCommand,
    PixelDatatype,
    Sampler,
    ShaderSource,
    TextureMagnificationFilter,
    TextureMinificationFilter,
    DepthFunction,
    WindFullScreenVS,
    WindRandomFS,
    WindScreenDrawFS,
    WindSegmentDrawFS,
    WindSegmentDrawVS,
    WindTrailDrawFS,
    WindUpdateFS
){

    function WindParticleSystem(cesiumContext, windData, particleSystemOptions, fileOptions, viewerParameters){
        this.context = cesiumContext;
        this.data = windData;

        this.particleSystemOptions = particleSystemOptions;
        this.particleSystemOptions.particlesTextureSize = Math.ceil(Math.sqrt(this.particleSystemOptions.maxParticles));

        this.particlesArray = WindDataProcess.randomizeParticleLonLatLev(this.particleSystemOptions.maxParticles, viewerParameters.lonLatRange);
        this.particleGeometry = this.setupParticleGeometry();

        this.fileOptions = fileOptions;

        this.viewerParameters = viewerParameters;

        this.clearCommand = new ClearCommand({
            color: new Color(0.0, 0.0, 0.0, 0.0),
            depth: 1.0,
            framebuffer: undefined
        });

        /**
         * @typedef {Object} uniformVariables
         * @property {Cesium.Texture} U
         * @property {Cesium.Texture} V
         * @property {Cesium.Texture} colorTable
         * @property {Cesium.Cartesian2} lonRange
         * @property {Cesium.Cartesian2} latRange
         * @property {Number} pixelSize
         * @property {Number} speedFactor
         */

        /**
         * @type {uniformVariables}
         */
        this.uniformVariables = {
            lonRange: new Cartesian2(),
            latRange: new Cartesian2()
        };

        this.setComputeShaderParameters();
        this.setupDataTextures();

        /**
         * @typedef {Object} outputTextures
         * @property {Cesium.Texture} currentParticlesPosition
         * @property {Cesium.Texture} nextParticlesPosition
         * @property {Cesium.Texture} particlesRelativeSpeed
         * @property {Cesium.Texture} currentParticlesRandomized
         * @property {Cesium.Texture} nextParticlesRandomized
         */

        /**
         * @type {outputTextures}
         */
        this.outputTextures = {};
        this.setupParticlesTextures(this.particlesArray);

        /**
         * @typedef {Object} framebuffers
         * @property {Cesium.Framebuffer} segments
         * @property {Cesium.Framebuffer} currentTrails
         * @property {Cesium.Framebuffer} nextTrails
         */

        /**
         * @type {framebuffers}
         */
        this.framebuffers = {};
        this.setupOutputFramebuffers();

        this.primitives = {
            particlesUpdate: this.initParticlesUpdatePrimitive(),
            particlesRandomize: this.initParticlesRandomizePrimitive(),
            segments: this.initSegmentsPrimitive(),
            trails: this.initTrailsPrimitive(),
            screen: this.initScreenPrimitive()
        };
    }

    WindParticleSystem.prototype.setComputeShaderParameters = function() {
        var lonLatRange = this.viewerParameters.lonLatRange;
        this.uniformVariables.lonRange.x = lonLatRange.lon.min;
        this.uniformVariables.lonRange.y = lonLatRange.lon.max;
        this.uniformVariables.latRange.x = lonLatRange.lat.min;
        this.uniformVariables.latRange.y = lonLatRange.lat.max;

        this.uniformVariables.pixelSize = this.viewerParameters.pixelSize;
        this.uniformVariables.speedFactor = this.particleSystemOptions.speedFactor;
    }

    WindParticleSystem.prototype.setupDataTextures = function() {
        const uvTextureOptions = {
            context: this.context,
            width: this.data.dimensions.lon,
            height: this.data.dimensions.lat * this.data.dimensions.lev,
            pixelFormat: PixelFormat.LUMINANCE,
            pixelDatatype: PixelDatatype.FLOAT,
            flipY: false, // the data we provide should not be flipped
            sampler: new Sampler({
                // the values of data texture should not be interpolated
                minificationFilter: TextureMinificationFilter.NEAREST,
                magnificationFilter: TextureMagnificationFilter.NEAREST
            })
        };

        this.uniformVariables.U = WindUtil.createTexture(uvTextureOptions, this.data.U.array);
        this.uniformVariables.V = WindUtil.createTexture(uvTextureOptions, this.data.V.array);

        const colorTableTextureOptions = {
            context: this.context,
            width: this.data.colorTable.colorNum,
            height: 1,
            pixelFormat: PixelFormat.RGB,
            pixelDatatype: PixelDatatype.FLOAT,
            sampler: new Sampler({
                minificationFilter: TextureMinificationFilter.LINEAR,
                magnificationFilter: TextureMagnificationFilter.LINEAR
            })
        }
        this.uniformVariables.colorTable = WindUtil.createTexture(colorTableTextureOptions, this.data.colorTable.array);
    }

    WindParticleSystem.prototype.setupParticleGeometry = function() {
        const repeatVertex = 4;

        var particlesST = [];
        for (var s = 0; s < this.particleSystemOptions.particlesTextureSize; s++) {
            for (var t = 0; t < this.particleSystemOptions.particlesTextureSize; t++) {
                for (var i = 0; i < repeatVertex; i++) {
                    particlesST.push(s / this.particleSystemOptions.particlesTextureSize);
                    particlesST.push(t / this.particleSystemOptions.particlesTextureSize);
                }
            }
        }
        particlesST = new Float32Array(particlesST);

        var particlesNormal = [];
        const pointToUse = [-1, 1];
        const offsetSign = [-1, 1];
        for (var i = 0; i < this.particleSystemOptions.maxParticles; i++) {
            for (var j = 0; j < repeatVertex / 2; j++) {
                for (var k = 0; k < repeatVertex / 2; k++) {
                    particlesNormal.push(pointToUse[j]);
                    particlesNormal.push(offsetSign[k]);
                    particlesNormal.push(0);
                }
            }
        }
        particlesNormal = new Float32Array(particlesNormal);

        const indexSize = 6 * this.particleSystemOptions.maxParticles;
        var vertexIndexes = new Uint32Array(indexSize);
        for (var i = 0, j = 0, vertex = 0; i < this.particleSystemOptions.maxParticles; i++) {
            vertexIndexes[j++] = vertex + 0;
            vertexIndexes[j++] = vertex + 1;
            vertexIndexes[j++] = vertex + 2;
            vertexIndexes[j++] = vertex + 2;
            vertexIndexes[j++] = vertex + 1;
            vertexIndexes[j++] = vertex + 3;
            vertex += 4;
        }

        var particleGeometry = new Geometry({
            attributes: new GeometryAttributes({
                st: new GeometryAttribute({
                    componentDatatype: ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: particlesST
                }),
                normal: new GeometryAttribute({
                    componentDatatype: ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: particlesNormal
                }),
            }),
            indices: vertexIndexes
        });

        return particleGeometry;
    }

    WindParticleSystem.prototype.setupParticlesTextures = function() {
        const particlesTextureOptions = {
            context: this.context,
            width: this.particleSystemOptions.particlesTextureSize,
            height: this.particleSystemOptions.particlesTextureSize,
            pixelFormat: PixelFormat.RGB,
            pixelDatatype: PixelDatatype.FLOAT,
            sampler: new Sampler({
                // the values of particles texture should not be interpolated
                minificationFilter: TextureMinificationFilter.NEAREST,
                magnificationFilter: TextureMagnificationFilter.NEAREST
            })
        };

        var particlesPositionTexture0 = WindUtil.createTexture(particlesTextureOptions, this.particlesArray);
        var particlesPositionTexture1 = WindUtil.createTexture(particlesTextureOptions, this.particlesArray);

        var particlesPositionTexture2 = WindUtil.createTexture(particlesTextureOptions, this.particlesArray);
        var particlesPositionTexture3 = WindUtil.createTexture(particlesTextureOptions, this.particlesArray);

        this.outputTextures.particlesRelativeSpeed = WindUtil.createTexture(particlesTextureOptions);

        // used for ping-pong render
        this.outputTextures.currentParticlesPosition = particlesPositionTexture0;
        this.outputTextures.nextParticlesPosition = particlesPositionTexture1;

        this.outputTextures.currentParticlesRandomized = particlesPositionTexture2;
        this.outputTextures.nextParticlesRandomized = particlesPositionTexture3;
    }

    WindParticleSystem.prototype.setupOutputFramebuffers = function() {
        const colorTextureOptions = {
            context: this.context,
            width: this.context.drawingBufferWidth,
            height: this.context.drawingBufferHeight,
            pixelFormat: PixelFormat.RGBA,
            pixelDatatype: PixelDatatype.UNSIGNED_BYTE
        }

        const depthTextureOptions = {
            context: this.context,
            width: this.context.drawingBufferWidth,
            height: this.context.drawingBufferHeight,
            pixelFormat: PixelFormat.DEPTH_COMPONENT,
            pixelDatatype: PixelDatatype.UNSIGNED_INT
        }

        var segmentsColorTexture = WindUtil.createTexture(colorTextureOptions);
        var segmentsDepthTexture = WindUtil.createTexture(depthTextureOptions);
        this.framebuffers.segments = WindUtil.createFramebuffer(this.context, segmentsColorTexture, segmentsDepthTexture);

        var trailsColorTexture0 = WindUtil.createTexture(colorTextureOptions);
        var trailsDepthTexture0 = WindUtil.createTexture(depthTextureOptions);
        var trailsFramebuffer0 = WindUtil.createFramebuffer(this.context, trailsColorTexture0, trailsDepthTexture0);

        var trailsColorTexture1 = WindUtil.createTexture(colorTextureOptions);
        var trailsDepthTexture1 = WindUtil.createTexture(depthTextureOptions);
        var trailsFramebuffer1 = WindUtil.createFramebuffer(this.context, trailsColorTexture1, trailsDepthTexture1);

        // used for ping-pong render
        this.framebuffers.currentTrails = trailsFramebuffer0;
        this.framebuffers.nextTrails = trailsFramebuffer1;
    }

    WindParticleSystem.prototype.initParticlesUpdatePrimitive = function() {
        const minimum = new Cartesian3(this.data.lon.min, this.data.lat.min, this.data.lev.min);
        const maximum = new Cartesian3(this.data.lon.max, this.data.lat.max, this.data.lev.max);
        const dimension = new Cartesian3(
            this.data.dimensions.lon,
            this.data.dimensions.lat,
            this.data.dimensions.lev
        );
        const interval = new Cartesian3(
            (maximum.x - minimum.x) / (dimension.x - 1),
            (maximum.y - minimum.y) / (dimension.y - 1),
            dimension.z > 1 ? (maximum.z - minimum.z) / (dimension.z - 1) : 1.0
        );
        const uSpeedRange = new Cartesian2(
            this.data.U.min,
            this.data.U.max
        );
        const vSpeedRange = new Cartesian2(
            this.data.V.min,
            this.data.V.max
        );

        const that = this;
        const uniformMap = {
            U: function () {
                return that.uniformVariables.U;
            },
            V: function () {
                return that.uniformVariables.V;
            },
            currentParticlesPosition: function () {
                return that.outputTextures.currentParticlesPosition;
            },
            dimension: function () {
                return dimension;
            },
            minimum: function () {
                return minimum;
            },
            maximum: function () {
                return maximum;
            },
            interval: function () {
                return interval;
            },
            uSpeedRange: function () {
                return uSpeedRange;
            },
            vSpeedRange: function () {
                return vSpeedRange;
            },
            pixelSize: function () {
                return that.uniformVariables.pixelSize;
            },
            speedFactor: function () {
                return that.uniformVariables.speedFactor;
            }
        }

        const fragmentShaderSource = new ShaderSource({
            sources: [WindUpdateFS]
        });

        var primitive = new WindPrimitive({
            commandType: 'Compute',
            uniformMap: uniformMap,
            fragmentShaderSource: fragmentShaderSource,
            outputTextures: [
                this.outputTextures.nextParticlesPosition,
                this.outputTextures.particlesRelativeSpeed
            ]
        });

        // redefine the preExecute function for ping-pong particles computation
        primitive.preExecute = function () {
            // swap framebuffers before binding them
            var temp;

            temp = that.outputTextures.currentParticlesPosition;
            that.outputTextures.currentParticlesPosition = that.outputTextures.nextParticlesRandomized;
            that.outputTextures.nextParticlesRandomized = temp;

            // keep the outputTextures up to date
            this.commandToExecute.outputTextures = [
                that.outputTextures.nextParticlesPosition,
                that.outputTextures.particlesRelativeSpeed
            ];
        }

        return primitive;
    }

    WindParticleSystem.prototype.initParticlesRandomizePrimitive = function() {
        const that = this;
        const uniformMap = {
            currentParticlesPosition: function () {
                return that.outputTextures.currentParticlesPosition;
            },
            nextParticlesPosition: function () {
                return that.outputTextures.nextParticlesPosition;
            },
            particlesRelativeSpeed: function () {
                return that.outputTextures.particlesRelativeSpeed;
            },
            lonRange: function () {
                return that.uniformVariables.lonRange;
            },
            latRange: function () {
                return that.uniformVariables.latRange;
            },
            randomCoef: function () {
                var randomCoef = Math.random();
                return randomCoef;
            },
            dropRate: function () {
                return that.particleSystemOptions.dropRate;
            },
            dropRateBump: function () {
                return that.particleSystemOptions.dropRateBump;
            }
        }

        const fragmentShaderSource = new ShaderSource({
            sources: [WindRandomFS]
        });

        var primitive = new WindPrimitive({
            commandType: 'Compute',
            uniformMap: uniformMap,
            fragmentShaderSource: fragmentShaderSource,
            outputTextures: [
                this.outputTextures.currentParticlesRandomized,
                this.outputTextures.nextParticlesRandomized
            ]
        });

        primitive.preExecute = function () {
            // keep the outputTextures up to date
            this.commandToExecute.outputTextures = [
                that.outputTextures.currentParticlesRandomized,
                that.outputTextures.nextParticlesRandomized
            ];
        }

        return primitive;
    }

    WindParticleSystem.prototype.initSegmentsPrimitive = function() {
        const attributeLocations = {
            st: 0,
            normal: 1
        };

        const that = this;
        const uniformMap = {
            currentParticlesRandomized: function () {
                return that.outputTextures.currentParticlesRandomized;
            },
            nextParticlesRandomized: function () {
                return that.outputTextures.nextParticlesRandomized;
            },
            particlesRelativeSpeed: function () {
                return that.outputTextures.particlesRelativeSpeed;
            },
            colorTable: function () {
                return that.uniformVariables.colorTable;
            },
            particleHeight: function () {
                return that.particleSystemOptions.particleHeight;
            },
            aspect: function () {
                return that.context.drawingBufferWidth / that.context.drawingBufferHeight;
            },
            pixelSize: function () {
                return that.uniformVariables.pixelSize;
            },
            lineWidth: function () {
                return that.particleSystemOptions.lineWidth;
            }
        };

        const rawRenderState = WindUtil.createRawRenderState({
            // undefined value means let Cesium deal with it
            viewport: undefined,
            depthTest: {
                enabled: true
            },
            depthMask: true
        });

        const vertexShaderSource = new ShaderSource({
            sources: [WindSegmentDrawVS]
        });

        const fragmentShaderSource = new ShaderSource({
            sources: [WindSegmentDrawFS]
        });

        var primitive = new WindPrimitive({
            geometry: this.particleGeometry,
            attributeLocations: attributeLocations,
            primitiveType: PrimitiveType.TRIANGLES,
            uniformMap: uniformMap,
            vertexShaderSource: vertexShaderSource,
            fragmentShaderSource: fragmentShaderSource,
            rawRenderState: rawRenderState,
            framebuffer: this.framebuffers.segments,
            autoClear: true
        });

        // keep the framebuffer up to date
        primitive.preExecute = function () {
            this.clearCommand.framebuffer = that.framebuffers.segments;
            this.commandToExecute.framebuffer = that.framebuffers.segments;
        }

        return primitive;
    }

    WindParticleSystem.prototype.initTrailsPrimitive = function() {
        const attributeLocations = {
            position: 0,
            st: 1
        };

        const that = this;
        const uniformMap = {
            segmentsColorTexture: function () {
                return that.framebuffers.segments.getColorTexture(0);
            },
            segmentsDepthTexture: function () {
                return that.framebuffers.segments.depthTexture;
            },
            currentTrailsColor: function () {
                return that.framebuffers.currentTrails.getColorTexture(0);
            },
            trailsDepthTexture: function () {
                return that.framebuffers.currentTrails.depthTexture;
            },
            fadeOpacity: function () {
                return that.particleSystemOptions.fadeOpacity;
            }
        };

        const rawRenderState = WindUtil.createRawRenderState({
            viewport: undefined,
            depthTest: {
                enabled: true,
                func: DepthFunction.ALWAYS // always pass depth test for the full control of depth information
            },
            depthMask: true
        });

        // prevent Cesium from writing depth because the depth here should be written manually
        const vertexShaderSource = new ShaderSource({
            defines: ['DISABLE_GL_POSITION_LOG_DEPTH'],
            sources: [WindFullScreenVS]
        });

        const fragmentShaderSource = new ShaderSource({
            defines: ['DISABLE_LOG_DEPTH_FRAGMENT_WRITE'],
            sources: [WindTrailDrawFS]
        });

        var primitive = new WindPrimitive({
            geometry: WindUtil.getFullscreenQuad(),
            attributeLocations: attributeLocations,
            primitiveType: PrimitiveType.TRIANGLES,
            uniformMap: uniformMap,
            vertexShaderSource: vertexShaderSource,
            fragmentShaderSource: fragmentShaderSource,
            rawRenderState: rawRenderState,
            framebuffer: this.framebuffers.nextTrails,
            autoClear: true
        });

        // redefine the preExecute function for ping-pong trails render
        primitive.preExecute = function () {
            var temp;
            temp = that.framebuffers.currentTrails;
            that.framebuffers.currentTrails = that.framebuffers.nextTrails;
            that.framebuffers.nextTrails = temp;

            this.commandToExecute.framebuffer = that.framebuffers.nextTrails;
            this.clearCommand.framebuffer = that.framebuffers.nextTrails;
        }

        return primitive;
    }

    WindParticleSystem.prototype.initScreenPrimitive = function() {
        const attributeLocations = {
            position: 0,
            st: 1
        };

        const that = this;
        const uniformMap = {
            trailsColorTexture: function () {
                return that.framebuffers.nextTrails.getColorTexture(0);
            },
            trailsDepthTexture: function () {
                return that.framebuffers.nextTrails.depthTexture;
            }
        };

        const rawRenderState = WindUtil.createRawRenderState({
            viewport: undefined,
            depthTest: {
                enabled: false
            },
            depthMask: true,
            blending: {
                enabled: true
            }
        });

        // prevent Cesium from writing depth because the depth here should be written manually
        const vertexShaderSource = new ShaderSource({
            defines: ['DISABLE_GL_POSITION_LOG_DEPTH'],
            sources: [WindFullScreenVS]
        });

        const fragmentShaderSource = new ShaderSource({
            defines: ['DISABLE_LOG_DEPTH_FRAGMENT_WRITE'],
            sources: [WindScreenDrawFS]
        });

        var primitive = new WindPrimitive({
            geometry: WindUtil.getFullscreenQuad(),
            attributeLocations: attributeLocations,
            primitiveType: PrimitiveType.TRIANGLES,
            uniformMap: uniformMap,
            vertexShaderSource: vertexShaderSource,
            fragmentShaderSource: fragmentShaderSource,
            rawRenderState: rawRenderState,
            framebuffer: undefined // undefined value means let Cesium deal with it
        });

        return primitive;
    }

    WindParticleSystem.prototype.clearOutputFramebuffers = function() {
        this.clearCommand.framebuffer = this.framebuffers.segments;
        this.clearCommand.execute(this.context);

        this.clearCommand.framebuffer = this.framebuffers.currentTrails;
        this.clearCommand.execute(this.context);
        this.clearCommand.framebuffer = this.framebuffers.nextTrails;
        this.clearCommand.execute(this.context);
    }

    WindParticleSystem.prototype.destroyParticlesTextures = function() {
        this.outputTextures.currentParticlesPosition.destroy();
        this.outputTextures.nextParticlesPosition.destroy();
        this.outputTextures.particlesRelativeSpeed.destroy();
        this.outputTextures.currentParticlesRandomized.destroy();
        this.outputTextures.nextParticlesRandomized.destroy();
    }

    WindParticleSystem.prototype.refreshParticle = function(viewerParameters, maxParticlesChanged) {
        this.viewerParameters = viewerParameters;

        this.clearOutputFramebuffers();

        this.setComputeShaderParameters();

        var maxParticles = this.particleSystemOptions.maxParticles;
        var lonLatRange = this.viewerParameters.lonLatRange;
        this.particlesArray = WindDataProcess.randomizeParticleLonLatLev(maxParticles, lonLatRange);

        if (maxParticlesChanged) {
            this.particleGeometry = this.setupParticleGeometry();
            this.primitives.segments.setGeometry(this.context, this.particleGeometry);
        }

        this.destroyParticlesTextures();
        this.setupParticlesTextures();
    }

    WindParticleSystem.prototype.destroyAll = function() {
        this.uniformVariables.U.destroy();
        this.uniformVariables.V.destroy();
        this.uniformVariables.colorTable.destroy();

        this.destroyParticlesTextures();

        this.framebuffers.segments.destroy();
        this.framebuffers.currentTrails.destroy();
        this.framebuffers.nextTrails.destroy();
    }

    WindParticleSystem.prototype.canvasResize = function(cesiumContext) {
        this.destroyAll();

        this.context = cesiumContext;
        this.setupDataTextures();
        this.setupParticlesTextures();
        this.setupOutputFramebuffers();
    }

    WindParticleSystem.prototype.applyParticleSystemOptions = function(particleSystemOptions) {
        var maxParticlesChanged = false;
        if (this.particleSystemOptions.maxParticles != particleSystemOptions.maxParticles) {
            maxParticlesChanged = true;
        }

        this.particleSystemOptions = particleSystemOptions;
        this.particleSystemOptions.particlesTextureSize = Math.ceil(Math.sqrt(this.particleSystemOptions.maxParticles));
        this.particleSystemOptions.maxParticles = this.particleSystemOptions.particlesTextureSize * this.particleSystemOptions.particlesTextureSize;

        this.refreshParticle(this.viewerParameters, maxParticlesChanged);
    }

    return WindParticleSystem;
})
