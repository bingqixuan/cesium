/**
 * Created by bingqixuan on 2018/9/29.
 */
define([
    './ModelTransformPrimitive',
    '../Core/Cartesian3',
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/DeveloperError',
    '../Core/Ellipsoid',
    '../Core/HeadingPitchRoll',
    '../Core/Math',
    '../Core/Matrix4',
    '../Core/Quaternion',
    '../Core/ScreenSpaceEventHandler',
    '../Core/ScreenSpaceEventType',
    '../Core/Transforms',
], function (
    ModelTransformPrimitive,
    Cartesian3,
    Color,
    defaultValue,
    defined,
    DeveloperError,
    Ellipsoid,
    HeadingPitchRoll,
    CesiumMath,
    Matrix4,
    Quaternion,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    Transforms
) {
    'use strict';

    function ModelTransformControl(options) {
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required!');
        }
        this._scene = options.scene;
        if (!defined(options.position)) {
            throw new DeveloperError('options.position is required!');
        }
        this._position = options.position;
        if (!defined(options.model)) {
            throw new DeveloperError('options.model is required!');
        }
        this._model = options.model;

        // 矩阵变换参数
        this._transformations = {
            translation : new Cartesian3(),
            hpr: new HeadingPitchRoll(),
            scale: new Cartesian3(1.0, 1.0, 1.0)
        };
        this._init();
    }

    ModelTransformControl.prototype._init = function () {
        var modelMatrix = Transforms.headingPitchRollToFixedFrame(this._position, this._transformations.hpr, Ellipsoid.WGS84, Transforms.eastNorthUpToFixedFrame);
        this._transPrimitive = this._scene.primitives.add(new ModelTransformPrimitive({
            modelMatrix: modelMatrix,
            length: 300.0,
            width: 10.0,
            id: 'control_'
        }));

        var axisID;
        var pri, currentPosition, lastPosition;
        var handler = new ScreenSpaceEventHandler(this._scene.canvas);
        var that = this;
        handler.setInputAction(function(movement) {
            pri = that._scene.pick(movement.position);
            if(pri && pri.primitive._id.split('_').includes('control')){
                changeColor(pri.primitive._id, that._transPrimitive);
                axisID = pri.primitive._id;
                currentPosition = lastPosition = Cartesian3.clone(that._scene.pickPosition(movement.position));
            }
        }, ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(function() {
            recoverColor(that._transPrimitive);
            pri = undefined;
            axisID = undefined;
            that._scene.screenSpaceCameraController.enableRotate = true;
            that._scene.screenSpaceCameraController.enableTranslate = true;
            that._scene.screenSpaceCameraController.enableZoom = true;
            that._scene.screenSpaceCameraController.enableTilt = true;
            that._scene.screenSpaceCameraController.enableLook = true;
        }, ScreenSpaceEventType.LEFT_UP);
        handler.setInputAction(function(movement) {
            if(pri){
                currentPosition = Cartesian3.clone(that._scene.pickPosition(movement.endPosition));
                that._scene.screenSpaceCameraController.enableRotate = false;
                that._scene.screenSpaceCameraController.enableTranslate = false;
                that._scene.screenSpaceCameraController.enableZoom = false;
                that._scene.screenSpaceCameraController.enableTilt = false;
                that._scene.screenSpaceCameraController.enableLook = false;
            }
        }, ScreenSpaceEventType.MOUSE_MOVE);

        var deltaRadians = CesiumMath.toRadians(10.0);

        this._event = function() {
            var matrix, rotation, deltaX, deltaY, deltaZ;
            if (axisID && currentPosition) {
                if (!defined(that._model.originalMatrix)) {
                    that._model.originalMatrix = that._model.modelMatrix.clone();
                }
                rotation = Quaternion.fromHeadingPitchRoll(that._transformations.hpr);
                if(axisID === 'control_x'){
                    var x = currentPosition.x - lastPosition.x;
                    if(x > 0){
                        that._transformations.translation.x += 2;
                    }else if(x < 0){
                        that._transformations.translation.x -= 2;
                    }
                }else if(axisID === 'control_y'){
                    var y = currentPosition.y - lastPosition.y;
                    if(y > 0){
                        that._transformations.translation.y += 2;
                    }else if(y < 0){
                        that._transformations.translation.y -= 2;
                    }
                }else if(axisID === 'control_z'){
                    var z = currentPosition.z - lastPosition.z;
                    if(z > 0){
                        that._transformations.translation.z += 2;
                    }else if(z < 0){
                        that._transformations.translation.z -= 2;
                    }
                }else if(axisID === 'control_xz'){
                    deltaX = currentPosition.x - lastPosition.x;
                    deltaZ = currentPosition.z - lastPosition.z;
                    if(deltaX > 0 && deltaZ < 0 ){
                        that._transformations.hpr.pitch -= deltaRadians;
                        if (that._transformations.hpr.pitch < -CesiumMath.TWO_PI) {
                            that._transformations.hpr.pitch += CesiumMath.TWO_PI;
                        }
                    }else if(deltaX < 0 && deltaZ > 0 ){
                        that._transformations.hpr.pitch += deltaRadians;
                        if (that._transformations.hpr.pitch > CesiumMath.TWO_PI) {
                            that._transformations.hpr.pitch -= CesiumMath.TWO_PI;
                        }
                    }
                    rotation = Quaternion.fromHeadingPitchRoll(that._transformations.hpr);
                }else if(axisID === 'control_xy'){
                    deltaX = currentPosition.x - lastPosition.x;
                    deltaY = currentPosition.y - lastPosition.y;
                    if(deltaX > 0 && deltaY < 0 ){
                        that._transformations.hpr.heading += deltaRadians;
                        if (that._transformations.hpr.heading > CesiumMath.TWO_PI) {
                            that._transformations.hpr.heading -= CesiumMath.TWO_PI;
                        }
                    }else if(deltaX < 0 && deltaY > 0 ){
                        that._transformations.hpr.heading -= deltaRadians;
                        if (that._transformations.hpr.heading < 0.0) {
                            that._transformations.hpr.heading += CesiumMath.TWO_PI;
                        }
                    }
                    rotation = Quaternion.fromHeadingPitchRoll(that._transformations.hpr);
                }else if(axisID === 'control_yz'){
                    deltaY = currentPosition.y - lastPosition.y;
                    deltaZ = currentPosition.z - lastPosition.z;
                    if(deltaY > 0 && deltaZ < 0 ){
                        that._transformations.hpr.roll += deltaRadians;
                        if (that._transformations.hpr.roll > CesiumMath.TWO_PI) {
                            that._transformations.hpr.roll -= CesiumMath.TWO_PI;
                        }
                    }else if(deltaY < 0 && deltaZ > 0 ){
                        that._transformations.hpr.roll -= deltaRadians;
                        if (that._transformations.hpr.roll < 0.0) {
                            that._transformations.hpr.roll += CesiumMath.TWO_PI;
                        }
                    }
                    rotation = Quaternion.fromHeadingPitchRoll(that._transformations.hpr);
                }
                matrix =  Matrix4.fromTranslationQuaternionRotationScale(that._transformations.translation, rotation, that._transformations.scale);
                that._model.modelMatrix = Matrix4.multiply(that._model.originalMatrix, matrix, new Matrix4());
                lastPosition = Cartesian3.clone(currentPosition);
            }
        };
        this._scene.postRender.addEventListener(this._event);
    };

    function changeColor(id, p) {
        recoverColor(p);
        if(id === 'control_x'){
            p._primitive._primitives['0'].appearance.material.uniforms.color = Color.YELLOW;
        }else if(id === 'control_y'){
            p._primitive._primitives['1'].appearance.material.uniforms.color = Color.YELLOW;
        }else if(id === 'control_z'){
            p._primitive._primitives['2'].appearance.material.uniforms.color = Color.YELLOW;
        }else if(id === 'control_xy'){
            p._primitive._primitives['3'].appearance.material.uniforms.color = Color.YELLOW;
        }else if(id === 'control_xz'){
            p._primitive._primitives['4'].appearance.material.uniforms.color = Color.YELLOW;
        }else if(id === 'control_yz'){
            p._primitive._primitives['5'].appearance.material.uniforms.color = Color.YELLOW;
        }
    }

    function recoverColor(p) {
        p._primitive._primitives['0'].appearance.material.uniforms.color = Color.RED;
        p._primitive._primitives['1'].appearance.material.uniforms.color = Color.GREEN;
        p._primitive._primitives['2'].appearance.material.uniforms.color = Color.BLUE;
        p._primitive._primitives['3'].appearance.material.uniforms.color = Color.BLUE;
        p._primitive._primitives['4'].appearance.material.uniforms.color = Color.GREEN;
        p._primitive._primitives['5'].appearance.material.uniforms.color = Color.RED;
    }

    return ModelTransformControl;
});
