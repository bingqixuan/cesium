/**
 * Created by bingqx on 2018/1/9.
 */
define([
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/ColorGeometryInstanceAttribute',
    '../Core/CircleGeometry',
    '../Core/DeveloperError',
    '../Core/EllipseGeometry',
    '../Core/Geometry',
    '../Core/GeometryInstance',
    '../Core/Math',
    '../Core/VertexFormat',
    '../Scene/ClassificationType',
    '../Scene/GroundPrimitive',
    '../Scene/Material',
    '../Scene/MaterialAppearance',
    '../Scene/PerInstanceColorAppearance',
    '../Scene/PointPrimitiveCollection',
    '../Scene/Primitive'
], function (Color,
             defaultValue,
             defined,
             ColorGeometryInstanceAttribute,
             CircleGeometry,
             DeveloperError,
             EllipseGeometry,
             Geometry,
             GeometryInstance,
             Math,
             VertexFormat,
             ClassificationType,
             GroundPrimitive,
             Material,
             MaterialAppearance,
             PerInstanceColorAppearance,
             PointPrimitiveCollection,
             Primitive) {
    'use strict';

    /**
     * 波纹散射效果
     *
     * @alias ScatterEffect
     *
     * @param {Object} options
     * @param {Scene} options.scene 场景
     * @param {Cartesian3[]} options.positions 位置数组,可以一次性创建多个
     * @param {Number} [options.animationSpeed=4] 动画的速度,v > 0
     * @param {Number} [options.radius=1000] 标记的大小
     * @param {Number} [options.color=Color.YELLOW] 标记颜色
     * @constructor
     */
    function ScatterEffect(options) {
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required!');
        }
        this._scene = options.scene;
        if (!defined(options.positions)) {
            throw new DeveloperError('options.position is required!');
        }
        this._positions = options.positions;
        this._animationSpeed = defaultValue(options.animationSpeed, 1);
        if(options.animationSpeed < 0){
            throw new DeveloperError('options.rate must be more than 0');
        }
        this._radius = defaultValue(options.radius, 1000000);
        this._color = defaultValue(options.color, Color.YELLOW);
        this._time = 0.01;

        init(this);
    }

    function init(scatterEffect) {
        var length = scatterEffect._positions.length;
        var geometryArray = [];
        for(var i = 0; i < length; ++i){
            var geometry = new CircleGeometry({
                center: scatterEffect._positions[i],
                radius: scatterEffect._radius,
                vertexFormat: MaterialAppearance.VERTEX_FORMAT
            });
            geometryArray.push(new GeometryInstance({
                geometry: geometry
            }));
        }

        scatterEffect._primitive = scatterEffect._scene.primitives.add(new Primitive({
                geometryInstances: geometryArray,
                appearance: new MaterialAppearance({
                    material: new Material({
                        fabric: {
                            type: 'ScatterEffect',
                            uniforms: {
                                color: scatterEffect._color,
                                time: scatterEffect._time
                            }
                        }
                    }),
                    faceForward: false
                })
            })
        );

        scatterEffect._primitive._insertFuncInUpdate = function () {
            scatterEffect._primitive.appearance._renderState.depthTest.enabled = false;
            scatterEffect._time += scatterEffect._animationSpeed * 0.01;
            if(scatterEffect._time > 1.0){
                scatterEffect._time = 0.01;
            }
            scatterEffect._primitive.appearance.material.uniforms.time = scatterEffect._time;
        };
    }

    return ScatterEffect;
});
