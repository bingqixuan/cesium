/**
 * Created by bingqixuan on 2018/8/21.
 */
define([
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/DeveloperError'
],function (
    defaultValue,
    defined,
    defineProperties,
    DeveloperError
) {
    'use strict';

    /**
     * 模型颜色校正类
     *
     * @alias ModelColorCorrection
     * @param {Object} options
     * @param {Scene}  options.scene  地球场景
     * @param {Number} options.brightness  [options.brightness = 1.0]  模型亮度
     * @param {Number} options.contrast  [options.contrast = 1.0]  模型对比度
     * @param {Number} options.hue  [options.hue = 0.0]  模型色调
     * @param {Number} options.saturation  [options.saturation = 1.0]  模型饱和度
     * @constructor
     */
    function ModelColorCorrection(options) {
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;
        this._brightness = defaultValue(options.brightness, 1.0);
        this._contrast = defaultValue(options.contrast, 1.0);
        this._hue = defaultValue(options.hue, 0.0);
        this._saturation = defaultValue(options.saturation, 1.0);
        this._show = true;

        this._scene.context.uniformState['gltf_brightness'] = this._brightness;
        this._scene.context.uniformState['gltf_contrast'] = this._contrast;
        this._scene.context.uniformState['gltf_hue'] = this._hue;
        this._scene.context.uniformState['gltf_saturation'] = this._saturation;
        this._scene.context.uniformState['gltf_ccshow'] = this.show;
    }

    defineProperties(ModelColorCorrection.prototype, {
        // 亮度
        brightness: {
            get: function () {
                return this._brightness;
            },
            set: function (value) {
                this._brightness = value;
                this._scene.context.uniformState['gltf_brightness'] = this._brightness;
            }
        },
        // 对比度
        contrast: {
            get: function () {
                return this._contrast;
            },
            set: function (value) {
                this._contrast = value;
                this._scene.context.uniformState['gltf_contrast'] = this._contrast;
            }
        },
        // 色调
        hue: {
            get: function () {
                return this._hue;
            },
            set: function (value) {
                this._hue = value;
                this._scene.context.uniformState['gltf_hue'] = this._hue;
            }
        },
        // 饱和度
        saturation: {
            get: function () {
                return this._saturation;
            },
            set: function (value) {
                this._saturation = value;
                this._scene.context.uniformState['gltf_saturation'] = this._saturation;
            }
        },
        // 是否开启
        show: {
            get: function () {
                return this._show;
            },
            set: function (value) {
                this._show = value;
                this._scene.context.uniformState['gltf_ccshow'] = this._show;
            }
        }
    });

    return ModelColorCorrection;
});
