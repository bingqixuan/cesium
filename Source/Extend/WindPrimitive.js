define([
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/Matrix4',
    '../Renderer/BufferUsage',
    '../Renderer/ClearCommand',
    '../Renderer/ComputeCommand',
    '../Renderer/DrawCommand',
    '../Renderer/Pass',
    '../Renderer/RenderState',
    '../Renderer/ShaderProgram',
    '../Renderer/VertexArray',
], function(
    Color,
    defaultValue,
    defined,
    destroyObject,
    Matrix4,
    BufferUsage,
    ClearCommand,
    ComputeCommand,
    DrawCommand,
    Pass,
    RenderState,
    ShaderProgram,
    VertexArray
){

    function WindPrimitive(options){
        this.commandType = defaultValue(options.commandType, 'Draw');

        this.geometry = options.geometry;
        this.attributeLocations = options.attributeLocations;
        this.primitiveType = options.primitiveType;

        this.uniformMap = options.uniformMap;

        this.vertexShaderSource = options.vertexShaderSource;
        this.fragmentShaderSource = options.fragmentShaderSource;

        this.rawRenderState = options.rawRenderState;
        this.framebuffer = options.framebuffer;

        this.outputTextures = options.outputTextures;

        this.autoClear = defaultValue(options.autoClear, false);

        this.show = true;
        this.commandToExecute = undefined;
        this.clearCommand = undefined;
        if (this.autoClear) {
            this.clearCommand = new ClearCommand({
                color: new Color(0.0, 0.0, 0.0, 0.0),
                depth: 1.0,
                framebuffer: this.framebuffer,
                pass: Pass.OPAQUE
            });
        }
    }

    WindPrimitive.prototype.createCommand = function(context) {
        switch (this.commandType) {
            case 'Draw': {
                var vertexArray = VertexArray.fromGeometry({
                    context: context,
                    geometry: this.geometry,
                    attributeLocations: this.attributeLocations,
                    bufferUsage: BufferUsage.STATIC_DRAW,
                });

                var shaderProgram = ShaderProgram.fromCache({
                    context: context,
                    attributeLocations: this.attributeLocations,
                    vertexShaderSource: this.vertexShaderSource,
                    fragmentShaderSource: this.fragmentShaderSource
                });

                var renderState = RenderState.fromCache(this.rawRenderState);
                return new DrawCommand({
                    owner: this,
                    vertexArray: vertexArray,
                    primitiveType: this.primitiveType,
                    uniformMap: this.uniformMap,
                    modelMatrix: Matrix4.IDENTITY,
                    shaderProgram: shaderProgram,
                    framebuffer: this.framebuffer,
                    renderState: renderState,
                    pass: Pass.OPAQUE
                });
            }
            case 'Compute': {
                return new ComputeCommand({
                    owner: this,
                    fragmentShaderSource: this.fragmentShaderSource,
                    uniformMap: this.uniformMap,
                    outputTextures: this.outputTextures,  // 利用MRT，改动了computeCommand的源码
                    persists: true
                });
            }
        }
    }

    WindPrimitive.prototype.setGeometry = function(context, geometry) {
        this.geometry = geometry;
        var vertexArray = VertexArray.fromGeometry({
            context: context,
            geometry: this.geometry,
            attributeLocations: this.attributeLocations,
            bufferUsage: BufferUsage.STATIC_DRAW,
        });
        this.commandToExecute.vertexArray = vertexArray;
    }

    WindPrimitive.prototype.preExecute = function() {
        // this function will be executed before the command
    }

    WindPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        if (!defined(this.commandToExecute)) {
            this.commandToExecute = this.createCommand(frameState.context);
        }

        this.preExecute();

        if (defined(this.clearCommand)) {
            frameState.commandList.push(this.clearCommand);
        }
        frameState.commandList.push(this.commandToExecute);
    }

    WindPrimitive.prototype.isDestroyed = function() {
        return false;
    }

    WindPrimitive.prototype.destroy = function() {
        if (defined(this.commandToExecute)) {
            this.commandToExecute.shaderProgram = this.commandToExecute.shaderProgram && this.commandToExecute.shaderProgram.destroy();
        }
        return destroyObject(this);
    }

    return WindPrimitive;
})
