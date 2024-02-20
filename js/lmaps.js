var LLayers = {list: []};
LLayers.getDefault = function(){
    LLayers.list = LLayers._getLayersOSM();
    return LLayers.list;
};

LLayers.clear = function(map){
    for (var i = 0; i < LLayers.list.length; i++)
        map.removeLayer(LLayers.list[i]);
    LLayers.list = [];
};

LLayers._getLayersOSM = function(){
    return [L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        tileSize: 256,
        attribution: '© OpenStreetMap'
    })];
};

LLayers._getLayersESRI = function(){
    return [L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        tileSize: 256,
        attribution: '© OpenStreetMap'
    })];
};

LLayers._getLayersOCM = function(){
    return [L.tileLayer('http://b.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png', {
        tileSize: 256,
        attribution: '© OpenCycleMap'
    })];
};

LLayers._getLayersHBM = function(){
    return [L.tileLayer('http://toolserver.org/tiles/hikebike/{z}/{x}/{y}.png', {
        tileSize: 256,
        attribution: '© HikeBikeMap'
    })];
};


function bingTileToQuadKey( x, y, zoom){
    var quad = "";
    for (var i = zoom; i > 0; i--) {
        var mask = 1 << (i - 1);
        var cell = 0;
        if ((x & mask) != 0) cell++;
        if ((y & mask) != 0) cell += 2;
        quad += cell;
    }
    return quad;
}

LLayers.setMap = function(map, type){
    LLayers.clear(map);

    switch (type)
    {
        case 'OSM':
            LLayers.list = LLayers._getLayersOSM();
            break;
        case 'OCM':
            LLayers.list = LLayers._getLayersOCM();
            break;
        case 'ODM':
            LLayers.list = LLayers._getLayersODM();
            break;
        case 'HBM':
            LLayers.list = LLayers._getLayersHBM();
            break;
        case 'Bing':
            LLayers.list = [L.bingLayer("AvPVILVcCOQJF3eLSyIDQmYAvIBnZ7xo8BD7sfICMqHXP5yO2V2GxR05R_D_h2I7", { type: 'AerialWithLabels'})];
            break;
        case 'ESRI':
            LLayers.list = LLayers._getLayersESRI();
            break;
        case 'YandexSat':
            LLayers.list = [new L.Yandex()];
            break;
    }

    for (var i = 0; i < LLayers.list.length; i++)
        map.addLayer(LLayers.list[i]);
};

//LLayers.removeLayer
