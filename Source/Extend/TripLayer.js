/*
 * @LastEditors: bingqixuan
 * @Date: 2019-03-23 18:29:12
 * @LastEditTime: 2019-03-24 16:39:34
 */
/*
 * @LastEditors: bingqixuan
 * @Date: 2019-02-26 11:20:24
 * @LastEditTime: 2019-04-15 15:07:14
 */

define([
    '../Core/BoundingSphere',
    '../Core/Cartesian3',
    '../Core/Color',
    '../Core/ColorGeometryInstanceAttribute',
    '../Core/ComponentDatatype',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/DeveloperError',
    '../Core/Geometry',
    '../Core/GeometryAttribute',
    '../Core/GeometryInstance',
    '../Core/PrimitiveType',
    '../Core/Resource',
    '../Scene/PerInstanceColorAppearance',
    '../Scene/Primitive',
    '../Scene/PrimitiveCollection'
], function(BoundingSphere,
    Cartesian3,
    Color,
    ColorGeometryInstanceAttribute,
    ComponentDatatype,
    defaultValue,
    defined,
    destroyObject,
    DeveloperError,
    Geometry,
    GeometryAttribute,
    GeometryInstance,
    PrimitiveType,
    Resource,
    PerInstanceColorAppearance,
    Primitive,
    PrimitiveCollection
) {
    'use strict';

    /**
     * 轨迹线类
     * @param {Object} options        参数
     * @param {Scene}  options.scene  地球场景
     * @param {Object} options.data   轨迹线数据
     */
    function TripLayer(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;

        if (!defined(options.data)) {
            throw new DeveloperError('options.data is required.');
        }
        this._data = options.data;
        this._polylines = this._scene.primitives.add(new PrimitiveCollection());



        if (typeof this._data === 'string') {
            Resource.fetchJson({
                url: this._data
            }).then((json) => {
                this._data = json;
                var instances = [];
                this.createGeometryInstances(instances)
            });
        }else{
            var instances = [];
            this.createGeometryInstances(instances)
        }
    }

    TripLayer.prototype.createGeometryInstances = function(instances) {
        for (var i = 0; i < this._data.length; i++) {
            var color = getColor(this._data[i]);
            var lines = new Array();
            var postimes = new Array();
            if (this._data[i].segments[0] instanceof Array) {
                for (let vertex of this._data[i].segments) {
                    lines = lines.concat([vertex[0], vertex[1]]);
                    postimes.push(vertex[2]);
                }
            }
            var positions = Cartesian3.fromDegreesArray(lines);
            positions = new Float64Array(Cartesian3.packArray(positions));
            postimes = new Float64Array(postimes);
            var l = this._data[i].segments.length;
            var indices = new Uint16Array(l * 2 - 2);
            var index = 1;
            for (var j = 1; j < l - 1; j++) {
                indices[index++] = j;
                indices[index++] = j;
            }
            indices[index] = l - 1;

            var geometry = new Geometry({
                attributes : {
                  position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : positions
                  }),
                  postime: new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : postimes
                  })
                },
                indices : indices,
                primitiveType : PrimitiveType.LINES,
                boundingSphere : BoundingSphere.fromVertices(positions)
            });

            instances.push(new GeometryInstance({
                geometry: geometry,
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(new Color(color[0] / 255, color[1] / 255, color[2] / 255, 1.0))
                    // color: ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 0.0, 1.0))
                }
            }));
        }

        var tripVS = "attribute vec3 position3DHigh;\n\
        attribute vec3 position3DLow;\n\
        attribute float postime;\n\
        attribute vec4 color;\n\
        attribute float batchId;\n\
        uniform float currentTime;\n\
        uniform float trailLength;\n\
        \n\
        varying float v_time;\n\
        varying vec4 v_color;\n\
        \n\
        void main()\n\
        {\n\
            vec4 p = czm_computePosition();\n\
        \n\
            v_color = color;\n\
            v_time = 1.0 - (currentTime - postime) / trailLength;\n\
        \n\
            gl_Position = czm_modelViewProjectionRelativeToEye * p;\n\
        }\n\
        ";
        var tripFS =
            "varying vec4 v_color; \n" +
            "varying float v_time; \n" +
            // "uniform float currentTime; \n" +
            "void main() { \n" +
            "   if ( v_time < 0.0 || v_time > 1.0) { \n" +
            "       discard; \n" +
            // "       gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n" +
            "   } \n" +
            "   gl_FragColor = vec4(v_color.rgb, v_color.a * v_time); \n" +
            // "   gl_FragColor = vec4(currentTime); \n" +
            "} \n";

        var appearance = new PerInstanceColorAppearance({
            flat : true,
            translucent : false,
            vertexShaderSource: tripVS,
            fragmentShaderSource: tripFS
        });


        appearance.uniforms = {
            currentTime: function(){
                var loopLength = 1800, animationSpeed = 30;
                const timestamp = Date.now() / 1000;
                const loopTime = loopLength / animationSpeed;
                return ((timestamp % loopTime) / loopTime) * loopLength;
            },
            trailLength: 200
        };

        this._polylines.add(new Primitive({
            geometryInstances: instances,
            appearance: appearance,
            // appearance : new PerInstanceColorAppearance({
            //     flat : true,
            //     translucent : false,
            //     vertexShaderSource: tripVS
            // }),
            allowPicking: false,
            asynchronous: false
        }));
    }


    /**
     * @description: 销毁轨迹对象
     * @param {type}
     * @return: undefined
     */
    TripLayer.prototype.destroy = function(){
        this._scene.primitives.remove(this._polylines);
        return destroyObject(this);
    }

    function getColor(item) {
        return item.vendor === 0 ? [253, 128, 93] : [23, 184, 190];
    }
    return TripLayer;
});
