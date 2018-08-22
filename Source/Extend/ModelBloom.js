/**
 * Created by bingqixuan on 2018/8/21.
 */
define([
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/DeveloperError',
    '../Renderer/PassState'
],function (
    defaultValue,
    defined,
    PassState,
    DeveloperError
) {
    'use strict';

    /**
     * 模型泛光
     * @param options
     * @constructor
     */
    function ModelBloom(options) {
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        this._scene = options.scene;
        // this._pass = new ModelBloomPass(this._scene.context);

        this._bloomTexture = undefined;


        this._scene.modelBloom = this;
    }

    function ModelBloomPass(context) {
        this.passState = new PassState(context);
        this.framebuffer = undefined;
        this.textureOffsets = undefined;
        this.commandList = [];
    }

    ModelBloom.prototype.update = function () {
        var stages = this._scene.postProcessStages._bloom._stages;
        for(var i = 0;i<stages.length;i++){
            if(stages[i]._name === 'czm_bloom_generate_composite'){
                this._bloomTexture = stages[i].uniform.bloomTexture;
            }
        }
    };

    return ModelBloom;
});
