define([
    '../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/destroyObject',
    '../../Core/DeveloperError',
    '../../ThirdParty/knockout',
    '../getElement',
    './ScreenshotButtonViewModel'
], function(
    defined,
    defineProperties,
    destroyObject,
    DeveloperError,
    knockout,
    getElement,
    ScreenshotButtonViewModel) {
'use strict';

/**
 * 截取当前屏幕画面保存下来
 *
 * @alias ScreenshotButton
 * @constructor
 *
 * @param {Element|String} container The DOM element or ID that will contain the widget.
 * @param {Scene} scene The Scene instance to use.
 */
function ScreenshotButton(container, scene) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(container)) {
        throw new DeveloperError('container is required.');
    }
    //>>includeEnd('debug');

    container = getElement(container);

    var viewModel = new ScreenshotButtonViewModel(scene);

    //viewModel._svgPath = 'M524.8 348.16c-112.64 0-204.8 92.16-204.8 204.8s92.16 204.8 204.8 204.8 204.8-92.16 204.8-204.8-92.16-204.8-204.8-204.8z m0 358.4c-84.48 0-153.6-69.12-153.6-153.6s69.12-153.6 153.6-153.6 153.6 69.12 153.6 153.6-69.12 153.6-153.6 153.6z m307.2-460.8h-76.8l-25.6-51.2c-15.36-30.72-23.04-51.2-51.2-51.2h-307.2c-28.16 0-38.4 25.6-51.2 51.2l-25.6 51.2h-76.8c-56.32 0-102.4 46.08-102.4 102.4v409.6c0 56.32 46.08 102.4 102.4 102.4h614.4c56.32 0 102.4-46.08 102.4-102.4v-409.6c0-56.32-46.08-102.4-102.4-102.4z m51.2 512c0 28.16-23.04 51.2-51.2 51.2h-614.4c-28.16 0-51.2-23.04-51.2-51.2v-409.6c0-28.16 23.04-51.2 51.2-51.2h102.4l25.6-51.2c17.92-30.72 23.04-51.2 51.2-51.2h256c28.16 0 33.28 20.48 51.2 51.2l25.6 51.2h102.4c28.16 0 51.2 23.04 51.2 51.2v409.6z';
    viewModel._svgPath = 'm22.28803,5.7725c0.74725,0 1.38775,0.30597 1.91642,0.92085c0.53121,0.61489 0.79554,1.35039 0.79554,2.21829l0,10.9826c0,0.86495 -0.26433,1.60635 -0.79554,2.21829c-0.53121,0.61489 -1.16662,0.92085 -1.91642,0.92085l-14.90941,0c-0.74725,0 -1.38775,-0.30597 -1.91642,-0.92085s-0.79554,-1.35039 -0.79554,-2.21829l0,-10.98554c0,-0.86495 0.26433,-1.60635 0.79554,-2.21829s1.16662,-0.92085 1.91642,-0.92085l2.37392,0l0.53883,-1.66519c0.13217,-0.40012 0.38125,-0.74728 0.73708,-1.03559c0.35583,-0.28832 0.72183,-0.43542 1.09545,-0.43542l5.42137,0c0.37617,0 0.73962,0.14416 1.09545,0.43542c0.35583,0.28832 0.60237,0.63548 0.73708,1.03559l0.53883,1.66519l2.37645,0l0,0.00294l-0.00508,0l0.00001,0zm-10.80461,12.50657c0.9277,1.07384 2.04604,1.61223 3.34991,1.61223c1.30642,0 2.4222,-0.53839 3.34991,-1.61223c0.9277,-1.07384 1.39283,-2.36833 1.39283,-3.87759c0,-1.5122 -0.46512,-2.80375 -1.39283,-3.87759c-0.9277,-1.07384 -2.04604,-1.61223 -3.34991,-1.61223s-2.4222,0.53839 -3.34991,1.61223s-1.39283,2.36833 -1.39283,3.87759c0,1.50926 0.46258,2.80375 1.39283,3.87759zm1.19712,-6.37244c0.59729,-0.69138 1.31404,-1.03559 2.15279,-1.03559s1.55804,0.34422 2.15279,1.03559c0.59729,0.69138 0.89467,1.52103 0.89467,2.4919s-0.29737,1.80347 -0.89467,2.4919c-0.59729,0.69138 -1.31404,1.03559 -2.15279,1.03559s-1.55804,-0.34422 -2.15279,-1.03559c-0.59729,-0.69138 -0.89467,-1.52103 -0.89467,-2.4919s0.29737,-1.80052 0.89467,-2.4919z'
    var element = document.createElement('button');
    element.type = 'button';
    element.className = 'cesium-button cesium-toolbar-button cesium-home-button';
    element.setAttribute('data-bind', '\
attr: { title: tooltip },\
click: command,\
cesiumSvgPath: { path: _svgPath, width: 28, height: 28 }');

    container.appendChild(element);

    knockout.applyBindings(viewModel, element);

    this._container = container;
    this._viewModel = viewModel;
    this._element = element;
}

defineProperties(ScreenshotButton.prototype, {
    /**
     * Gets the parent container.
     * @memberof ScreenshotButton.prototype
     *
     * @type {Element}
     */
    container : {
        get : function() {
            return this._container;
        }
    },

    /**
     * Gets the view model.
     * @memberof ScreenshotButton.prototype
     *
     * @type {ScreenshotButtonViewModel}
     */
    viewModel : {
        get : function() {
            return this._viewModel;
        }
    }
});

/**
 * @returns {Boolean} true if the object has been destroyed, false otherwise.
 */
ScreenshotButton.prototype.isDestroyed = function() {
    return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
ScreenshotButton.prototype.destroy = function() {
    knockout.cleanNode(this._element);
    this._container.removeChild(this._element);

    return destroyObject(this);
};

return ScreenshotButton;
});
