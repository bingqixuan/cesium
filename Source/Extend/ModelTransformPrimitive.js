/**
 * Created by bingqixuan on 2018/9/12.
 */
define([
    '../Core/Cartesian3',
    '../Core/Color',
    '../Core/ColorGeometryInstanceAttribute',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/GeometryInstance',
    '../Core/Math',
    '../Core/Matrix4',
    '../Core/PolylineGeometry',
    '../Scene/Material',
    '../Scene/PolylineColorAppearance',
    '../Scene/PolylineMaterialAppearance',
    '../Scene/Primitive',
    '../Scene/PrimitiveCollection'
], function(
    Cartesian3,
    Color,
    ColorGeometryInstanceAttribute,
    defaultValue,
    defined,
    destroyObject,
    GeometryInstance,
    CesiumMath,
    Matrix4,
    PolylineGeometry,
    Material,
    PolylineColorAppearance,
    PolylineMaterialAppearance,
    Primitive,
    PrimitiveCollection) {
    'use strict';

    /**
     * Draws the axes of a reference frame defined by a matrix that transforms to world
     * coordinates, i.e., Earth's WGS84 coordinates.  The most prominent example is
     * a primitives <code>modelMatrix</code>.
     * <p>
     * The X axis is red; Y is green; and Z is blue.
     * </p>
     * <p>
     * This is for debugging only; it is not optimized for production use.
     * </p>
     *
     * @alias ModelTransformPrimitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.length=10000000.0] The length of the axes in meters.
     * @param {Number} [options.width=2.0] The width of the axes in pixels.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 matrix that defines the reference frame, i.e., origin plus axes, to visualize.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick}
     *
     * @example
     * primitives.add(new Cesium.ModelTransformPrimitive({
     *   modelMatrix : primitive.modelMatrix,  // primitive to debug
     *   length : 100000.0,
     *   width : 10.0
     * }));
     */
    function ModelTransformPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The length of the axes in meters.
         *
         * @type {Number}
         * @default 10000000.0
         */
        this.length = defaultValue(options.length, 10000000.0);
        this._length = undefined;

        /**
         * The width of the axes in pixels.
         *
         * @type {Number}
         * @default 2.0
         */
        this.width = defaultValue(options.width, 2.0);
        this._width = undefined;

        /**
         * Determines if this primitive will be shown.
         *
         * @type Boolean
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * The 4x4 matrix that defines the reference frame, i.e., origin plus axes, to visualize.
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._modelMatrix = new Matrix4();

        /**
         * User-defined value returned when the primitive is picked.
         *
         * @type {*}
         * @default undefined
         *
         * @see Scene#pick
         */
        this.id = options.id;
        this._id = undefined;

        this._primitive = undefined;
    }

    /**
     * @private
     */
    ModelTransformPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        if (!defined(this._primitive) ||
            (!Matrix4.equals(this._modelMatrix, this.modelMatrix)) ||
            (this._length !== this.length) ||
            (this._width !== this.width) ||
            (this._id !== this.id)) {

            this._modelMatrix = Matrix4.clone(this.modelMatrix, this._modelMatrix);
            this._length = this.length;
            this._width = this.width;
            this._id = this.id;

            if (defined(this._primitive)) {
                this._primitive.destroy();
            }

            // Workaround projecting (0, 0, 0)
            if ((this.modelMatrix[12] === 0.0 && this.modelMatrix[13] === 0.0 && this.modelMatrix[14] === 0.0)) {
                this.modelMatrix[14] = 0.01;
            }

            var x = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        Cartesian3.ZERO,
                        new Cartesian3(2, 0, 0)
                    ],
                    width : this.width,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT,
                    colors : [
                        Color.RED,
                        Color.RED
                    ],
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id + 'x'
            });
            var y = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        Cartesian3.ZERO,
                        new Cartesian3(0, 2, 0)
                    ],
                    width : this.width,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT,
                    colors : [
                        Color.GREEN,
                        Color.GREEN
                    ],
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id + 'y'
            });
            var z = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        Cartesian3.ZERO,
                        new Cartesian3(0, 0, 2)
                    ],
                    width : this.width,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT,
                    colors : [
                        Color.BLUE,
                        Color.BLUE
                    ],
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id + 'z'
            });

            var xyPositions = [], xzPositions = [], yzPositions = [];
            for (var i = 0; i <= 90; i += 3) {
                var radians = CesiumMath.toRadians(i);
                xyPositions.push(new Cartesian3(Math.cos(radians), Math.sin(radians), 0));
                xzPositions.push(new Cartesian3(Math.cos(radians), 0, Math.sin(radians)));
                yzPositions.push(new Cartesian3(0, Math.cos(radians), Math.sin(radians)));
            }
            var xy = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : xyPositions,
                    width : this.width / 2,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT,
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id + 'xy',
            });

            var xz = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : xzPositions,
                    width : this.width / 2,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT,
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id + 'xz',
            });

            var yz = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : yzPositions,
                    width : this.width / 2,
                    vertexFormat : PolylineMaterialAppearance.VERTEX_FORMAT,
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id + 'yz'
            });

            this._primitive = new PrimitiveCollection();
            var params = [{color: Color.RED, axis: x}, {color: Color.GREEN, axis: y}, {color: Color.BLUE, axis: z}];
            for(var i = 0; i < params.length; ++i){
                var primitive = new Primitive({
                    geometryInstances : params[i].axis,
                    appearance : new PolylineMaterialAppearance({
                        material : new Material({
                            fabric: {
                                type: 'PolylineArrow',
                                uniforms: {
                                    color: params[i].color
                                }
                            }
                        })
                    }),
                    asynchronous : false
                });
                primitive._id = params[i].axis.id;
                this._primitive.add(primitive);
            }
            var xypri = new Primitive({
                geometryInstances : xy,
                appearance : new PolylineMaterialAppearance({
                    material : new Material({
                        fabric: {
                            type: 'Color',
                            uniforms: {
                                color: Color.BLUE
                            }
                        }
                    })
                }),
                asynchronous : false
            });
            xypri._id = xy.id;
            var xzpri = new Primitive({
                geometryInstances : xz,
                appearance : new PolylineMaterialAppearance({
                    material : new Material({
                        fabric: {
                            type: 'Color',
                            uniforms: {
                                color: Color.GREEN
                            }
                        }
                    })
                }),
                asynchronous : false
            });
            xzpri._id = xz.id;
            var yzpri = new Primitive({
                geometryInstances : yz,
                appearance : new PolylineMaterialAppearance({
                    material : new Material({
                        fabric: {
                            type: 'Color',
                            uniforms: {
                                color: Color.RED
                            }
                        }
                    })
                }),
                asynchronous : false
            });
            yzpri._id = yz.id;
            this._primitive.add(xypri);
            this._primitive.add(xzpri);
            this._primitive.add(yzpri);

        }
        this._primitive.update(frameState);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see ModelTransformPrimitive#destroy
     */
    ModelTransformPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * p = p && p.destroy();
     *
     * @see ModelTransformPrimitive#isDestroyed
     */
    ModelTransformPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return ModelTransformPrimitive;
});
