define([
    '../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/DeveloperError',
    '../../ThirdParty/knockout',
    '../createCommand'
], function(
    defined,
    defineProperties,
    DeveloperError,
    knockout,
    createCommand) {
'use strict';

/**
 * The view model for {@link ScreenshotButton}.
 * @alias ScreenshotButtonViewModel
 * @constructor
 *
 * @param {Scene} scene The scene instance to use.
 */
function ScreenshotButtonViewModel(scene) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(scene)) {
        throw new DeveloperError('scene is required.');
    }
    //>>includeEnd('debug');

    this._scene = scene;

    var that = this;
    this._command = createCommand(function() {
        that._scene.render();
        //var image_save = that._scene.canvas.toDataURL().replace("image/png", "image/octet-stream");

        var url = that._scene.canvas.toDataURL('image/png');
        // 生成一个a元素
        var a = document.createElement('a');
        // 创建一个单击事件
        var event = new MouseEvent('click');
        // 将a的download属性设置为我们想要下载的图片名称，若name不存在则使用‘下载图片名称’作为默认名称
        a.download = '下载';
        // 将生成的URL设置为a.href属性
        a.href = url;
        // 触发a的单击事件
        a.dispatchEvent(event);
        // window.location.href=image_save;
    });

    /**
     * Gets or sets the tooltip.  This property is observable.
     *
     * @type {String}
     */
    this.tooltip = '对当前屏幕截图';

    knockout.track(this, ['tooltip']);
}

defineProperties(ScreenshotButtonViewModel.prototype, {
    /**
     * Gets the scene to control.
     * @memberof ScreenshotButtonViewModel.prototype
     *
     * @type {Scene}
     */
    scene : {
        get : function() {
            return this._scene;
        }
    },

    /**
     * Gets the Command that is executed when the button is clicked.
     * @memberof ScreenshotButtonViewModel.prototype
     *
     * @type {Command}
     */
    command : {
        get : function() {
            return this._command;
        }
    }
});

return ScreenshotButtonViewModel;
});
