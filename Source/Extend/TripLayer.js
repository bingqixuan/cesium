/**
 * Created by bingqixuan on 2019/2/26.
 */
define([
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/DeveloperError'
], function(defaultValue,
    defined,
    DeveloperError){
    'use strict';

    /**
     * 轨迹线类
     * @param {Object} options        参数
     * @param {Scene}  options.scene  地球场景
     */
    function TripLayer(options){
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;
    }
    return TripLayer;
});
