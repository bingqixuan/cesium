define([
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/GeometryInstance',
    '../Core/PixelFormat',
    '../Core/Rectangle',
    '../Core/RectangleGeometry',
    '../Scene/Material',
    '../Scene/MaterialAppearance',
    '../Scene/Primitive',
    '../Renderer/Framebuffer',
    '../Renderer/PixelDatatype',
    '../Renderer/Sampler',
    '../Renderer/Texture',
    '../Renderer/TextureMagnificationFilter',
    '../Renderer/TextureMinificationFilter',
    '../Renderer/TextureWrap'
],function(
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    GeometryInstance,
    PixelFormat,
    Rectangle,
    RectangleGeometry,
    Material,
    MaterialAppearance,
    Primitive,
    Framebuffer,
    PixelDatatype,
    Sampler,
    Texture,
    TextureMagnificationFilter,
    TextureMinificationFilter,
    TextureWrap
){

    'use strict';

    var drawVert = "precision mediump float;\n\nattribute float a_index;\n\nuniform sampler2D u_particles;\nuniform float u_particles_res;\n\nvarying vec2 v_particle_pos;\n\nvoid main() {\n    vec4 color = texture2D(u_particles, vec2(\n        fract(a_index / u_particles_res),\n        floor(a_index / u_particles_res) / u_particles_res));\n\n    // decode current particle position from the pixel's RGBA value\n    v_particle_pos = vec2(\n        color.r / 255.0 + color.b,\n        color.g / 255.0 + color.a);\n\n    gl_PointSize = 1.0;\n    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);\n}\n";

    var drawFrag = "precision mediump float;\n\nuniform sampler2D u_wind;\nuniform vec2 u_wind_min;\nuniform vec2 u_wind_max;\nuniform sampler2D u_color_ramp;\n\nvarying vec2 v_particle_pos;\n\nvoid main() {\n    vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg);\n    float speed_t = length(velocity) / length(u_wind_max);\n\n    // color ramp is encoded in a 16x16 texture\n    vec2 ramp_pos = vec2(\n        fract(16.0 * speed_t),\n        floor(16.0 * speed_t) / 16.0);\n\n    gl_FragColor = texture2D(u_color_ramp, ramp_pos);\n}\n";

    var quadVert = "precision mediump float;\n\nattribute vec2 a_pos;\n\nvarying vec2 v_tex_pos;\n\nvoid main() {\n    v_tex_pos = a_pos;\n    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);\n}\n";

    var screenFrag = "precision mediump float;\n\nuniform sampler2D u_screen;\nuniform float u_opacity;\n\nvarying vec2 v_tex_pos;\n\nvoid main() {\n    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);\n    // a hack to guarantee opacity fade out even with a value close to 1.0\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\n}\n";

    var updateFrag = "precision highp float;\n\nuniform sampler2D u_particles;\nuniform sampler2D u_wind;\nuniform vec2 u_wind_res;\nuniform vec2 u_wind_min;\nuniform vec2 u_wind_max;\nuniform float u_rand_seed;\nuniform float u_speed_factor;\nuniform float u_drop_rate;\nuniform float u_drop_rate_bump;\n\nvarying vec2 v_tex_pos;\n\n// pseudo-random generator\nconst vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);\nfloat rand(const vec2 co) {\n    float t = dot(rand_constants.xy, co);\n    return fract(sin(t) * (rand_constants.z + t));\n}\n\n// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation\nvec2 lookup_wind(const vec2 uv) {\n    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering\n    vec2 px = 1.0 / u_wind_res;\n    vec2 vc = (floor(uv * u_wind_res)) * px;\n    vec2 f = fract(uv * u_wind_res);\n    vec2 tl = texture2D(u_wind, vc).rg;\n    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;\n    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;\n    vec2 br = texture2D(u_wind, vc + px).rg;\n    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);\n}\n\nvoid main() {\n    vec4 color = texture2D(u_particles, v_tex_pos);\n    vec2 pos = vec2(\n        color.r / 255.0 + color.b,\n        color.g / 255.0 + color.a); // decode particle position from pixel RGBA\n\n    vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(pos));\n    float speed_t = length(velocity) / length(u_wind_max);\n\n    // take EPSG:4236 distortion into account for calculating where the particle moved\n    float distortion = cos(radians(pos.y * 180.0 - 90.0));\n    vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;\n\n    // update particle position, wrapping around the date line\n    pos = fract(1.0 + pos + offset);\n\n    // a random seed to use for the particle drop\n    vec2 seed = (pos + v_tex_pos) * u_rand_seed;\n\n    // drop rate is a chance a particle will restart at random position, to avoid degeneration\n    float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;\n    float drop = step(1.0 - drop_rate, rand(seed));\n\n    vec2 random_pos = vec2(\n        rand(seed + 1.3),\n        rand(seed + 2.1));\n    pos = mix(pos, random_pos, drop);\n\n    // encode the new particle position back into RGBA\n    gl_FragColor = vec4(\n        fract(pos * 255.0),\n        floor(pos * 255.0) / 255.0);\n}\n";

    var defaultRampColors = {
        0.0: '#3288bd',
        0.1: '#66c2a5',
        0.2: '#abdda4',
        0.3: '#e6f598',
        0.4: '#fee08b',
        0.5: '#fdae61',
        0.6: '#f46d43',
        1.0: '#d53e4f'
    };

    function WindLayer(options){
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;

        this.fadeOpacity = 0.996; // 每一帧的粒子轨迹消退的速率
        this.speedFactor = 0.25; // 粒子移动的速率
        this.dropRate = 0.003; // 粒子移动到随机位置的频率
        this.dropRateBump = 0.01; // 相对于单个粒子的速度的下降速率增加
        this._numParticles = undefined; // 粒子数量

        this._primitive = this._scene.primitives.add(new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0),
                    vertexFormat: MaterialAppearance.VERTEX_FORMAT
                })
            }),
            appearance: new MaterialAppearance(),
            show: true
        }));

        this.setColorRamp(defaultRampColors);
        this.resize();
    }
    defineProperties(WindLayer.prototype, {

        numParticles: {
            get : function() {
                return this._numParticles;
            },
            set : function(value) {
                // 我们创建一个正方形纹理，其中每个像素将含有一个编码为RGBA的粒子位置
                var particleRes = this.particleStateResolution = Math.ceil(Math.sqrt(value));
                this._numParticles = particleRes * particleRes;

                var particleState = new Uint8Array(this._numParticles * 4);
                for (var i = 0; i < particleState.length; i++) {
                    particleState[i] = Math.floor(Math.random() * 256); // 随机初始粒子位置
                }
                // 纹理保存当前和下一帧的粒子状态
                this.particleStateTexture0 = createTexture(this._scene.context, TextureMinificationFilter.NEAREST, TextureMagnificationFilter.NEAREST, particleState, particleRes, particleRes);
                this.particleStateTexture1 = createTexture(this._scene.context, TextureMinificationFilter.NEAREST, TextureMagnificationFilter.NEAREST, particleState, particleRes, particleRes);

                var particleIndices = new Float32Array(this._numParticles);
                for (var i$1 = 0; i$1 < this._numParticles; i$1++) { particleIndices[i$1] = i$1; }
                this.particleIndices = particleIndices;
            }
        },

    })

    WindLayer.prototype.resize = function() {
        var width = 800, height = 800;
        var emptyPixels = new Uint8Array(width * height * 4);
        // 屏幕纹理用于保存前一帧和当前帧的屏幕绘制
        this.backgroundTexture = createTexture(this._scene.context, TextureMinificationFilter.NEAREST, TextureMagnificationFilter.NEAREST, emptyPixels, width, height);
        this.screenTexture = createTexture(this._scene.context, TextureMinificationFilter.NEAREST, TextureMagnificationFilter.NEAREST, emptyPixels, width, height);
    };

    WindLayer.prototype.setColorRamp = function(colors) {
        // 查找纹理，根据粒子的速度为其着色
        this.colorRampTexture = createTexture(this._scene.context, TextureMinificationFilter.LINEAR, TextureMagnificationFilter.LINEAR, getColorRamp(colors), 16, 16);
    };

    WindLayer.prototype.setWind = function(windData) {
        this.windData = windData;
        this.windTexture = createTexture(this._scene.context, TextureMinificationFilter.LINEAR, TextureMagnificationFilter.LINEAR, windData.image, 360, 180);
    };

    WindLayer.prototype.draw = function(){
        this.drawScreen();
        //this.updateParticles();
    }

    WindLayer.prototype.drawScreen = function() {
        var context = this._scene.context;
        // 将屏幕绘制到临时framebuffer中，以便在下一帧中将其保留为背景
        this.framebuffer = bindFramebuffer(context, this.screenTexture);

        this.drawTexture(this.backgroundTexture, this.fadeOpacity);
        // this.drawParticles();

        // bindFramebuffer(gl, null);
        // // enable blending to support drawing on top of an existing background (e.g. a map)
        // gl.enable(gl.BLEND);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // this.drawTexture(this.screenTexture, 1.0);
        // gl.disable(gl.BLEND);


        var fs = 'uniform float u_fadeOpacity; \n' +
            'uniform sampler2D u_colorRamp; \n' +
            'varying vec2 v_st; \n' +
            'void main(){ \n' +
            '   vec4 color = texture2D(u_colorRamp, v_st); \n' +
            '   gl_FragColor = color; \n' +
            '} \n';
        var appearance = new MaterialAppearance({
            flat: true,
            fragmentShaderSource: fs
        })
        appearance.uniforms = {
            u_colorRamp: this.backgroundTexture,
            u_fadeOpacity: this.fadeOpacity
        };
        this._primitive.appearance = appearance;

        // save the current screen as the background for the next frame
        var temp = this.backgroundTexture;
        this.backgroundTexture = this.screenTexture;
        this.screenTexture = temp;
    };

    WindLayer.prototype.drawTexture = function(texture, opacity) {
        var gl = this.gl;
        var program = this.screenProgram;
        gl.useProgram(program.program);

        bindAttribute(gl, this.quadBuffer, program.a_pos, 2);
        bindTexture(gl, texture, 2);
        gl.uniform1i(program.u_screen, 2);
        gl.uniform1f(program.u_opacity, opacity);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    function getColorRamp(colors) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 1;

        var gradient = ctx.createLinearGradient(0, 0, 256, 0);
        for (var stop in colors) {
            gradient.addColorStop(+stop, colors[stop]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 1);

        return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
    }

    function createTexture(context, minificationFilter, magnificationFilter, data, width, height){
        var texture = new Texture({
            context: context,
            width : width,
            height : height,
            pixelFormat: PixelFormat.RGBA,
            pixelDatatype: PixelDatatype.UNSIGNED_BUTE,
            sampler: new Sampler({
                wrapS: TextureWrap.CLAMP_TO_EDGE,  // 默认值
                wrapT: TextureWrap.CLAMP_TO_EDGE,
                minificationFilter: minificationFilter,
                magnificationFilter: magnificationFilter
            })
        });
        if (data instanceof Uint8Array) {
            texture.copyFrom({
                width : width,
                height : height,
                arrayBufferView : data
            });
        } else {
            texture.copyFrom(data);
        }

        return texture;
    }

    function bindFramebuffer(context, texture) {
        return new Framebuffer({
            context: context,
            colorTextures: [texture],
            destroyAttachments: false
        });
    }

    return WindLayer;
})
