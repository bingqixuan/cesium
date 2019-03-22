/*
 * @LastEditors: bingqixuan
 * @Date: 2019-02-26 11:20:24
 * @LastEditTime: 2019-03-22 17:19:51
 */

define([
    '../Core/Cartesian3',
    '../Core/Color',
    '../Core/ColorGeometryInstanceAttribute',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/DeveloperError',
    '../Core/GeometryInstance',
    '../Core/PolylineGeometry',
    '../Core/Resource',
    '../Core/VertexFormat',
    '../Scene/PerInstanceColorAppearance',
    '../Scene/PolylineColorAppearance',
    '../Scene/PolylineMaterialAppearance',
    '../Scene/Primitive',
    '../Scene/PrimitiveCollection'
], function(Cartesian3,
    Color,
    ColorGeometryInstanceAttribute,
    defaultValue,
    defined,
    DeveloperError,
    GeometryInstance,
    PolylineGeometry,
    Resource,
    VertexFormat,
    PerInstanceColorAppearance,
    PolylineColorAppearance,
    PolylineMaterialAppearance,
    Primitive,
    PrimitiveCollection
    ){
    'use strict';

    /**
     * 轨迹线类
     * @param {Object} options        参数
     * @param {Scene}  options.scene  地球场景
     * @param {Object} options.data   轨迹线数据
     * @param {JulianDate} options.currentTime 当前时间
     */
    function TripLayer(options){
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;

        if (!defined(options.data)) {
            throw new DeveloperError('options.data is required.');
        }
        this._data = options.data;
        this._currentTime = defaultValue(options.currentTime, Date.now() / 1000);
        this._polylines = this._scene.primitives.add(new PrimitiveCollection());



        if (typeof this._data === 'string') {
            Resource.fetchJson({
                url: this._data
            }).then((json)=> {
                this._data = json;
                var instances = [];
                this.createGeometryInstances(instances)
            });
        }
    }

    TripLayer.prototype.createGeometryInstances = function(instances){
        for (var i = 0; i < this._data.length; i++) {
            var color = getColor(this._data[i]);
            var lines = new Array();
            if(this._data[i].segments[0] instanceof Array){
                for(let vertex of this._data[i].segments){
                    lines = lines.concat(vertex);
                }
            }else{
                lines = this._data[i].segments;
            }
            var positions = Cartesian3.fromDegreesArrayHeights(lines);
            instances.push(new GeometryInstance({
                geometry: new PolylineGeometry({
                    positions: positions,
                    width: 1.0,
                    vertexFormat : VertexFormat.POSITION_AND_COLOR
                }),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(new Color(color[0]/255, color[1]/255, color[2]/255, 1.0))
                    // color: ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 0.0, 1.0))
                }
            }));
        }

        var tripFS =
        "varying vec4 v_color; \n" +
        "void main() { \n" +
        "   gl_FragColor = v_color; \n" +
        // "   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n" +
        "} \n";
         var appearance = new PolylineColorAppearance({
            fragmentShaderSource: tripFS,
            translucent : false
        });
        appearance.uniforms = {
            currentTime: ()=>{
                return Date.now() / 1000;
            },
            trailLength: function(){
                return 200;
            }
        };

        this._sightlinePrimitive = this._polylines.add(new Primitive({
            geometryInstances: instances,
            appearance: appearance,
            allowPicking: false
        }));
    }

    function getColor(item){
        return item.vendor === 0 ? [253, 128, 93] : [23, 184, 190];
    }
    return TripLayer;
});
