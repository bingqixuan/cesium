/**
 * Created by bingqixuan on 2019/2/26.
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
        this._currentTime = options.currentTime;
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
                    width: 3.0
                }),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(new Color(color[0], color[1], color[2]))
                }
            }));
        }

        var tripFS = "void main() { \n" +
        "   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n" +
        "} \n";
        var appearance = new PolylineMaterialAppearance({
            // vertexShaderSource: SightlineAppearanceVS,
            fragmentShaderSource: tripFS
        });
        appearance.uniforms = {

        };

        this._sightlinePrimitive = this._polylines.add(new Primitive({
            geometryInstances: instances,
            // appearance: appearance,
            appearance: new PolylineColorAppearance({
                translucent : false
            }),
            allowPicking: false
        }));
    }

    function getColor(item){
        return item.vendor === 0 ? [253, 128, 93] : [23, 184, 190];
    }
    return TripLayer;
});
