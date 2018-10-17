/**
 * Created by bingqx on 2017/4/23.
 */
/**
 * 鼠标画点线面
 */
(function() {

    const POINT_COLOR = Cesium.Color.fromCssColorString('#00FF00');
    const POLYLINE_COLOR = Cesium.Color.fromCssColorString('#F08519');
    const POLYGON_COLOR = Cesium.Color.fromBytes(136, 187, 255, 136);
    const LABEL_COLOR = Cesium.Color.YELLOW;
    const LABEL_HORIZONTAL_ORIGIN = Cesium.HorizontalOrigin.LEFT;
    const LABEL_FONT = '18px Helvetica';

    let drawPoint = false;
    let drawPolyline = false;
    let drawPolygon = false;
    let drawElevation = false;

    /**
     * 绘制（量算）工具
     * @param options
     * @param options.viewer  地球容器
     * @param options.isMeasure  是否开启量算功能
     * @param options.isClampGround  是否开启贴地功能
     * @param options.lineWidth  线宽
     * @constructor
     */
    const DrawTool = function(options) {
        if (!options.viewer) {
            new Error('需要传入地球容器');
        }
        this._viewer = options.viewer;
        this._isMeasure = options.isMeasure || false;
        this._isClampGround = options.isClampGround || false;
        this._lineWidth = options.lineWidth || 3.0;

        this._layer = new Cesium.CustomDataSource('drawing');
        this._viewer.dataSources.add(this._layer);
        this._handler = new Cesium.ScreenSpaceEventHandler(this._viewer.canvas);
        this._pointer = false;

        this._viewer.scene.globe.depthTestAgainstTerrain = true;
    };

    DrawTool.prototype.setIsMeasure = function(isMeasure) {
        this._isMeasure = isMeasure;
    };

    DrawTool.prototype.setIsClampGround = function(isClampGround) {
        this._isClampGround = isClampGround;
    };

    /**
     * 开启画点模式
     */
    DrawTool.prototype.startPoint = function() {
        drawPoint = true;
        let leftClickHandler = (click) => {
            if (drawPoint) {
                let position = this._viewer.scene.pickPosition(click.position);
                if(!Cesium.defined(position)){
                    return;
                }
                if (!this._isMeasure) {
                    return this._layer.entities.add({
                        name: 'drawing',
                        position : new Cesium.CallbackProperty(()=> {
                            return Cesium.Cartesian3.clone(position);
                        }, false),
                        point : {
                            pixelSize : 10,
                            color : POINT_COLOR,
                            heightReference : Cesium.HeightReference.NONE
                        }
                    });
                } else {
                    let cartographic = Cesium.Cartographic.fromCartesian(position);
                    let longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(5);
                    let latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(5);
                    let height = cartographic.height > 1000 ? (cartographic.height / 1000).toFixed(5) + 'km' : cartographic.height.toFixed(3) + 'm ';
                    this._layer.entities.add({
                            name: 'drawing',
                            position : new Cesium.CallbackProperty(()=>{
                                return Cesium.Cartesian3.clone(position);
                            }, false),
                            point : {
                                pixelSize : 10,
                                color : POINT_COLOR,
                                heightReference : Cesium.HeightReference.NONE
                            },
                            label : {
                                text : '经度: ' + ('        ' + longitudeString).slice(-12) + '\u00B0' +
                                       '\n纬度: ' + ('        ' + latitudeString).slice(-12) + '\u00B0' +
                                       '\n高度：' + ('        ' + height).slice(-12) + '  ',
                                font : LABEL_FONT,
                                fillColor : LABEL_COLOR,
                                outlineColor : Cesium.Color.BLACK,
                                outlineWidth : 2,
                                style : Cesium.LabelStyle.FILL_AND_OUTLINE,
                                showBackground : true,
                                horizontalOrigin : LABEL_HORIZONTAL_ORIGIN,
                                verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                                heightReference : Cesium.HeightReference.NONE,
                                // disableDepthTestDistance : new Cesium.CallbackProperty(function() {
                                //     return (drawElevation || drawPolygon || drawPolyline || drawPoint) ? 0 : Number.POSITIVE_INFINITY
                                // }, false)
                                disableDepthTestDistance: Number.POSITIVE_INFINITY
                            }
                        });

                }
                // this.stopPoint();
            }
        };
        this._handler.setInputAction(leftClickHandler, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    };

    /**
     * 关闭画点模式
     */
    DrawTool.prototype.stopPoint = function() {
        drawPoint = false;
        this._handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    };

    /**
     * 开启画线模式
     */
    DrawTool.prototype.startPolyline = function() {
        this.stopPoint();
        drawPolyline = true;
        let linePositions = [];
        let distance = 0;
        let mouseMoveHandler;
        let leftClickHandler = (click) => {
            if (drawPolyline) {
                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                if(!Cesium.defined(surfacePosition)){
                    return;
                }
                linePositions.pop();
                linePositions.push(surfacePosition);
                this._layer.entities.add({
                    name: 'drawing',
                    position : new Cesium.CallbackProperty(function() {
                        return Cesium.Cartesian3.clone(surfacePosition);
                    }, true),
                    point : {
                        pixelSize : 10,
                        color : POINT_COLOR,
                        heightReference : Cesium.HeightReference.NONE
                    }
                });
                if (this._isMeasure && linePositions.length > 1) {
                    distance = calcSpaceDistance(linePositions);
                }
                this._pointer = false;

                if (!mouseMoveHandler) {
                    mouseMoveHandler = (click) => {
                        if (drawPolyline && linePositions.length > 0) {
                            if (this._pointer) {
                                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                                if(!Cesium.defined(surfacePosition)){
                                    return;
                                }
                                linePositions.pop();
                                linePositions.push(surfacePosition);
                                if (this._isMeasure && linePositions.length > 1) {
                                    distance = calcSpaceDistance(linePositions);
                                }
                            } else {
                                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                                if(!Cesium.defined(surfacePosition)){
                                    return;
                                }
                                linePositions.push(surfacePosition);
                                if (this._isMeasure && linePositions.length > 1) {
                                    distance = calcSpaceDistance(linePositions);

                                }
                                this._pointer = true;
                            }

                        }
                    };
                    this._handler.setInputAction(mouseMoveHandler, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                }
            }
        };
        this._handler.setInputAction(leftClickHandler, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        let rightClickHandler = (click) => {
            if (drawPolyline) {
                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                if(!Cesium.defined(surfacePosition)){
                    return;
                }

                this._pointer = false;
                this._handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                linePositions.pop();
                linePositions.push(surfacePosition);
                this._layer.entities.add({
                    name: 'drawing',
                    position : new Cesium.CallbackProperty(function() {
                        return Cesium.Cartesian3.clone(surfacePosition);
                    }, true),
                    point : {
                        pixelSize : 10,
                        color : POINT_COLOR,
                        heightReference : Cesium.HeightReference.NONE
                    }
                });

                if (this._isMeasure && linePositions.length > 1) {
                    distance = calcSpaceDistance(linePositions);

                }
                this.stopPolyline();
            }
        };
        this._handler.setInputAction(rightClickHandler, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        if (!this._isMeasure) {
            if (this._isClampGround) {
                this._layer.entities.add({
                    name: 'drawing',
                    corridor : {
                        positions : new Cesium.CallbackProperty(function() {
                            let arr = [];
                            for(let linePosition of linePositions){
                                arr.push(Cesium.Cartesian3.clone(linePosition));
                            }
                            return arr;
                        }, false),
                        width : this._lineWidth,
                        material : POLYLINE_COLOR
                    }
                });
            } else {
                this._layer.entities.add({
                    name: 'drawing',
                    polyline : {
                        positions : new Cesium.CallbackProperty(function() {
                            let arr = [];
                            for(let linePosition of linePositions){
                                arr.push(Cesium.Cartesian3.clone(linePosition));
                            }
                            return arr;
                        }, false),
                        width : this._lineWidth,
                        material : POLYLINE_COLOR
                    }
                });
            }
        } else {
            if (this._isClampGround) {
                this._layer.entities.add({
                    name: 'drawing',
                    position : new Cesium.CallbackProperty(function() {
                        return Cesium.Cartesian3.clone(linePositions[linePositions.length - 1]);
                    }, false),
                    corridor : {
                        positions : new Cesium.CallbackProperty(function() {
                            let arr = [];
                            for(let linePosition of linePositions){
                                arr.push(Cesium.Cartesian3.clone(linePosition));
                            }
                            return arr;
                        }, false),
                        width : this._lineWidth,
                        material : POLYLINE_COLOR
                    },
                    label : {
                        text : new Cesium.CallbackProperty(function() {
                            return distance > 1000 ? (distance / 1000).toFixed(5).toString() + 'km' : distance.toFixed(3).toString() + 'm';
                        }, false),
                        font : LABEL_FONT,
                        fillColor : LABEL_COLOR,
                        outlineColor : Cesium.Color.BLACK,
                        outlineWidth : 2,
                        style : Cesium.LabelStyle.FILL_AND_OUTLINE,
                        showBackground : true,
                        horizontalOrigin : LABEL_HORIZONTAL_ORIGIN,
                        verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                        // heightReference : this._isClampGround ? Cesium.HeightReference.CLAMP_TO_GROUND : Cesium.HeightReference.NONE,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        pixelOffset : new Cesium.CallbackProperty(function() {
                            return (drawElevation || drawPolygon || drawPolyline || drawPoint) ? new Cesium.Cartesian2(45, 45) : new Cesium.Cartesian2(0, 0);
                        }, false)
                    }
                });
            } else {
                this._layer.entities.add({
                    name: 'drawing',
                    position : new Cesium.CallbackProperty(function() {
                        return Cesium.Cartesian3.clone(linePositions[linePositions.length - 1]);
                    }, false),
                    polyline : {
                        positions : new Cesium.CallbackProperty(function() {
                            let arr = [];
                            for(let linePosition of linePositions){
                                arr.push(Cesium.Cartesian3.clone(linePosition));
                            }
                            return arr;
                        }, false),
                        width : this._lineWidth,
                        material : POLYLINE_COLOR
                    },
                    label : {
                        text : new Cesium.CallbackProperty(function() {
                            return distance > 1000 ? (distance / 1000).toFixed(5).toString() + 'km' : distance.toFixed(3).toString() + 'm';
                        }, false),
                        font : LABEL_FONT,
                        fillColor : LABEL_COLOR,
                        outlineColor : Cesium.Color.BLACK,
                        outlineWidth : 2,
                        style : Cesium.LabelStyle.FILL_AND_OUTLINE,
                        showBackground : true,
                        horizontalOrigin : LABEL_HORIZONTAL_ORIGIN,
                        verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        pixelOffset : new Cesium.CallbackProperty(function() {
                            return (drawElevation || drawPolygon || drawPolyline || drawPoint) ? new Cesium.Cartesian2(45, 45) : new Cesium.Cartesian2(0, 0);
                        }, false)
                    }
                });
            }

        }
    };

    /**
     * 停止画线
     */
    DrawTool.prototype.stopPolyline = function() {
        drawPolyline = false;
        this._handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this._handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };

    /**
     * 开启画面模式
     */
    DrawTool.prototype.startPolygon = function() {
        this.stopPoint();
        drawPolygon = true;
        let positions = [];
        let area = 0;
        let mouseMoveHandler;

        let leftClickHandler = (click) => {
            if (drawPolygon) {
                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                if(!Cesium.defined(surfacePosition)){
                    return;
                }
                positions.pop();
                positions.push(surfacePosition);
                this._layer.entities.add({
                    name: 'drawing',
                    position : new Cesium.CallbackProperty(function() {
                        return Cesium.Cartesian3.clone(surfacePosition);
                    }, true),
                    point : {
                        pixelSize : 10,
                        color : POINT_COLOR,
                        heightReference : Cesium.HeightReference.NONE
                    }
                });
                if (this._isMeasure && positions.length > 2) {
                    area = getArea(positions, this._viewer);
                }
                this._pointer = false;

                if (!mouseMoveHandler) {
                    mouseMoveHandler = (click) => {
                        if (drawPolygon && positions.length > 0) {
                            if (this._pointer) {
                                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                                if(!Cesium.defined(surfacePosition)){
                                    return;
                                }
                                positions.pop();
                                positions.push(surfacePosition);
                                if (this._isMeasure && positions.length > 2) {
                                    area = getArea(positions, this._viewer);
                                }
                            } else {
                                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                                if(!Cesium.defined(surfacePosition)){
                                    return;
                                }
                                positions.push(surfacePosition);
                                if (this._isMeasure && positions.length > 2) {
                                    area = getArea(positions, this._viewer);
                                }
                                this._pointer = true;
                            }

                        }
                    };
                    this._handler.setInputAction(mouseMoveHandler, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                }

            }
        };
        this._handler.setInputAction(leftClickHandler, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        let rightClickHandler = (click) => {
            if (drawPolygon) {
                let surfacePosition = this._viewer.scene.pickPosition(click.position);
                if(!Cesium.defined(surfacePosition)){
                    return;
                }

                this._pointer = false;
                this._handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                positions.pop();
                positions.push(surfacePosition);
                this._layer.entities.add({
                    name: 'drawing',
                    position : new Cesium.CallbackProperty(function() {
                        return Cesium.Cartesian3.clone(surfacePosition);
                    }, true),
                    point : {
                        pixelSize : 10,
                        color : POINT_COLOR,
                        heightReference : Cesium.HeightReference.NONE
                    }
                });

                if (this._isMeasure && positions.length > 2) {
                    area = getArea(positions, this._viewer);
                }
                positions.push(positions[0]);
                this.stopPolygon();
            }
        };
        this._handler.setInputAction(rightClickHandler, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        if (!this._isMeasure) {
            this._layer.entities.add({
                name: 'drawing',
                position : new Cesium.CallbackProperty(function() {
                    return Cesium.Cartesian3.clone(positions[positions.length - 1]);
                }, false),
                polygon : {
                    hierarchy : new Cesium.CallbackProperty(function() {
                        let arr = [];
                        for(let linePosition of positions){
                            arr.push(Cesium.Cartesian3.clone(linePosition));
                        }
                        return arr;
                    }, false),
                    material : POLYGON_COLOR,
                    perPositionHeight : !this._isClampGround
                }
            });
        } else {
            this._layer.entities.add({
                    name: 'drawing',
                    position : new Cesium.CallbackProperty(function() {
                        return Cesium.Cartesian3.clone(positions[positions.length - 1]);
                    }, false),
                    polygon : {
                        hierarchy : new Cesium.CallbackProperty(function() {
                            let arr = [];
                            for(let linePosition of positions){
                                arr.push(Cesium.Cartesian3.clone(linePosition));
                            }
                            return arr;
                        }, false),
                        material : POLYGON_COLOR,
                        perPositionHeight : !this._isClampGround
                    },
                    polyline : {
                        positions : new Cesium.CallbackProperty(function() {
                            let arr = [];
                            for(let linePosition of positions){
                                arr.push(Cesium.Cartesian3.clone(linePosition));
                            }
                            return arr;
                        }, false),
                        width : this._lineWidth,
                        material : POLYLINE_COLOR,
                        followSurface : !this._isClampGround
                    },
                    label : {
                        text : new Cesium.CallbackProperty(function() {
                            return area > 1e6 ? (area / 1e6).toFixed(5).toString() + '平方公里' : area.toFixed(5).toString() + '平方米';
                        }, false),
                        font : LABEL_FONT,
                        fillColor : LABEL_COLOR,
                        outlineColor : Cesium.Color.BLACK,
                        outlineWidth : 2,
                        style : Cesium.LabelStyle.FILL_AND_OUTLINE,
                        showBackground : true,
                        horizontalOrigin : LABEL_HORIZONTAL_ORIGIN,
                        verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                        // heightReference : this._isClampGround ? Cesium.HeightReference.CLAMP_TO_GROUND : Cesium.HeightReference.NONE,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        pixelOffset : new Cesium.CallbackProperty(function() {
                            return (drawElevation || drawPolygon || drawPolyline || drawPoint) ? new Cesium.Cartesian2(45, 45) : new Cesium.Cartesian2(0, 0);
                        }, false)
                    }
                });
        }
    };


    /**
     * 停止画面
     */
    DrawTool.prototype.stopPolygon = function() {
        drawPolygon = false;
        this._handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this._handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };

    /**
     * 开始量高
     */
    var clicked = true;
    DrawTool.prototype.startElevation = function() {
        this.stopPoint();
        drawElevation = true;
        let startPos, movePos, verticalPos;
        let startPosDegree, movePosDegree, verticalPosDegree;
        let mouseMoveHandler;
        let verticalDis = 0;  // 垂直距离
        let horiDis = 0; // 水平距离
        let spaceDis = 0; // 空间距离
        let flag = false;
        var endFlag = false;

        let leftClickHandler = (click) => {
            if (drawElevation) {
                if (!endFlag) {
                    clicked = false;
                    startPos = this._viewer.scene.pickPosition(click.position);
                    clicked = true;
                    if(!Cesium.defined(startPos)){
                        return;
                    }

                    // startPos = this._viewer.scene.pick(this._viewer.scene.camera.getPickRay(new Cesium.Cartesian2(click.position.x, click.position.y)), this._viewer.scene);
                    startPosDegree = this._viewer.scene.globe.ellipsoid.cartesianToCartographic(startPos);
                    endFlag = true;
                    this._layer.entities.add({
                        name : 'drawing',
                        position : new Cesium.CallbackProperty(function() {
                            return Cesium.Cartesian3.clone(startPos);
                        }, true),
                        point : {
                            pixelSize : 10,
                            color : POINT_COLOR,
                            heightReference : Cesium.HeightReference.NONE
                        }
                    });
                    mouseMoveHandler = (click) => {
                        movePos = this._viewer.scene.pickPosition(click.position);
                        if(!Cesium.defined(movePos)){
                            return;
                        }
                        // movePos = this._viewer.scene.pick(this._viewer.scene.camera.getPickRay(new Cesium.Cartesian2(click.endPosition.x, click.endPosition.y)), this._viewer.scene);
                        movePosDegree = this._viewer.scene.globe.ellipsoid.cartesianToCartographic(movePos);

                        if (startPosDegree.height > movePosDegree.height) {
                            verticalPos = Cesium.Cartesian3.fromRadians(movePosDegree.longitude, movePosDegree.latitude, startPosDegree.height);

                            horiDis = Cesium.Cartesian3.distance(startPos, verticalPos);
                            horiDis = spaceDis > 1000 ? (horiDis / 1000).toFixed(5).toString() + 'km' : horiDis.toFixed(3).toString() + 'm';
                            verticalDis = Cesium.Cartesian3.distance(movePos, verticalPos);
                            verticalDis = spaceDis > 1000 ? (verticalDis / 1000).toFixed(5).toString() + 'km' : verticalDis.toFixed(3).toString() + 'm';

                            flag = true; // verticalPos在movePos之上

                        } else {
                            verticalPos = Cesium.Cartesian3.fromRadians(startPosDegree.longitude, startPosDegree.latitude, movePosDegree.height);

                            verticalDis = Cesium.Cartesian3.distance(startPos, verticalPos);
                            verticalDis = spaceDis > 1000 ? (verticalDis / 1000).toFixed(5).toString() + 'km' : verticalDis.toFixed(3).toString() + 'm';
                            horiDis = Cesium.Cartesian3.distance(movePos, verticalPos);
                            horiDis = spaceDis > 1000 ? (horiDis / 1000).toFixed(5).toString() + 'km' : horiDis.toFixed(3).toString() + 'm';

                            flag = false; // verticalPos在startPos之上
                        }

                        spaceDis = Cesium.Cartesian3.distance(startPos, movePos);
                        spaceDis = spaceDis > 1000 ? (spaceDis / 1000).toFixed(5).toString() + 'km' : spaceDis.toFixed(3).toString() + 'm';
                    };
                    this._handler.setInputAction(mouseMoveHandler, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                } else {
                    let movePos = this._viewer.scene.pickPosition(click.position);
                    if(!Cesium.defined(movePos)){
                        return;
                    }

                    this._handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                    movePosDegree = Cesium.Cartographic.fromCartesian(movePos);

                    if (startPosDegree.height > movePosDegree.height) {
                        verticalPos = Cesium.Cartesian3.fromRadians(movePosDegree.longitude, movePosDegree.latitude, startPosDegree.height);

                        horiDis = Cesium.Cartesian3.distance(startPos, verticalPos);
                        horiDis = spaceDis > 1000 ? (horiDis / 1000).toFixed(5).toString() + 'km' : horiDis.toFixed(3).toString() + 'm';
                        verticalDis = Cesium.Cartesian3.distance(movePos, verticalPos);
                        verticalDis = spaceDis > 1000 ? (verticalDis / 1000).toFixed(5).toString() + 'km' : verticalDis.toFixed(3).toString() + 'm';

                        flag = true; // verticalPos在movePos之上

                    } else {
                        verticalPos = Cesium.Cartesian3.fromRadians(startPosDegree.longitude, startPosDegree.latitude, movePosDegree.height);

                        verticalDis = Cesium.Cartesian3.distance(startPos, verticalPos);
                        verticalDis = spaceDis > 1000 ? (verticalDis / 1000).toFixed(5).toString() + 'km' : verticalDis.toFixed(3).toString() + 'm';
                        horiDis = Cesium.Cartesian3.distance(movePos, verticalPos);
                        horiDis = spaceDis > 1000 ? (horiDis / 1000).toFixed(5).toString() + 'km' : horiDis.toFixed(3).toString() + 'm';

                        flag = false; // verticalPos在startPos之上
                    }
                    this._layer.entities.add({
                        name : 'drawing',
                        position : new Cesium.CallbackProperty(function() {
                            return Cesium.Cartesian3.clone(verticalPos);
                        }, true),
                        point : {
                            pixelSize : 10,
                            color : POINT_COLOR,
                            heightReference : Cesium.HeightReference.NONE
                        }
                    });
                    this._layer.entities.add({
                        name : 'drawing',
                        position : new Cesium.CallbackProperty(function() {
                            return Cesium.Cartesian3.clone(movePos);
                        }, true),
                        point : {
                            pixelSize : 10,
                            color : POINT_COLOR,
                            heightReference : Cesium.HeightReference.NONE
                        }
                    });

                    spaceDis = Cesium.Cartesian3.distance(startPos, movePos);
                    spaceDis = spaceDis > 1000 ? (spaceDis / 1000).toFixed(5).toString() + 'km' : spaceDis.toFixed(3).toString() + 'm';

                    this.stopElevation();

                }
            }
        };
        this._handler.setInputAction(leftClickHandler, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // let rightClickHandler = (click) => {
        //     if(drawElevation){
        //
        //     }
        // };
        // this._handler.setInputAction(rightClickHandler, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        // 空间线
        this._layer.entities.add({
            name : 'drawing',
            position : new Cesium.CallbackProperty(function() {
                return (startPos && movePos) ? Cesium.Cartesian3.lerp(Cesium.Cartesian3.clone(startPos), Cesium.Cartesian3.clone(movePos), 0.5, new Cesium.Cartesian3()) : undefined;
            }, false),
            polyline : {
                positions : new Cesium.CallbackProperty(function() {
                    return (startPos && movePos) ? [startPos, movePos] : [];
                }, false),
                width : this._lineWidth,
                material : POLYLINE_COLOR
            },
            label : {
                text : new Cesium.CallbackProperty(function() {
                    return '空间距离：' + spaceDis;
                }, false),
                font : LABEL_FONT,
                fillColor : LABEL_COLOR,
                outlineColor : Cesium.Color.BLACK,
                outlineWidth : 2,
                style : Cesium.LabelStyle.FILL_AND_OUTLINE,
                showBackground : true,
                horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
                verticalOrigin : Cesium.VerticalOrigin.TOP,
                disableDepthTestDistance : Number.POSITIVE_INFINITY
                show: new Cesium.CallbackProperty(function () {
                    return clicked;
                }, false)
            }
        });

        this._layer.entities.add({
            name : 'drawing',
            position : new Cesium.CallbackProperty(function() {
                return (startPos && verticalPos) ? Cesium.Cartesian3.lerp(Cesium.Cartesian3.clone(startPos), Cesium.Cartesian3.clone(verticalPos), 0.5, new Cesium.Cartesian3()) : undefined;
            }, false),
            polyline : {
                positions : new Cesium.CallbackProperty(function() {
                    return (startPos && verticalPos) ? [startPos, verticalPos] : [];
                }, false),
                width : this._lineWidth,
                material : POLYLINE_COLOR
            },
            label : {
                text : new Cesium.CallbackProperty(function() {
                    return flag ? '水平距离：' + horiDis : '垂直距离：' + verticalDis;
                }, false),
                font : LABEL_FONT,
                fillColor : LABEL_COLOR,
                outlineColor : Cesium.Color.BLACK,
                outlineWidth : 2,
                style : Cesium.LabelStyle.FILL_AND_OUTLINE,
                showBackground : true,
                horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
                verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance : Number.POSITIVE_INFINITY
                show: new Cesium.CallbackProperty(function () {
                    return clicked;
                }, false)

            }
        });

        this._layer.entities.add({
            name : 'drawing',
            position : new Cesium.CallbackProperty(function() {
                return (movePos && verticalPos) ? Cesium.Cartesian3.lerp(Cesium.Cartesian3.clone(movePos), Cesium.Cartesian3.clone(verticalPos), 0.5, new Cesium.Cartesian3()) : undefined;
            }, false),
            polyline : {
                positions : new Cesium.CallbackProperty(function() {
                    return (verticalPos && movePos) ? [verticalPos, movePos] : [];
                }, false),
                width : this._lineWidth,
                material : POLYLINE_COLOR
            },
            label : {
                text : new Cesium.CallbackProperty(function() {
                    return !flag ? '水平距离：' + horiDis : '垂直距离：' + verticalDis;
                }, false),
                font : LABEL_FONT,
                fillColor : LABEL_COLOR,
                outlineColor : Cesium.Color.BLACK,
                outlineWidth : 2,
                style : Cesium.LabelStyle.FILL_AND_OUTLINE,
                showBackground : true,
                horizontalOrigin : Cesium.HorizontalOrigin.CENTER,
                verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance : Number.POSITIVE_INFINITY
                show: new Cesium.CallbackProperty(function () {
                    return clicked;
                }, false)
            }
        });
    };

    /**
     * 停止量高
     */
    DrawTool.prototype.stopElevation = function() {
        drawElevation = false;
        this._handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this._handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };

    /**
     * 移除图层
     */
    DrawTool.prototype.destory = function() {
        this.stopPoint();
        this.stopPolyline();
        this.stopPolygon();
        this.stopElevation();
        this._layer.entities.removeAll()
    };

    // 计算面积
    // function getArea(latLngs, cesiumWidget) {
    //     let pointsCount = latLngs.length,
    //         area = 0.0,
    //         p1, p2;
    //     if (pointsCount > 2) {
    //         for (let i = 0; i < pointsCount; i++) {
    //             p1 = latLngs[i];
    //             p2 = latLngs[(i + 1) % pointsCount];
    //             let ellipsoid = cesiumWidget.scene.globe.ellipsoid;
    //             let p1Xyz = new Cesium.Cartesian3(p1.x, p1.y, p1.z);
    //             let p1wgs84 = ellipsoid.cartesianToCartographic(p1Xyz);
    //             let p2Xyz = new Cesium.Cartesian3(p2.x, p2.y, p2.z);
    //             let p2wgs84 = ellipsoid.cartesianToCartographic(p2Xyz);
    //             area += (p2wgs84.longitude - p1wgs84.longitude) *
    //                     (2 + Math.sin(p1wgs84.latitude) + Math.sin(p2wgs84.latitude));
    //         }
    //         area = area * 6378137.0 * 6378137.0 / 2.0;
    //     }
    //     return Math.abs(area);
    // }
    function getArea(positions) {
        return Math.abs(Cesium.PolygonPipeline.computeArea2D(positions));
    }

    // 计算贴地直线距离
    function calcClampDistance(positions, viewer) {
        const interpolation = 3;
        var len = 0;
        for (let i = 0; i < positions.length - 1; i++) {
            let lerp = Cesium.Cartesian3.lerp(positions[i], positions[i + 1], 0.5, new Cesium.Cartesian3());
            let cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(lerp);
            let height = viewer.scene.globe.getHeight(cartographic);
            // let cartesian = viewer.scene.globe.ellipsoid.cartographicToCartesian(new Cesium.CartoGraphic(cartographic.long))
        }
    }

    // 计算空间直线距离
    function calcSpaceDistance(positions) {
        var len = 0;
        for (let i = 0; i < positions.length - 1; i++) {
            len += Cesium.Cartesian3.distance(positions[i], positions[i + 1]);
        }
        return len;
    }

    Cesium.DrawTool = DrawTool;
})();
