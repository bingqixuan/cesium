/**
 * Created by bingqixuan on 2018/9/26.
 */
define([
    '../Core/Cartesian3',
    '../Core/Color',
    '../Core/ColorGeometryInstanceAttribute',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/DeveloperError',
    '../Core/Math',
    '../Scene/Camera',
    '../Scene/DebugCameraPrimitive',
    '../Scene/Primitive',
    '../Scene/ShadowMap'
],function (
    Cartesian3,
    Color,
    ColorGeometryInstanceAttribute,
    defined,
    destroyObject,
    DeveloperError,
    CesiumMath,
    Camera,
    DebugCameraPrimitive,
    Primitive,
    ShadowMap
) {
    'use strict';

    /**
     * 视域分析
     * @param options
     * @constructor
     */
    function ViewShed(options) {
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;
        this._viewCamera = new Camera(this._scene);
        this._scene.globe.depthTestAgainstTerrain = true;
    }

    /**
     * 设置视域分析的视点位置
     * @param {Cartesian3} viewPosition  视点位置坐标
     */
    ViewShed.prototype.setViewPosition = function (viewPosition) {
        if (!defined(viewPosition)) {
            throw new DeveloperError('视点位置获取失败');
        }
        this._viewPosition = viewPosition;
    };

    /**
     * 设置视域分析的目标点位置
     * @param targetPosition
     */
    ViewShed.prototype.setTargetPosition = function (targetPosition) {
        if (!defined(targetPosition)) {
            throw new DeveloperError('位置获取失败');
        }
        this._targetPosition = targetPosition;

        var distance = Cartesian3.distance(this._viewPosition, this._targetPosition);
        if (distance <= 0) {
            return;
        }

        this._viewCamera.position = this._viewPosition;
        this._viewCamera.direction = Cartesian3.subtract(this._targetPosition, this._viewPosition, new Cartesian3());
        this._viewCamera.frustum.fov = CesiumMath.PI_OVER_SIX;
        this._viewCamera.frustum.aspectRatio = 1.0;
        this._viewCamera.frustum.near = 1.0;
        this._viewCamera.frustum.far = distance;

        this._scene.shadowMap.destroy();
        this._scene.shadowMap = new ShadowMap({
            context : this._scene.context,
            lightCamera : this._viewCamera,
            cascadesEnabled : false
        });
        this._scene.shadowMap._isViewShed = true;
        this._scene.shadowMap.enabled = true;

        if(this._viewCameraPrimitive){
            this._scene.primitives.remove(this._viewCameraPrimitive);
        }
        this._viewCameraPrimitive = this._scene.primitives.add(new DebugCameraPrimitive({
            camera: this._viewCamera,
            color: Color.YELLOW
        }));
    };

    ViewShed.prototype.destroy = function () {
        if(this._viewCameraPrimitive){
            this._scene.primitives.remove(this._viewCameraPrimitive);
        }
        this._scene.shadowMap.destroy();
        return destroyObject(this);
    };

    return ViewShed;
});
