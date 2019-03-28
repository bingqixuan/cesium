/*
 * @LastEditors: bingqixuan
 * @Date: 2019-03-27 18:17:10
 * @LastEditTime: 2019-03-28 17:11:25
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
     * @description: 风可视化图层。采用彩色地图来显示每个像素处的风速(从数据集内插)；
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
        this._windLayer = this._scene.primitives.add(new PrimitiveCollection());

        if (typeof this._data === 'string') {
            Resource.fetchJson({
                url: this._data
            }).then((json) => {
                this._data = json;
                this._createFill();
            });
        }else{
            this._createFill();
        }

    }

    WindLayer.prototype._createFill = function(){
        var ramp = createColorRamp(this._scene);
        var appearance = new EllipsoidSurfaceAppearance({
            aboveGround: false,
            material: new Material({
                fabric: {
                    uniforms: {
                        u_wind: this._data.tiles[0],
                        u_wind_res: new Cartesian2(this._data.width, this._data.height),
                        u_wind_min: new Cartesian2(this._data.uMin, this._data.vMin),
                        u_wind_max: new Cartesian2(this._data.uMax, this._data.vMax),
                        u_color_ramp: ramp
                    },
                    materials: {
                        bumpMap: {
                            type: 'BumpMap'
                            // uniforms: {
                            //     image: '../images/earthbump1k.jpg'
                            // }
                        }
                    },
                    source: 'czm_material czm_getMaterial(czm_materialInput materialInput) { \n' +
                        '    czm_material material = czm_getDefaultMaterial(materialInput); \n' +
                        // '    vec4 color; \n' +
                        // '    float heightValue = texture2D(heightField, materialInput.st).r; \n' +
                        // '    color.rgb = mix(vec3(0.2, 0.6, 0.2), vec3(1.0, 0.5, 0.2), heightValue); \n' +
                        // '    color.a = (1.0 - texture2D(image, materialInput.st).r) * 0.7; \n' +
                        '    vec2 px = 1.0 / u_wind_res; \n' +
                        '    vec2 vc = (floor(materialInput.st * u_wind_res)) * px; \n' +
                        '    vec2 f = fract(materialInput.st * u_wind_res); \n' +
                        '    vec2 tl = texture2D(u_wind, vc).rg; \n' +
                        '    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg; \n' +
                        '    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg; \n' +
                        '    vec2 br = texture2D(u_wind, vc + px).rg; \n' +
                        '    vec2 windSpeedRelative = mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y); \n' +
                        '    vec2 windSpeed = mix(u_wind_min, u_wind_max, windSpeedRelative); \n' +
                        '    float speed_t = length(windSpeed / length(u_wind_max)); \n' +
                        '    vec2 ramp_pos = vec2(fract(16.0 * speed_t), floor(16.0 * speed_t) / 16.0); \n' +
                        '    vec4 color = texture2D(u_color_ramp, ramp_pos); \n' +
                        '    material.diffuse = color.rgb; \n' +
                        '    material.alpha = color.a; \n' +
                        // '    material.normal = bumpMap.normal; \n' +
                        // '    material.specular = step(0.1, heightValue); \n' + // Specular mountain tops
                        // '    material.shininess = 8.0; \n' + // Sharpen highlight
                        '    return material; \n' +
                        '} \n'
                }
            })
            // fragmentShaderSource: windFS
        });
        this._windLayer.add(new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0),
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT
                })
            }),
            appearance: appearance,
            show: true
        }));
    };

    function createColorRamp(scene) {
        var colorData =
                '50,136,189,255,51,137,188,255,52,138,187,255,53,140,187,255,55,141,186,255,56,143,186,255,57,144,185,255,58,146,184,255,60,147,184,255,61,148,183,255,62,150,183,255,64,151,182,255,65,153,181,255,66,154,181,255,67,156,180,255,69,157,180,255,70,158,179,255,71,160,178,255,73,161,178,255,74,163,177,255,75,164,177,255,76,166,176,255,78,167,175,255,79,168,175,255,80,170,174,255,82,171,174,255,83,173,173,255,84,174,173,255,85,176,172,255,87,177,171,255,88,178,171,255,89,180,170,255,91,181,170,255,92,183,169,255,93,184,168,255,94,186,168,255,96,187,167,255,97,188,167,255,98,190,166,255,100,191,165,255,101,193,165,255,102,194,164,255,104,194,164,255,106,195,164,255,107,196,164,255,109,196,164,255,111,197,164,255,112,198,164,255,114,198,164,255,116,199,164,255,118,200,164,255,119,200,164,255,121,201,164,255,123,202,164,255,124,202,164,255,126,203,164,255,128,204,164,255,129,204,164,255,131,205,164,255,133,206,164,255,135,206,164,255,136,207,164,255,138,208,164,255,140,208,164,255,141,209,164,255,143,210,164,255,145,210,164,255,146,211,164,255,148,212,164,255,150,212,164,255,152,213,164,255,153,214,164,255,155,214,164,255,157,215,164,255,158,216,164,255,160,216,164,255,162,217,164,255,163,218,164,255,165,218,164,255,167,219,164,255,169,220,164,255,170,220,164,255,172,221,163,255,173,222,163,255,175,222,163,255,176,223,162,255,178,223,162,255,179,224,162,255,181,225,161,255,182,225,161,255,183,226,161,255,185,226,161,255,186,227,160,255,188,228,160,255,189,228,160,255,191,229,159,255,192,229,159,255,194,230,159,255,195,230,159,255,197,231,158,255,198,232,158,255,199,232,158,255,201,233,157,255,202,233,157,255,204,234,157,255,205,235,156,255,207,235,156,255,208,236,156,255,210,236,156,255,211,237,155,255,213,238,155,255,214,238,155,255,215,239,154,255,217,239,154,255,218,240,154,255,220,241,153,255,221,241,153,255,223,242,153,255,224,242,153,255,226,243,152,255,227,244,152,255,229,244,152,255,230,244,151,255,230,244,151,255,231,243,151,255,231,243,150,255,232,242,150,255,233,242,150,255,233,241,149,255,234,241,149,255,234,240,149,255,235,240,149,255,236,239,148,255,236,239,148,255,237,238,148,255,237,238,147,255,238,237,147,255,239,237,147,255,239,236,146,255,240,236,146,255,240,235,146,255,241,234,145,255,242,234,145,255,242,233,145,255,243,233,144,255,243,232,144,255,244,232,144,255,244,231,143,255,245,231,143,255,246,230,143,255,246,230,142,255,247,229,142,255,247,229,142,255,248,228,141,255,249,228,141,255,249,227,141,255,250,227,140,255,250,226,140,255,251,226,140,255,252,225,140,255,252,225,139,255,253,224,139,255,253,224,139,255,253,223,138,255,253,221,137,255,253,220,136,255,253,219,135,255,253,218,134,255,253,216,133,255,253,215,131,255,253,214,130,255,253,213,129,255,253,211,128,255,253,210,127,255,253,209,126,255,253,208,125,255,253,207,124,255,253,205,123,255,253,204,122,255,253,203,121,255,253,202,120,255,253,200,119,255,253,199,118,255,253,198,117,255,253,197,116,255,253,195,115,255,253,194,114,255,253,193,113,255,253,192,112,255,253,191,111,255,253,189,110,255,253,188,109,255,253,187,108,255,253,186,107,255,253,184,106,255,253,183,105,255,253,182,104,255,253,181,102,255,253,179,101,255,253,178,100,255,253,177,99,255,253,176,98,255,253,174,97,255,252,173,96,255,252,172,96,255,252,170,95,255,252,168,94,255,252,167,93,255,251,165,93,255,251,164,92,255,251,162,91,255,251,160,90,255,250,159,90,255,250,157,89,255,250,156,88,255,250,154,87,255,250,152,87,255,249,151,86,255,249,149,85,255,249,148,85,255,249,146,84,255,248,144,83,255,248,143,82,255,248,141,82,255,248,140,81,255,248,138,80,255,247,136,79,255,247,135,79,255,247,133,78,255,247,131,77,255,246,130,76,255,246,128,76,255,246,127,75,255,246,125,74,255,246,123,73,255,245,122,73,255,245,120,72,255,245,119,71,255,245,117,70,255,244,115,70,255,244,114,69,255,244,112,68,255,244,111,67,255,244,109,67,255,243,108,67,255,243,108,67,255,243,108,67,255,243,107,67,255,243,107,67,255,242,107,67,255,242,107,67,255,242,106,67,255,242,106,67,255,242,106,67,255,241,105,67,255,241,105,67,255';

        var colorRampData = new Uint8ClampedArray(256 * 4);
        var colorArr = colorData.split(',');
        for (var i = 0; i < 256 * 4; i++) {
            colorRampData[i] = colorArr[i];
        }

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = 16;
        canvas.height = 16;
        var imageData = new ImageData(colorRampData, 16, 16);
        ctx.putImageData(imageData, 0, 0);

        var colorTexture = new Texture({
            context: scene.context,
            width: 16,
            height: 16,
            pixelFormat: PixelFormat.RGBA,
            pixelDatatype: PixelDatatype.UNSIGNED_BUTE,
            sampler: new Sampler({
                // wrapS: TextureWrap.CLAMP_TO_EDGE,  // 默认值
                // wrapT: TextureWrap.CLAMP_TO_EDGE,
                minificationFilter: TextureMinificationFilter.NEAREST,
                magnificationFilter: TextureMagnificationFilter.NEAREST
            })
        });
        colorTexture.copyFrom(canvas);
        return canvas;
    }

    return WindLayer;
 });
