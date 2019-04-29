define([
    // './netcdfjs',
    './WindUtil',
    '../Core/Math',
    '../Core/Resource',
    '../ThirdParty/when',
], function (
    // netcdfjs,
    WindUtil,
    CesiumMath,
    Resource,
    when
) {

    /**
     * 风向数据处理，其中涉及到nc文件，需要一个netcdfjs的nc文件处理库，暂不引入源码中，直接从网上调用
     */
    'use strict';

    var windData = {};
    function WindDataProcess() {

    }

    WindDataProcess.loadData = function (fileOptions) {
        return loadNetCDF(fileOptions.dataDirectory);
    };

    WindDataProcess.randomizeParticleLonLatLev = function (maxParticles, lonLatRange) {
        var array = new Float32Array(3 * maxParticles);
        for (var i = 0; i < maxParticles; i++) {
            array[3 * i] = CesiumMath.randomBetween(lonLatRange.lon.min, lonLatRange.lon.max);
            array[3 * i + 1] = CesiumMath.randomBetween(lonLatRange.lat.min, lonLatRange.lat.max);
            array[3 * i + 2] = CesiumMath.randomBetween(windData.lev.min, windData.lev.max);
        }
        return array;
    };

    function loadNetCDF(dataDirectory) {
        var ncFilePath = dataDirectory + "demo.nc";
        var resource = Resource.createIfNeeded(ncFilePath);
        var promise = resource.fetchArrayBuffer();
        return when(promise).then(function (buffer) {

            var arrayToMap = function (array) {
                return array.reduce(function (map, object) {
                    map[object.name] = object;
                    return map;
                }, {});
            };
            var NetCDF = new netcdfjs(buffer);
            windData = {};

            var dimensions = arrayToMap(NetCDF.dimensions);
            windData.dimensions = {};
            windData.dimensions.lon = dimensions['lon'].size;
            windData.dimensions.lat = dimensions['lat'].size;
            windData.dimensions.lev = dimensions['lev'].size;

            var variables = arrayToMap(NetCDF.variables);
            var uAttributes = arrayToMap(variables['U'].attributes);
            var vAttributes = arrayToMap(variables['V'].attributes);

            windData.lon = {};
            windData.lon.array = new Float32Array(NetCDF.getDataVariable('lon').flat());
            windData.lon.min = Math.min(...windData.lon.array);
            windData.lon.max = Math.max(...windData.lon.array);

            windData.lat = {};
            windData.lat.array = new Float32Array(NetCDF.getDataVariable('lat').flat());
            windData.lat.min = Math.min(...windData.lat.array);
            windData.lat.max = Math.max(...windData.lat.array);

            windData.lev = {};
            windData.lev.array = new Float32Array(NetCDF.getDataVariable('lev').flat());
            windData.lev.min = Math.min(...windData.lev.array);
            windData.lev.max = Math.max(...windData.lev.array);

            windData.U = {};
            windData.U.array = new Float32Array(NetCDF.getDataVariable('U').flat());
            windData.U.min = uAttributes['min'].value;
            windData.U.max = uAttributes['max'].value;

            windData.V = {};
            windData.V.array = new Float32Array(NetCDF.getDataVariable('V').flat());
            windData.V.min = vAttributes['min'].value;
            windData.V.max = vAttributes['max'].value;

            var colorTableFilePath = dataDirectory + 'colorTable.json';
            return loadColorTable(colorTableFilePath);
        });

    }

    function loadColorTable(filePath) {
        var resource = Resource.createIfNeeded(filePath);
        var promise = resource.fetchText();

        return when(promise).then(function (text) {
            var json = JSON.parse(text);

            var colorNum = json['ncolors'];
            var colorTable = json['colorTable'];

            var colorsArray = new Float32Array(3 * colorNum);
            for (var i = 0; i < colorNum; i++) {
                colorsArray[3 * i] = colorTable[3 * i];
                colorsArray[3 * i + 1] = colorTable[3 * i + 1];
                colorsArray[3 * i + 2] = colorTable[3 * i + 2];
            }

            windData.colorTable = {};
            windData.colorTable.colorNum = colorNum;
            windData.colorTable.array = colorsArray;

            return windData;
        });
    }

    return WindDataProcess;
});
