"use strict";

var App = {
    history: [],
    index: -1
};

App.go = function(action){
    if (action.execute()) {
        App.history.push(action);
        App.index++;

        if (App.history.length > 100) {
            App.history.shift();
            App.index--;
        }
    }
};
App.undo = function(){
    if (App.index >= 0) {
        var action = App.history[App.index];
        action.rollback();
        App.index--;
    }
};
App.redo = function(){
    if (App.index < App.history.length) {
        var action = App.history[App.index];
        action.execute();
        App.index++;
    }
};

function AppAction(exec, rollb)
{
    this.execute = function(){
        return exec();
    };
    this.rollback = function(){
        return rollb();
    };
}

function AppMultiAction(list)
{
    this.list = list;

    this.execute = function(){
        for (let i = 0; i++; i < this.list.length)
            this.list[i].execute();
        return true;
    };
    this.rollback = function(){
        for (let i = this.list.length - 1; i--; i >= 0)
            this.list[i].rollback();
        return true;
    };
}

function AddPointAction(p)
{
    this.p = p;
    this.index = null;

    this.execute = function(){
        this.index = GP._activeTrack.addPoint(this.p);
        return this.index !== null;
    };
    this.rollback = function(){
    };
}

// mouse event -> validate -> create action / anti-action

//--------------------------------------------------------------------------------------------------------------------//
var GP = {
    debug: location.protocol == "http:" ? 1 : 0,

    currentProfile: "car",// "motorcycle", "racingbike", "mtb"
    profiles: ["bike", "car"],

    __tracks: [],
    myLatlng: null,
    bounds: null,
    div: null,

    editMarkerIconOptions: null,
    mousePosition: null,
    editMode: "NONE",
    createMode: "ROUTE", // "TRACK",
    isModified: false,

    _map: null,
    _gpTracks: [],
    _gpPoints: [],
    _activeTrack: null,
    _activePoint: null,

    __onTrackAdded: null,
    __onTrackChanged: null,
    __onTrackDeleted: null,

    __onPointAdded: null,
    __onPointChanged: null,
    __onPointDeleted: null,

    __onActivateTrack: null,
    __onActivatePoint: null,

    __onAction: null,
    __onReady: null,
    __onEditMode: null,
    __onCreateMode: null,
    __onLatLng: null,

    routingIsInProgress: 0,

    _buffer: []
};

GP.setRoutingType = function(val){
    GP.currentProfile = val;
    GP.dispatch("onRoutingChanged");
};

GP.nextRoutingType = function(){
    var k = GP.profiles.indexOf(GP.currentProfile);
    k++;
    if (k >= GP.profiles.length)
        k = 0;

    GP.currentProfile = GP.profiles[k];
    GP.dispatch("onRoutingChanged");
};

GP.addListener = function(event, callback){
    this['__' + event] = callback;
};
GP.dispatch = function(event){
    var args = Array.prototype.slice.call(arguments);
    args.shift();
    if (this['__' + event] != null)
        this['__' + event].apply(null, args);
};

GP.historyClear = function(){
    GP._buffer = [];
    GP.dispatch('onAction', null);
};
GP.historyPush = function(action){
    GP._buffer.push(action);
    if (GP._buffer.length > 5)
        GP._buffer.shift();
    GP.dispatch('onAction', action);
};

GP.undo = function(){
    GP.historyPop();
    if (GP._buffer.length)
        GP.dispatch('onAction', GP._buffer[GP._buffer.length - 1]);
    else
        GP.dispatch('onAction', null);
};
GP.historyPop = function(){
    var action = GP._buffer.pop();
    if (!action)
        return;

    var func =  action.action;
    var obj =   action.obj;
    var args =  action.args;

    func.apply(obj, args);
};

GP.showDemoTrackPosition = function(d){
    GP.getActiveTrack().demoMarkerShow(d);
};
GP.hideDemoTrackPosition = function() {
    GP.getActiveTrack().demoMarkerHide();
};

GP.getActiveTrack = function(){
    return GP._activeTrack;
};
GP.hideAllMarkers = function(){

};
GP.getTracks = function(){
    var result = [];
    for (let i = 0; i < GP._gpTracks.length; i++)
        result.push(GP._gpTracks[i]);
    return result;
};
GP.getPoints = function(){
    var result = [];
    for (let i = 0; i < GP._gpPoints.length; i++)
        result.push(GP._gpPoints[i]);
    return result;
};
GP.getCollection = function(){
    var result = [];
    for (let i = 0; i < GP._gpTracks.length; i++)
        result.push(GP._gpTracks[i]);
    for (let i = 0; i < GP._gpPoints.length; i++)
        result.push(GP._gpPoints[i]);
    return result;
};

GP.getActivePoint = function(){
    return GP._activePoint;
};
GP.deletePoint = function(waypoint){
    var active = false;
    if (waypoint == GP._activePoint)
    {
        GP.setActivePoint(null);
        active = true;
    }

    var k = GP._gpPoints.indexOf(waypoint);
    GP._gpPoints.splice(k, 1);
    GP.dispatch('onPointDeleted', waypoint);
    //waypoint.remove();
    waypoint.hide();

    //***********************//
    GP.historyPush({
        name: 'Delete Point ' + waypoint.name,
        action: GP._restorePoint,
        obj: null,
        args: [waypoint, k, active]
    });
};
GP._restorePoint = function(waypoint, index, activate){
    waypoint.show();
    GP._gpPoints.splice(index, 0, waypoint);
    GP.dispatch("onPointAdded", waypoint);
    if (activate)
        GP.setActivePoint(waypoint);
};

GP.toggleVisibility = function(track){
    if (track == GP._activeTrack)
    {
        GP.setEditMode("");
        GP.setActiveTrack(null);
    }
    track.toggleVisibility();
};

GP.toggleBlocked = function(track){
    if (track == GP._activeTrack)
    {
        GP.setEditMode("");
        GP.setActiveTrack(null);
    }
    track.toggleBlocked();
};

GP.deleteTrack = function(track){
    var active = false;
    if (track == GP._activeTrack)
    {
        GP.setEditMode("");
        GP.setActiveTrack(null);
        active = true;
    }

    var k = GP._gpTracks.indexOf(track);
    GP._gpTracks.splice(k, 1);
    GP.dispatch('onTrackDeleted', track);
    //track.clear();
    track.hide();

    //***********************//
    GP.historyPush({
        name: 'Delete Track ' + track.name,
        action: GP._restoreTrack,
        obj: null,
        args: [track, k, active]
    });
    GP.reindex();
};
GP._restoreTrack = function(track, index, activate){
    track.show();
    GP._gpTracks.splice(index, 0, track);
    GP.dispatch('onTrackAdded', track);
    if (activate)
        GP.setActiveTrack(track);
};

GP.defaultStyle = {
    color: "#0000FF",
    opacity: 0.4,
    width: 5
};
GP.defaultIcon = 'default';
GP.setDefaultIcon = function(icon){
    GP.defaultIcon = icon;
};
GP.setDefaultStyle = function(key, value){
    GP.defaultStyle[key] = value;
};

GP.navTiid = 0;

//http://mapicons.nicolasmollet.com/markers/
GP.icons = {
    'default':      'star-3g.png',           // http://mapicons.nicolasmollet.com/markers/tourism/place-to-see/star/?custom_color=66c546
    'star-b':       'star-3b.png',          // http://mapicons.nicolasmollet.com/markers/tourism/place-to-see/star/?custom_color=0000ff
    'star-r':       'star-3r.png',          // http://mapicons.nicolasmollet.com/markers/tourism/place-to-see/star/?custom_color=ff0000

    'star-l':       'star-3l.png',          //
    'star-y':       'star-3y.png',          //
    'star-p':       'star-3p.png',          //
    'star-k':       'star-3k.png',          //

    'asterisco-g':  'asterisco-g.png',      //
    'asterisco-b':  'asterisco-b.png',      //
    'asterisco-r':  'asterisco-r.png',      //
    'asterisco-l':  'asterisco-l.png',      //
    'asterisco-y':  'asterisco-y.png',      //
    'asterisco-p':  'asterisco-p.png',      //
    'asterisco-k':  'asterisco-k.png',      //

    'biking':       'mountainbiking-3.png', // ?custom_color=7193d6
    'finish':       'finish.png',           // ?custom_color=000000
    'aircraft':     'aircraftsmall.png',    // ???
    'airport':      'airport.png',          // ???
    'caution':      'caution.png',          // ?custom_color=FF0000
    'cycling':      'cycling.png',          // ?custom_color=7193d6
    'dragon':       'dragon.png',           // ???
    'monkey':       'monkey-export.png',    // ???
    'palace':       'palace-2.png',         // https://mapicons.mapsmarker.com/markers/tourism/old-defensive-buildings/palace/
    'river':        'river-2.png',          // ?custom_color=7193d6
    'sailing':      'sailing.png',          // ?custom_color=7193d6
    'shore':        'shore-2.png',          // ?custom_color=7193d6
    'steamtrain':   'steamtrain.png',       // ?custom_color=7193d6
    'stop':         'stop.png',             // http://mapicons.nicolasmollet.com/markers/transportation/road-signs/stop/?custom_color=FF0000
    'tramway':      'tramway.png',          // http://mapicons.nicolasmollet.com/markers/transportation/other-types-of-transportation/tram/?custom_color=7193d6
    'waterdrop':    'waterdrop.png',        // http://mapicons.nicolasmollet.com/markers/nature/natural-marvels/water-source/?custom_color=7193d6
    'skull':        'skull.png',            // http://mapicons.nicolasmollet.com/markers/events/crime/pirates/?custom_color=383838
    'mall':         'mall.png',             // https://mapicons.mapsmarker.com/markers/stores/general-merchandise/shopping-mall/?custom_color=ff8c00
    'mountains':    'mountains.png',        // https://mapicons.mapsmarker.com/markers/nature/natural-marvels/mountains/?custom_color=126b8c
    'campfire':     'campfire-2.png',       // https://mapicons.mapsmarker.com/markers/tourism/campfire/?custom_color=ff9100
    'picnic':       'picnic-2.png',         // https://mapicons.mapsmarker.com/markers/tourism/picnic/?custom_color=7d5100
};

GP.iconPopups = {
    menu1: {
        items: ['default', 'star-b', 'star-r', 'star-l', 'star-y', 'star-p', 'star-k', 'asterisco-g', 'asterisco-b', 'asterisco-r', 'asterisco-l', 'asterisco-y', 'asterisco-p', 'asterisco-k'],
        w: 102,
        h: 210,
        x: 0,
        y: 0
    }
};
GP.iconToolbar = [];

/*GP.iconPanels = {
    'default':      'menu1',
    'star-b':       'menu1',
    'star-r':       'menu1',

    'biking':       null,
    'finish':       null,
    'aircraft':     null,
    'airport':      null,
    'caution':      null,
    'cycling':      null,
    'dragon':       null,
    'monkey':       null,
    'palace':       null,
    'river':        null,
    'sailing':      null,
    'shore':        null,
    'steamtrain':   null,
    'stop':         null,
    'tramway':      null,
    'waterdrop':    null,
    'skull':        null
};*/

GP.pointIcons = {};

GP.navComplete = false;
GP.askPosition = function(){
    try {
        console.log("ASK USER LOCATION!");
        GP.navTiid = setTimeout(GP.geoNavCancel, 5000);
        navigator.geolocation.getCurrentPosition(GP.geoNavComplete, GP.geoNavCancel, GP.geoNavError);
    } catch (err) {
        console.error("GP.askPosition", err);
        GP.defaultPosition();
    }
};

GP.defaultPosition = function(){
    if (GP.navComplete)
        return;

    if (location.protocol == "http:") {
        GP.navComplete = true;
        GP.setStartPoint(50, 36.2302);
        if (!GP._map)
            GP.initialize();
    }
};

GP.geoNavError = function(err){
    clearTimeout(GP.navTiid);
    console.error("GP.geoNavError", err);
    GP.defaultPosition();
};

GP.geoNavCancel = function(){
    console.warn("GP.geoNavCancel");
    GP.defaultPosition();
};

GP.geoNavComplete = function(location){
    clearTimeout(GP.navTiid);
    GP.navComplete = true;
    GP.setStartPoint(location.coords.latitude, location.coords.longitude);
    if (!GP._map)
        GP.initialize();
};

GP.initialize = function(){
    for (let k in GP.icons) if (GP.icons.hasOwnProperty(k))
        GP.pointIcons[k] = {
            anchor:	new google.maps.Point(16, 36),
            scaledSize:	new google.maps.Size(32, 37),
            size: new google.maps.Size(32, 37),
            url: 'img/points/' + GP.icons[k] };

    GP.markerIcons = {
        x: {
            anchor:	new google.maps.Point(4, 4),
            scaledSize:	new google.maps.Size(9, 9),
            size: new google.maps.Size(9, 9),
            url: 'img/tracks/mx.png'
        },
        i: {
            anchor:	new google.maps.Point(4, 4),
            scaledSize:	new google.maps.Size(9, 9),
            size: new google.maps.Size(9, 9),
            url: 'img/tracks/mi.png'
        },
        c: {
            anchor:	new google.maps.Point(4, 4),
            scaledSize:	new google.maps.Size(9, 9),
            size: new google.maps.Size(9, 9),
            url: 'img/tracks/mc.png'
        },
        0: {
            anchor:	new google.maps.Point(5, 5),
            scaledSize:	new google.maps.Size(11, 11),
            size: new google.maps.Size(11, 11),
            url: 'img/tracks/m0.png'
        },
        1: {
            anchor:	new google.maps.Point(5, 5),
            scaledSize:	new google.maps.Size(11, 11),
            size: new google.maps.Size(11, 11),
            url: 'img/tracks/m1.png'
        },

        xr: {
            anchor:	new google.maps.Point(4, 4),
            scaledSize:	new google.maps.Size(9, 9),
            size: new google.maps.Size(9, 9),
            url: 'img/tracks/mxr.png'
        },
        ir: {
            anchor:	new google.maps.Point(4, 4),
            scaledSize:	new google.maps.Size(9, 9),
            size: new google.maps.Size(9, 9),
            url: 'img/tracks/mir.png'
        },
        cr: {
            anchor:	new google.maps.Point(4, 4),
            scaledSize:	new google.maps.Size(9, 9),
            size: new google.maps.Size(9, 9),
            url: 'img/tracks/mcr.png'
        },
        '0r': {
            anchor:	new google.maps.Point(5, 5),
            scaledSize:	new google.maps.Size(11, 11),
            size: new google.maps.Size(11, 11),
            url: 'img/tracks/m0r.png'
        },
        '1r': {
            anchor:	new google.maps.Point(5, 5),
            scaledSize:	new google.maps.Size(11, 11),
            size: new google.maps.Size(11, 11),
            url: 'img/tracks/m1r.png'
        }
    };

    var mapOptions = {
        center: GP.myLatlng ? GP.myLatlng : new google.maps.LatLng(0, 0),
        zoom: GP.myLatlng ? 15 : 1,
        streetViewControl: false,
        mapTypeControl: false,
        mapTypeControlOptions: null,
        zoomControl: true,
        scaleControl: true,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
    };

    /*var noPOILabels = [{
        featureType: "poi",
        elementType: "labels",
        stylers: [ { visibility: "off" } ]
    }];
    var noPOIMapType = new google.maps.StyledMapType(noPOILabels, {name: "NO POI"});*/

    GP._map = new google.maps.Map(document.getElementById(GP.div), mapOptions);

    if (GP.bounds)
        GP._map.fitBounds(GP.bounds);
    else
        GP._map.setZoom(GP.myLatlng ? 15 : 1);

    $('#' + GP.div).css('background-color', "");

    Maps.addSupport(GP._map);

    if (GP.__tracks)
        for (let i = 0; i < GP.__tracks.length; i++)
        {
            var pointList = [];
            var points = GP.__tracks[i].points;
            for (let j = 0; j < points.length; j++)
                pointList.push(new google.maps.LatLng(points[j][0], points[j][1]));

            GP._gpTracks[i] = new GPTrack(i, GP.__tracks[i].name, GP.__tracks[i].description, pointList, GP._map);
        }

    var dragStartCenter = null;
    google.maps.event.addListener(GP._map, "dragstart", function() {
        dragStartCenter = GP._map.getCenter();
    });

    google.maps.event.addListener(GP._map, "dragend", function() {
        if (dragStartCenter && dragStartCenter.equals(GP._map.getCenter())) {
            // execute panBy() if the map has not been moved during dragging.
            GP._map.panBy(0, 0);
        }
    });

    google.maps.event.addListener(GP._map, "mousemove", function(event) {
        // MAP-MOVE
        GP.mousePosition = event.latLng;

        if (GP._activeTrack)
            GP._activeTrack.updateNewPointPosition(GP.mousePosition);

        GP.dispatch("onLatLng", GP.mousePosition);
    });

    google.maps.event.addListener(GP._map, "rightclick", function(event) {
        if (GP.debug) console.log("MAP-RCLICK");
        if (["SPLIT", "JOIN", "START", "END", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(GP.editMode) >= 0)
            GP.setEditMode("NONE");
        else if (["NONE"].indexOf(GP.editMode) >= 0)
            GP.setActiveTrack(null);
        if (GP.getActivePoint())
            GP.setActivePoint(null);
    });

    //google.maps.event.addListener(GP._map, 'mouseup', function(event) {
    //});

    google.maps.event.addListener(GP._map, "click", function(event) {
        if (GP.debug) console.log("MAP-CLICK", GP.editMode);
        if (["SPLIT", "JOIN", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(GP.editMode) >= 0) return;

        if (GP.routingIsInProgress)
            return;

        var p = event.latLng;
        GP.mousePosition = p;

        if (!GP._activeTrack)
        {
            if (GP.createMode == "TRACK")
                GP.goNewLine(GP.createMode);
            else if (GP.createMode == "ROUTE")
                GP.goNewLine(GP.createMode);
            else
                GP.goNewPoint(p);
        }

        if (GP._activeTrack)
        {
            if (GP._activeTrack.trackPoints.length > 0 && ["NONE"].indexOf(GP.editMode) >= 0)
                GP.setActiveTrack(null);
            else {
                ////App.go(new AddPointAction(p));
                GP._activeTrack.addPoint(p);
            }
        }
    });

    GP.dispatch("onReady");
    GP.dispatch("onCreateMode", GP.createMode);
};

GP.createNewPoint = function(name, description, point, id, icon){
    if (!id)
        id = (new Date()).getTime();
    var waypoint = new GPPoint(id, name, description, point, GP._map, icon);
    GP._gpPoints.push(waypoint);
    GP.dispatch("onPointAdded", waypoint);
    return waypoint;
};

GP.createNewTrack = function(name, description, points, id, style, type, visible, blocked, segments){
    if (!id)
        id = (new Date()).getTime();
    var track = new GPTrack(id, name, description, points, GP._map, style, type, visible, blocked, segments);
    GP._gpTracks.push(track);
    GP.dispatch("onTrackAdded", track);
    if (GP.debug) console.log("Track Added", name);
    return track;
};

GP.reindex = function () {
    for (let i = 0; i < GP._gpTracks.length; i++) {
        GP._gpTracks[i].setZIndex(i + 1);
    }
};

GP.setMapType = function(mode){
    GP.mapType = mode;
    //google.maps.MapTypeId.TERRAIN

    while (GP._map.overlayMapTypes.length > 0)
        GP._map.overlayMapTypes.removeAt(0);
        //GP._map.overlayMapTypes.removeAt(0, GP.overlay);

    if (GP.overlay)
        GP._map.overlayMapTypes.push(GP.overlay);

    switch (mode)
    {
        case 'Google0':
            GP._map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
            break;
        case 'Google1':
            GP._map.setMapTypeId(google.maps.MapTypeId.HYBRID);
            break;
        case 'Google2':
            GP._map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
            break;
        case 'OSM':
            GP._map.setMapTypeId('OSM');
            break;
        case 'OCM':
            GP._map.setMapTypeId('OCM');
            break;
        case 'ODM':
            GP._map.setMapTypeId('ODM');
            break;
        case 'HBM':
            GP._map.setMapTypeId('HBM');
            break;
        case 'YandexSat':
            GP._map.setMapTypeId('YandexSat');
            break;
        case 'YandexHibryd':
            GP._map.setMapTypeId('YandexSat');
            GP._map.overlayMapTypes.insertAt(0, Maps.yandexOverlayType);
            ////GP.overlay = Maps.yandexOverlayType;
            break;
        case 'YandexMap':
            GP._map.setMapTypeId('YandexMap');
            break;
        case 'Digital':
            GP._map.setMapTypeId('DGlobe');
            GP._map.overlayMapTypes.insertAt(0, Maps.overlayDigitalGlobe);
            ////GP.overlay = Maps.overlayDigitalGlobe;
            break;
        case 'Bing':
            GP._map.setMapTypeId('Bing');
            break;
        case 'ESRI':
            GP._map.setMapTypeId('ESRI');
            break;
    }
};

///GP.enabledOver

GP.setOverlayType = function(overlay){
    if (GP.debug) console.log(overlay);
    switch (overlay) {
        case "StravaR":
            GP.overlay = Maps.overlayStravaR;
            break;
        default:
            GP.overlay = null;
            break;
    }
    GP.setMapType(GP.mapType);
};

GP.setCreateMode = function(mode, deactivate){
    GP.createMode = mode;
    GP.dispatch("onCreateMode", mode);

    if (deactivate) {

        if (mode === "POINT") {
            if (GP.getActiveTrack()) {
                GP.setEditMode('NONE');
                GP.setActiveTrack(null);
            }
        }
        else {
            if (GP.getActiveTrack()) {
                if (GP.getActiveTrack().trackPoints.length === 1) {
                    GP.getActiveTrack().changeType(GP.getActiveTrack().type === "ROUTE" ? "TRACK" : "ROUTE");
                } else {
                    GP.setEditMode('NONE');
                    GP.setActiveTrack(null);
                }
            }
        }

        if (GP.getActivePoint())
            GP.setActivePoint(null);
    }
};

GP.setEditMode = function(mode){
    GP.editMode = mode;
    GP.dispatch("onEditMode", mode);

    if (mode === "NONE")
    {
        if (GP._activeTrack && GP._activeTrack.trackPoints.length === 1)
        {
            GP.deleteTrack(GP._activeTrack);
            return;
        }
    }
    if (mode === "DEMO")
    {
        GP.setActiveTrack(null);
        GP.dispatch('onActivateTrack', null);
        var b = GP.getBounds(GP.getCollection());
        if (b)
            GP._map.fitBounds(b);

        //GP.__center = GP._map.getCenter();

        var el = document.getElementById(GP.div);
        if (el.requestFullscreen)            el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen)    el.mozRequestFullScreen();
        else if (el.msRequestFullscreen)     el.msRequestFullscreen();
    }

    if (GP._activeTrack && mode !== "DEMO")
        GP._activeTrack.setEditMode(GP.editMode);

    /*for (let i = 0; i < GP._gpTracks.length; i++)
    {
        if (GP._gpTracks[i] != GP._activeTrack)
        {
            if (mode == "JOIN")
                GP._gpTracks[i].setEditMode('JOIN_TARGET');
            else
                GP._gpTracks[i].setEditMode("");
        }
    }*/

    //if (mode == "")
    for (let i = 0; i < GP._gpTracks.length; i++)
    {
        if (GP._gpTracks[i] != GP._activeTrack)
        {
            GP._gpTracks[i].setEditMode(mode == "DEMO" ? "DEMO" : "");
            //console.log(mode == "DEMO" ? "DEMO" : "");
        }
    }

    if (mode == "")
        GP.enablePoints();
    else
        GP.disablePoints();
};

GP.getPoint = function(index){
    for (let i = 0; i < GP._gpPoints.length; i++)
    {
        if (GP._gpPoints[i].id == index)
            return GP._gpPoints[i];
    }
    return null;
};

GP.getTrack = function(index){
    for (let i = 0; i < GP._gpTracks.length; i++)
    {
        if (GP._gpTracks[i].id == index)
            return GP._gpTracks[i];
    }
    return null;
};
GP.setPointPosition = function(waypoint, index){
    var k = GP._gpPoints.indexOf(waypoint);
    GP._gpPoints.splice(k, 1);
    GP._gpPoints.splice(index, 0, waypoint);
};
GP.setTrackPosition = function(track, index){
    var k = GP._gpTracks.indexOf(track);
    GP._gpTracks.splice(k, 1);
    GP._gpTracks.splice(index, 0, track);
    GP.reindex();
};

GP.setActivePoint = function(index){
    if (index instanceof Object)
        GP._activePoint = index;
    else
        GP._activePoint = GP.getPoint(index);
    //else
    //    GP._activePoint = index;

    GP.dispatch('onActivatePoint', GP._activePoint);
    if (GP._activePoint)
    {
        GP.setActiveTrack(null);
        GP.setCreateMode("POINT");
    }
};

GP.disablePoints = function(){
    for (let i = 0; i< GP._gpPoints.length; i++)
        GP._gpPoints[i].disable();
};
GP.enablePoints = function(){
    for (let i = 0; i< GP._gpPoints.length; i++)
        GP._gpPoints[i].enable();
};

GP.setActiveTrack = function(index, mode){
    if (GP._activeTrack)
    {
        GP.editMode = GP._activeTrack.editMode;
        GP._activeTrack.colorback();
        GP._activeTrack.setEditMode("");
    }

    if (mode)
        GP.editMode = mode;
    if (["", "DEMO", "LOCK"].indexOf(GP.editMode) >= 0)
        GP.editMode = "NONE";

    if (index instanceof Object)
        GP._activeTrack = index;
    else
        GP._activeTrack = GP.getTrack(index);

    //else
    //    GP._activeTrack = index;

    GP.dispatch("onActivateTrack", GP._activeTrack);

    if (!GP._activeTrack)
    {
        GP._map.setOptions({draggableCursor: ""});
        GP.setEditMode("");
    }
    else
    {
        if (!GP._activeTrack.visible)
            GP._activeTrack.toggleVisibility();
        if (GP._activeTrack.blocked)
            GP._activeTrack.toggleBlocked();

        GP._activeTrack.colorback();
        GP.setEditMode(GP.editMode);
    }

    if (GP._activeTrack || mode == "DEMO")
    {
        GP.setActivePoint(null);
        GP.setCreateMode(GP._activeTrack.type.toLocaleUpperCase());
    }

    //console.log('Active', index, mode, GP._activeTrack, GP.editMode);
};

GP.makeClose = function(){
    if (!GP._activeTrack)
        return;

    GP._activeTrack.makeClose();
};
GP.changeType = function(toType){
    if (!GP._activeTrack)
        return;

    GP._activeTrack.changeType(toType);
};
GP.makeReverse = function(){
    if (!GP._activeTrack)
        return;

    GP._activeTrack.makeReverse();
};
GP.makeCopy = function(){
    if (!GP._activeTrack)
        return;
    if (GP.routingIsInProgress)
        return;

    var points = [];
    var segments = null;
    for (let i = 0; i < GP._activeTrack.trackPoints.length; i++)
    {
        points.push(
            new google.maps.LatLng(
                GP._activeTrack.trackPoints[i].lat(),
                GP._activeTrack.trackPoints[i].lng()
            )
        );
    }

    if (GP._activeTrack.type == "ROUTE")
    {
        segments = [];
        for (let i = 0; i < GP._activeTrack.routeSegments.length; i++)
        {
            var segment = GP._activeTrack.getSegmentAt(i);
            if (segment)
            {
                segments[i] = [];
                for (let j = 0; j < segment.length; j++)
                {
                    segments[i].push(
                        new google.maps.LatLng(
                            segment[j].lat(),
                            segment[j].lng()
                        )
                    );
                }
            }
            else
            {
                segments[i] = null;
            }
        }
    }

    GP.createNewTrack(GP._activeTrack.name + "+", GP._activeTrack.description, points, null,
        { color: GP._activeTrack.style.color, opacity: GP._activeTrack.style.opacity, width: GP._activeTrack.style.width },
        GP._activeTrack.type, true, false, segments
    );
};

GP.goNewPoint = function(point){
    var waypoint = GP.createNewPoint("New Point", "", point, null, GP.defaultIcon);
    //waypoint.animate();
    //GP.setActivePoint(waypoint);
};
GP.goNewLine = function(type){
    var track = GP.createNewTrack(type == "ROUTE" ? "New Route" : "New Line", "", [], null,
        { color: GP.defaultStyle.color, opacity: GP.defaultStyle.opacity, width: GP.defaultStyle.width }, type, true, false);
    GP.setActiveTrack(track, "NONE");
};
GP.goJoin = function(){
    if (!GP._activeTrack)
        return;

    GP.setEditMode("JOIN");
};

GP.goDelete = function(){
    if (!GP._activeTrack)
        return;

    GP.deleteTrack(GP._activeTrack);
};

GP.goCut = function(){
    if (!GP._activeTrack)
        return;

    if (GP._activeTrack.trackPoints < 4)
        return;

    GP.setEditMode("CUT");
};
GP.goCutX = function(){
    if (!GP._activeTrack)
        return;

    if (GP._activeTrack.trackPoints < 4)
        return;

    GP.setEditMode("CUTX");
};
GP.goSplit = function(){
    if (!GP._activeTrack)
        return;

    if (GP._activeTrack.trackPoints < 3)
        return;

    GP.setEditMode("SPLIT");
};

GP.clear = function(){
    GP.setEditMode("NONE");

    for (let i = GP._gpTracks.length - 1; i >= 0; i--)
        GP.deleteTrack(GP._gpTracks[i]);

    for (let i = GP._gpPoints.length - 1; i >= 0; i--)
        GP.deletePoint(GP._gpPoints[i]);

    GP.historyClear();
};

GP.getGPSData = function(visibleOnly, selectedOnly){
    //GP.setEditMode("NONE");

    let tracks = [];
    let toExport = selectedOnly ?
        (GP._activeTrack ? [GP._activeTrack] : []) :
        GP._gpTracks;

    for (let i = 0; i < toExport.length; i++) {
        if (toExport[i].trackPoints.length < 2)
            continue;

        if (visibleOnly && !toExport[i].visible)
            continue;

        let tObj = {};
        tObj.name = toExport[i].name;
        tObj.description = toExport[i].description;
        tObj.points = [];
        tObj.style = toExport[i].style;
        tObj.type = toExport[i].type;
        tObj.visible = toExport[i].visible;
        tObj.blocked = toExport[i].blocked;
        tObj.segments = [];

        //tObj.transport = "car";

        for (let j = 0; j < toExport[i].trackPoints.length; j++)
            tObj.points.push({
                x: toExport[i].trackPoints[j].lat().toFixed(5),
                y: toExport[i].trackPoints[j].lng().toFixed(5)
            });

        if (toExport[i].type === "ROUTE") {
            for (let j = 0; j < toExport[i].trackPoints.length - 1; j++)
            {
                tObj.segments[j] = [];
                let segment = toExport[i].getSegmentAt(j);
                if (segment) {
                    for (let k = 0; k < segment.length; k++) {
                        tObj.segments[j].push({
                            x: segment[k].lat().toFixed(5),
                            y: segment[k].lng().toFixed(5)
                        });
                    }
                } else {
                    toExport[i].routeSegments[j] = null;
                }
            }
        }
        tracks.push(tObj);
    }

    let waypoints = [];
    if (!selectedOnly) {
        for (let i = 0; i < GP._gpPoints.length; i++) {
            let wObj = {};
            wObj.name = GP._gpPoints[i].name;
            wObj.description = GP._gpPoints[i].description;
            wObj.icon = GP._gpPoints[i].icon;
            wObj.position = {
                x: GP._gpPoints[i].point.lat().toFixed(5),
                y: GP._gpPoints[i].point.lng().toFixed(5)
            };
            waypoints.push(wObj);
        }
    }
    return (waypoints.length > 0 || tracks.length > 0) ? {waypoints: waypoints, tracks: tracks} : null;
};

/* Class GPPoint */
function GPPoint(id, name, description, point, map, icon, style)
{
    var instance = this;

    this.style =        style || {};

    this.id =           id;
    this.name =         name;
    this.description =  description;
    this.icon =         icon || 'default';
    this.map =          map;

    this.point = null;
    this.marker = null;

    this.setName = function(value){
        this.name = value;
        this.marker.setTitle(value);
        GP.dispatch('onPointChanged', this);
    };

    this.setDescription = function(value){
        this.description = value;
        GP.dispatch('onPointChanged', this);
    };

    this.setIcon = function(value){
        this.icon = value;
        this.marker.setIcon(GP.pointIcons[value]);
        GP.dispatch('onPointChanged', this);
    };

    this.makeMarker = function(point){
        if (!GP.pointIcons[this.icon])
            this.icon = 'default';

        var marker = new google.maps.Marker({
            position: point,
            icon: GP.pointIcons[this.icon],
            raiseOnDrag: false,
            draggable: true,
            clickable: true,
            map: this.map,
            zIndex: 10,
            title: name
        });

        google.maps.event.addListener(marker, 'rightclick', function(event) {
            if (GP.debug) console.log("MARKER1-RCLICK");
            GP.deletePoint(instance);
        });
        google.maps.event.addListener(marker, "mousedown", function(event) {
            GP.setActivePoint(instance);
        });
        /*google.maps.event.addListener(marker, 'drag', function(event) {
            console.log(event);
            ///instance.onPointChanged(event.latLng);
        });*/
        google.maps.event.addListener(marker, 'dragend', function(event) {
            if (GP.debug) console.log(event);
            instance.onPointChanged(event.latLng);
        });

        this.marker = marker;
    };

    this.onPointChanged = function(point){
        this.point = point;
        GP.dispatch('onPointChanged', this);
    };

    this.animate = function(){
        this.marker.setAnimation(google.maps.Animation.DROP);
    };

    this.delete = function(){
        GP.deleteMarker(this);
    };

    this.hide = function(){
        this.colorback();
        this.marker.setMap(null);
    };
    this.show = function(){
        this.marker.setMap(this.map);
    };
    this.remove = function(){
        this.marker.setMap(null);
        this.marker = null;
    };
    this.update = function(){
        this.marker.setPosition(this.point);
        GP.dispatch('onPointChanged', this);
    };

    this.highlight = function(){
        this.marker.setAnimation(google.maps.Animation.BOUNCE);
    };
    this.colorback = function(){
        this.marker.setAnimation(null);
    };

    this.disable = function(){
        this.marker.setClickable(false);
        this.marker.setDraggable(false);
    };
    this.enable = function(){
        this.marker.setClickable(true);
        this.marker.setDraggable(true);
    };
    var init = function(point){
        this.point = point;
        this.makeMarker(point);
    };

    //
    init.call(this, point);
}

/* Class GPTrack */
function GPTrack(id, name, description, points, map, style, type, visible, blocked, segments)
{
    var instance = this;

    this.visible =       true;
    this.blocked =       false;
    this.type =          type || "TRACK"; // track/route???
    this.style =         style || {};
    this.style.color =   this.style.color || GP.defaultStyle.color;
    this.style.opacity = this.style.opacity || GP.defaultStyle.opacity;
    this.style.width   = this.style.width || GP.defaultStyle.width;

    //console.log(this.style);

    this.id =           id;
    this.name =         name;
    this.description =  description;
    this.map =          map;

    /**
     * @type {google.maps.Marker[]}
     */
    this.markers = [];

    /**
     * @type {google.maps.LatLng[]}
     */
    this.trackPoints = points;

    this.tPath = null;

    /**
     * @type {Array}
     */
    this.routeSegments = [];

    this.__routingPaused  = false;

    /**
     * @type {google.maps.Polyline}
     */
    this.trackLine = null;

    this.activeMarker = null;
    this.ghostMarker =  null;
    this.demoMarker = null;
    this.addedMarker =  null;

    this.editMode = "";
    this.editPointIndex = 0;
    this.dragPointIndex = null;

    var init = function(points, segments, visible, blocked){
        if (GP.debug) console.log("Create New", this.type);

        this.trackPoints = points;
        if (segments) {
            for (let i = 0; i < points.length; i++)
            {
                if (i <= segments.length - 1)
                    this.routeSegments[i] = {points: segments[i]};
                else
                    this.routeSegments[i] = null;
            }
        }

        var list = [];
        for (let i = 0; i < points.length; i++)
            list.push(points[i]);

        if (list.length > 0)
            this.makeTrackLine(list);

        if (this.type == "ROUTE" && segments)
        {
            this.renderRoute();
            this.updateMarkers(this.editMode);
            this.updateRouteLine();
        }
        else
        {
            this.updateMarkers(this.editMode);
        }

        if (visible === false) {
            this.toggleVisibility();
        }
        if (blocked === true) {
            this.toggleBlocked();
        }
    };

    this.getLengthToPoint = function(position){
        var pointList = this.type === "ROUTE" ? this.trackLine.getPath().getArray() : this.trackPoints;

        var index = this.__getNewPointIndex(pointList, position);
        if (index === 0)
            return 0;

        var data = pointList.slice(0, index);
        data.push(position);

        return (google.maps.geometry.spherical.computeLength(data) / 1000).toFixed(2);
    };

    this.getLength = function(){
        return (google.maps.geometry.spherical.computeLength(this.trackPoints) / 1000).toFixed(2);
    };

    this.getEditableLength = function(){
        var l = this.trackLine ? google.maps.geometry.spherical.computeLength(this.trackLine.getPath()) / 1000 : 0;
        //if (this.editMode == "END" && this.activeMarker)
        //    l += google.maps.geometry.spherical.computeDistanceBetween(this.activeMarker.getPosition(), this.trackPoints[this.trackPoints.length-1]) / 1000;
        //if (this.editMode == "START" && this.activeMarker)
        //    l += google.maps.geometry.spherical.computeDistanceBetween(this.activeMarker.getPosition(), this.trackPoints[0]) / 1000;
        return l.toFixed(2);
    };

    this.demoMarkerHide = function(){
        if (this.demoMarker)
            this.demoMarker.setMap(null);
        this.demoMarker = null;
    };

    this.demoMarkerShow = function(target){
        var d = 0;
        var point = null;
        var point0 = null;
        var dx = 0;

        var pointList = this.type === "ROUTE" ? this.trackLine.getPath().getArray() : this.trackPoints;

        for (let i = 0; i < pointList.length; i++) {
            if (point)
                d += dx = (google.maps.geometry.spherical.computeDistanceBetween(point, pointList[i]) / 1000);
            point0 = point;
            point = ActiveDocument.elevationData[i].location;

            if (target <= +d.toFixed(2))
                break;
        }

        if (point0) {
            if (target > +d.toFixed(2)) {
                point = new google.maps.LatLng(
                    point0.lat() + (point.lat() - point0.lat()) * (target - d) / dx,
                    point0.lon() + (point.lon() - point0.lon()) * (target - d) / dx
                );
                ///console.log(point0.lat() + (point.lat() - point0.lat()) * (target - d) / dx, point0.lon() + (point.lon() - point0.lon()) * (target - d) / dx);
            }
        }

        if (point) {
            if (this.demoMarker) {
                this.demoMarker.setPosition(point);
                return;
            }

            this.demoMarker = this.getNewMarker(point, "i", "DEMO");
            this.demoMarker.setZIndex(1);
        }
    };

    this.makeTrackLine = function(list){
        this.trackLine = new google.maps.Polyline({
            clickable: false,
            editable: false,
            draggable: false,
            path: list,
            strokeColor: this.style.color,
            strokeOpacity: this.style.opacity,
            strokeWeight: this.style.width
        });
        this.trackLine.setMap(this.map);

        google.maps.event.addListener(this.trackLine, "mouseover", function(event) {
            if (["NONE", "SPLIT", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(instance.editMode) >= 0)
                instance.addGhostMarker(event.latLng);
            else if (["", "DEMO"].indexOf(instance.editMode) >= 0 && GP.getActiveTrack() == null)
                instance.highlight();

            //instance.updateMarkers('HOVER');

            GP.dispatch('onTrackHoverPosition', instance.getLengthToPoint(event.latLng));
        });
        google.maps.event.addListener(this.trackLine, "mouseout", function(event) {
            //console.log('LINE-OUT');
            if (["NONE", "SPLIT", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(instance.editMode) >= 0)
                instance.deleteGhostMarker();
            //if (["", "DEMO"].indexOf(instance.editMode) >= 0 && GP.getActiveTrack() == null)
                instance.colorback();

            //instance.updateMarkers(instance.editMode);

            GP.dispatch('onTrackHoverPosition', -1);
        });
        google.maps.event.addListener(this.trackLine, "mousemove", function(event) {
            if (["NONE", "SPLIT", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(instance.editMode) >= 0)
                instance.updateGhostMarker(event.latLng);

            GP.dispatch('onTrackHoverPosition', instance.getLengthToPoint(event.latLng));
        });

        //google.maps.event.addListener(this.trackLine, "click", function(event) {
        google.maps.event.addListener(this.trackLine, "mousedown", function(event) {
            //console.log('LINE-DOWN');
            if (["NONE", "SPLIT", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(instance.editMode) >= 0)
                instance.insertPoint(event.latLng);
            if (["", "DEMO"].indexOf(instance.editMode) >= 0)
                GP.setActiveTrack(instance);
        });
        /*google.maps.event.addListener(this.trackLine, "click", function(event) {
            console.log('LINE-CLICK');
            if ([""].indexOf(instance.editMode) >= 0)
                GP.setActiveTrack(instance);
        });*/
    };

    this.show = function(){
        if (this.trackLine)
            this.trackLine.setMap(this.map);
        for (let i = 0; i < this.markers.length; i++)
            this.markers[i].setMap(this.map);
    };
    this.hide = function(){
        if (GP.debug) console.log("TRACK HIDE");
        this.colorback();
        if (this.trackLine)
            this.trackLine.setMap(null);
        for (let i = 0; i < this.markers.length; i++)
            this.markers[i].setMap(null);
    };

    this.clear = function(){
        if (GP.debug) console.log("TRACK CLEAR");
        if (this.activeMarker)
            this.activeMarker.setMap(null);
        this.activeMarker = null;

        if (this.ghostMarker)
            this.ghostMarker.setMap(null);
        this.ghostMarker = null;

        for (let i = 0; i < this.markers.length; i++)
            this.markers[i].setMap(null);
        this.markers = [];

        if (this.trackLine)
            this.trackLine.setMap(null);
        this.trackLine = null;
        this.trackPoints = [];
    };

    this.getTargetMarker = function(point, last){
        var type = last ? 1 : 0;
        if (this.type == "ROUTE")
            type += "r";

        var marker = new google.maps.Marker({
            position: point,
            flat: true,
            icon: GP.markerIcons[type],
            raiseOnDrag: false,
            draggable: false,
            clickable: false,
            map: this.map,
            zIndex: 7,
            shape: {
                type:   "circle",
                coords: [0,0,0]
            }
        });
        return marker;
    };

    this.getBorderMarker = function(point, type){
        if (this.type == "ROUTE")
            type += "r";

        var marker = new google.maps.Marker({
            position: point,
            flat: true,
            icon: GP.markerIcons[type],
            raiseOnDrag: false,
            draggable: false,
            clickable: true,
            map: this.map,
            zIndex: 2,
            title: "click to continue line"
        });

        google.maps.event.addListener(marker, "click", function(event) {
            if (GP.debug) console.log("Border-Marker-CLICK");
            instance.onMarkerClicked(marker);
        });
        google.maps.event.addListener(marker, "rightclick", function(event) {
            if (GP.debug) console.log("Border-Marker-RCLICK");
            instance.onMarkerDelete(marker);
        });
        google.maps.event.addListener(marker, "mouseover", function(event) {
            //console.log('Border-Marker-OVER');
            instance.onMarkerOver(marker);
        });
        google.maps.event.addListener(marker, "mouseout", function(event) {
            //console.log('Border-Marker-OUT');
            instance.onMarkerOut(marker);
        });
        return marker;
    };

    this.descriptions = {
        "POINT": 'click to drag' + '\n' + 'right click to remove',
        "new": 'click to add point',
        "SPLIT": 'add split point',
        "CUT": 'add cut point',
        "CUTX": 'add cut point',
        "CUT_TO": 'add cut point',
        "CUTX_TO": 'add cut point',
        "border": 'click to continue line' + '\n' + 'right click to remove',
        "cutpoint": 'cut from',
        "DEMO": "DEMO"
    };

    this.getNewMarker = function(point, type, desc){
        if (!type)
            type = "x";
        if (!desc)
            desc = "POINT";

        if (this.type == "ROUTE")
            type += "r";

        var marker = new google.maps.Marker({
            position: point,
            flat: true,
            icon: GP.markerIcons[type],
            raiseOnDrag: false,
            draggable: true,
            clickable: true,
            map: this.map,
            zIndex: 3,
            title: this.descriptions[desc]
        });

        google.maps.event.addListener(marker, "rightclick", function(event) {
            if (GP.debug) console.log('Marker-RCLICK');
            instance.onMarkerDelete(marker);
        });
        google.maps.event.addListener(marker, "click", function(event) {
            if (GP.debug) console.log('Marker-CLICK');
            instance.onMarkerClicked(marker);
        });
        google.maps.event.addListener(marker, "mouseover", function(event) {
            // Marker-MOUSE
            if (instance.ghostMarker && instance.ghostMarker != marker)
                instance.deleteGhostMarker();
        });
        google.maps.event.addListener(marker, "dragend", function(event) {
            // if (GP.routingIsInProgress) {
            //     return false;
            // }
            if (GP.debug) console.log('Marker-DRAG-ENG');
            instance.onMarkerChanged(marker, event.latLng, true);
            GP.dispatch("onTrackChanged", instance);

            if (instance.type == "ROUTE")
                instance.updateRouteLine();
        });
        google.maps.event.addListener(marker, "drag", function(event) {
            // if (GP.routingIsInProgress) {
            //     return false;
            // }
            if (GP.debug) console.log('Marker-DRAG');
            instance.onMarkerChanged(marker, event.latLng, false);
            GP.dispatch("onTrackChanged", instance);
        });

        return marker;
    };

    this.togglePointRoute = function(marker){
        if (this.type == "ROUTE")
        {
            GP.nextRoutingType();
            var k = this.markers.indexOf(marker);
            if (k >= 0)
            {
                this.routeSegments[k - 1] = null;
                this.updateRouteLine();
            }
        }
    };

    this.doJoinTrack = function(index, track){
        var points = [];

        // index - start with

        if (this.type != track.type)
        {
            if (track.type == "ROUTE")
                track.routeToTrack();
            else if (this.type == "ROUTE")
                this.routeToTrack();
        }

        console.warn("JOIN", this.type, this.editMode, index);

        if (index == 0)
        {
            if (this.type == "ROUTE")
            {
                this.pauseUpdate();

                for (let i = 0; i <= track.trackPoints.length; i++)
                    this.addPoint(
                        track.trackPoints[i],
                        this.editMode == "END" ? track.getSegmentAt(i) : null
                    );

                this.updateRouteLine(true);
            }
            else
            {
                for (let i = 0; i <= track.trackPoints.length; i++)
                    this.addPoint(track.trackPoints[i]);
            }
        }
        else
        {
            if (this.type == "ROUTE")
            {
                this.pauseUpdate();

                for (let i = track.trackPoints.length - 1; i >= 0; i--)
                    this.addPoint(
                        track.trackPoints[i],
                        this.editMode == "START" ? track.getSegmentAt(i) : null
                    );

                this.updateRouteLine(true);
            }
            else
            {
                for (let i = track.trackPoints.length - 1; i >= 0; i--)
                    this.addPoint(track.trackPoints[i]);
            }
        }

        GP.setEditMode("NONE");
        GP.deleteTrack(track);
        GP.historyClear();
    };

    this.onMarkerOver = function(marker){
        switch (this.editMode)
        {
            case "":
                this.highlight();
                break;
        }
    };

    this.onMarkerOut = function(marker){
        switch (this.editMode)
        {
            case "":
                this.colorback();
                break;
        }
    };

    this.onMarkerClicked = function(marker){

        if (marker == this.ignoreMarkerClick)
        {
            this.ignoreMarkerClick = null;
            return;
        }

        var k = this.markers.indexOf(marker);
        //console.info('Click on', this.editMode);
        switch (this.editMode)
        {
            case "":
                if (GP.editMode == "END" || GP.editMode == "START")
                    GP.getActiveTrack().doJoinTrack(k, this);
                else
                    GP.setActiveTrack(this, k == 0 ? "START" : "END");
                break;

            /*case 'JOIN_TARGET':
                this.doJoinTrack(k, GP.getActiveTrack());
                break;*/

            case "SPLIT":
                //console.log('makeSplit, MarkerClicked');
                if (k >= 1 && k <= this.trackPoints.length - 1)
                    this.makeSplit(k);
                break;

            case "CUT":
                if (k >= 1 && k <= this.trackPoints.length - 1)
                    this.cutStart(marker);
                break;

            case "CUT_TO":
                if (k >= 1 && k <= this.trackPoints.length - 1)
                    this.cutEnd(marker);
                break;

            case "CUTX":
                if (k >= 1 && k <= this.trackPoints.length - 1)
                    this.cutStartX(marker);
                break;

            case "CUTX_TO":
                if (k >= 1 && k <= this.trackPoints.length - 1)
                    this.cutEndX(marker);
                break;

            case "NONE":
                if (k == 0)
                    GP.setEditMode("START");
                if (k == this.trackPoints.length - 1)
                    GP.setEditMode("END");
                break;

            case "START":
                if (k == 0)
                    GP.setEditMode("NONE");
                break;

            case "END":
                if (k == this.trackPoints.length - 1)
                    GP.setEditMode("NONE");
                break;
        }

        //console.log(k, this.trackPoints.length, this.editMode);
    };

    this.onMarkerDelete = function(marker){
        if(["JOIN", "SPLIT", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(this.editMode) >= 0)
        {
            GP.setEditMode("NONE");
            return;
        }

        if (this.editMode == "END" || this.editMode == "START") {
            this.addActiveLineRemove();
            if (this.trackPoints.length < 2) {
                GP.deleteTrack(this);
                return;
            }

            if (this.type == "ROUTE")
                this.renderRoute();
        }

        /*if (marker == this.addedMarker)
        {
            GP.setEditMode("NONE");
            this.addedMarker = null;
            return;
        }*/

        if (this.ghostMarker)
            this.deleteGhostMarker();

        if ((this.editMode == "" || this.editMode == "NONE") && this.trackPoints.length < 3)
        {
            GP.deleteTrack(this);
            return;
        }

        if (this.editMode == "")
            return;
        if (marker == this.activeMarker)
            return;

        if (this.editMode == "END" || this.editMode == "START") {
            if (this.trackPoints.length < 2)
                return;
        }
        else {
            if (this.trackPoints.length < 3)
                return;
        }

        var k = this.markers.indexOf(marker);
        marker.setMap(null);

        if (GP.debug) console.info("DEL MARKER", k);

        if (k < 0)
            return;

        this.trackPoints.splice(k, 1);
        this.markers.splice(k, 1);

        if (this.type == "ROUTE")
        {
            this.routeSegments.splice(k, 1);
            if (k > 0)
                this.routeSegments[k - 1] = null;
            this.renderRoute();
            this.updateRouteLine();
        }
        else
        {
            this.trackLine.getPath().removeAt(k);
            if (this.editPointIndex > 0)
                this.editPointIndex--;

            if (k == this.markers.length && k > 1)
                this.setMarkerType(this.markers[k - 1], 1, "border");
            if (k == 0)
                this.setMarkerType(this.markers[0], 0, "border");
        }

        if (this.editMode == "END" || this.editMode == "START")
            this.addActiveLineAdd(GP.mousePosition, this.editMode);

        GP.dispatch("onTrackChanged", this);
        return true;
    };

    this.onMarkerChanged = function(marker, point, kill){
        if (!point)
            return;

        var k = this.markers.indexOf(marker);
        if (k < 0) {
            if (kill)
                this.dragPointIndex = null;
                setTimeout(function(){
                    marker.setMap(null);
                }, 100);
            return;
        }

        this.trackPoints[k] = point;

        if (this.dragPointIndex == null)
        {
            if (this.type == "ROUTE")
            {
                var fixR = false;
                if (this.routeSegments[k] != null) {
                    this.routeSegments[k] = null;
                    fixR = true;
                }
                if (k > 0 && this.routeSegments[k - 1] != null) {
                    this.routeSegments[k - 1] = null;
                    fixR = true;
                }
                if (fixR)
                    this.renderRoute();

                if (k == 0)
                {
                    this.dragPointIndex = 0;
                }
                else
                {
                    var markers = 0;
                    for (let i = 0; i < k - 1/*this.trackPoints.length - 1*/; i++) {
                        var segment = this.getSegmentAt(i);
                        //if (k > markers)
                        //{
                        markers += 1 + (segment ? segment.length : 0);
                        //}
                        //else
                        //   break;
                    }
                    this.dragPointIndex = markers + 1;
                }
            }
            else
            {
                this.dragPointIndex = k;
            }
            if (this.editMode == "START")
                this.dragPointIndex++;

            console.warn("DRAG Z", k, this.dragPointIndex);
        }
        this.trackLine.getPath().setAt(this.dragPointIndex, point);

        if (kill)
            this.dragPointIndex = null;
    };

    this.setMarkerType = function(marker, type, desc){
        //console.warn("UPD MARKER TYPE!", this.markers.indexOf(marker), type, desc);

        if (this.type == "ROUTE")
            type = type + "r";

        marker.setIcon(GP.markerIcons[type]);
        if (!desc)
            desc = "POINT";
        marker.setTitle(this.descriptions[desc]);

        //if (this.markers[0] == marker && type == '1')
        //    throw new Error('aaa');
    };

    this.addActiveMarker = function(point, mode){
        this.activeMarker = this.getTargetMarker(point, mode == "END");

        if (mode == "END" && this.markers.length > 1)
            this.setMarkerType(this.markers[this.markers.length - 1], "x");
        if (mode == "START")
            this.setMarkerType(this.markers[0], "x");
    };

    this.addActiveLineAdd = function(point, mode){
        if (this.activeMarker)
            return;

        this.addActiveMarker(point, mode);

        if (mode == "END")
            this.editPointIndex = this.tPath ? this.tPath.length : this.trackPoints.length;
        else if (mode == "START")
            this.editPointIndex = 0;

        if (GP.debug) {
            console.warn(
                "addActiveLineAdd",
                this.editPointIndex,
                this.tPath ? this.tPath.length : null,
                this.trackPoints ? this.trackPoints.length : null
            );
        }

        this.trackLine.getPath().insertAt(this.editPointIndex, point);
    };

    this.addActiveLineRemove = function(){
        if (this.markers.length > 0)
        {
            this.setMarkerType(this.markers[0], 0, "border");
            if (this.markers.length > 1)
                this.setMarkerType(this.markers[this.markers.length - 1], 1, "border");
        }

        if (this.activeMarker)
        {
            this.activeMarker.setMap(null);
            this.activeMarker = null;
        }

        if (GP.debug)
            console.warn('addActiveLineRemove', this.editPointIndex);

        if (this.trackLine)
            this.trackLine.getPath().removeAt(this.editPointIndex);
    };

    this.updateNewPointPosition = function(point){
        if (!point)
            return;

        if (this.activeMarker)
        {
            this.activeMarker.setPosition(point);
            this.trackLine.getPath().setAt(this.editPointIndex, point);
            GP.dispatch("onTrackChanged", this);
        }
    };

    this.__checkPair = function(point0, point1, point){

        // FIX needed???
        //console.log(point0, point1, point);
        // Check Intervals
        if (
            ((point0.lat() <= point.lat() &&  point.lat() <= point1.lat())
                ||
            (point0.lat() >= point.lat() &&  point.lat() >= point1.lat()))
                &&
            ((point0.lng() <= point.lng() &&  point.lng() <= point1.lng())
                ||
            (point0.lng() >= point.lng() &&  point.lng() >= point1.lng()))
           )
        {
            // CORRECT
        }
        else
        {
            ///throw new Error("Sraka!");
            return -1;
        }

        // Vertical or Horizontal Line
        if (point1.lat() == point0.lat()) return 0; // Best
        if (point1.lng() == point0.lng()) return 0; // Best

        var a = {x: point0.lng(), y: point0.lat()};
        var b = {x: point1.lng(), y: point1.lat()};
        var c = {x: point.lng(),  y: point.lat()};

        return Math.abs((c.y - a.y) * (b.x - a.x) - (c.x - a.x) * (b.y - a.y));
    };

    this.__getIntervalCenterPoint = function(list, point){
        var index = this.__getNewPointIndex(list, point);
        if (index == 0)
            return null;

        return new google.maps.LatLng((list[index - 1].lat() + list[index].lat()) / 2, (list[index - 1].lng() + list[index].lng()) / 2);
    };

    this.__getNewPointIndex = function(list, point){
        var bestLine = 0;
        var bestDx = 10000000000;

        var dx = 0;

        for (let i = 1; i < list.length; i++)
        {
            dx = this.__checkPair(list[i-1], list[i], point);
            if (dx >= 0 && dx < bestDx)
            {
                bestLine = i;
                bestDx = dx;
            }
        }
        return bestLine;
    };

    this.insertPoint = function(point, marker, i){
        if (!point)
            return;

        var index = 0;
        if (i != 0 && i !== undefined)
            index = i;
        else
            //index = this.__getNewPointIndex(this.trackPoints, point);
            index = this.__getNewPointIndex(this.trackLine.getPath().getArray(), point);

        if (index == 0)
            return;

        if (!marker)
             marker = this.getNewMarker(point);
        else
        {
            marker.setZIndex(3);
        }

        var trackIndex = index;
        if (this.type == "ROUTE")
        {
            var markers = 0;
            trackIndex = 0;
            for (let k = 0; k < this.trackPoints.length - 1; k++)
            {
                console.warn("Search", index, "K" + k, markers);
                if (index > markers)
                {
                    trackIndex = k;
                    var segment = this.getSegmentAt(k);
                    markers += 1 + (segment ? segment.length : 0);
                }
                else
                    break;
            }

            ////trackIndex = sIndex;
            ///this.routeSegments[0].length = 3;
            this.routeSegments[trackIndex] = null;

            trackIndex++;
            if (GP.debug) console.log("Insert Index", trackIndex);
            this.routeSegments.splice(trackIndex, 0, null);
            this.markers.splice(trackIndex, 0, marker);
            this.trackPoints.splice(trackIndex, 0, point);
            this.renderRoute();
            ///this.trackLine.getPath().insertAt(sIndex + 1, point);
        }
        else
        {
            this.trackLine.getPath().insertAt(trackIndex, point);
            this.markers.splice(trackIndex, 0, marker);
            this.trackPoints.splice(trackIndex, 0, point);
        }

        GP.dispatch("onTrackChanged", this);

        if (this.editMode == "SPLIT")
        {
            //this.makeSplit(index);
            this.makeSplit(trackIndex);
        }
        else if (this.editMode == "CUT")
        {
            this.cutStart(marker);
        }
        else if (this.editMode == "CUT_TO")
        {
            this.cutEnd(marker);
        }
        else if (this.editMode == "CUTX")
        {
            this.cutStartX(marker);
        }
        else if (this.editMode == "CUTX_TO")
        {
            this.cutEndX(marker);
        }
    };

    this.cutPointStart = null;
    this.cutPointEnd = null;

    this.cutStart = function(marker){
        var index = this.markers.indexOf(marker);
        if (index == 0 || index == this.trackPoints.length - 1) return;

        this.cutPointStart = marker;
        this.setMarkerType(marker, "c", "cutpoint");
        GP.setEditMode("CUT_TO");
    };

    this.cutEnd = function(marker){
        var index = this.markers.indexOf(marker);
        if (index == 0 || index == this.trackPoints.length - 1) return;
        if (marker == this.cutPointStart) return;

        this.cutPointEnd = marker;
        this.makeCut();
    };

    this.makeCut = function(){
        var index0 = this.markers.indexOf(this.cutPointStart);
        var index1 = this.markers.indexOf(this.cutPointEnd);

        this.setMarkerType(this.cutPointStart, "x");
        this.setMarkerType(this.cutPointEnd, "x");

        this.doMakeCut(index0, index1);
    };

    this.doMakeCut = function(index0, index1){
        var s = Math.min(index0, index1);
        var e = Math.max(index0, index1);

        this.editMode = "NONE";

        for (let i = e - 1; i >= s + 1; i--)
            this.onMarkerDelete(this.markers[i]);

        this.cutPointStart = null;
        this.cutPointEnd = null;

        GP.dispatch("onTrackChanged", this);
        GP.setEditMode("NONE");
    };

    this.cutStartX = function(marker){
        var index = this.markers.indexOf(marker);
        if (index == 0 || index == this.trackPoints.length - 1) return;

        this.cutPointStart = marker;
        this.setMarkerType(marker, "c", "cutpoint");
        GP.setEditMode("CUTX_TO");
    };

    this.cutEndX = function(marker){
        var index = this.markers.indexOf(marker);
        if (index == 0 || index == this.trackPoints.length - 1) return;
        if (marker == this.cutPointStart) return;

        this.cutPointEnd = marker;
        this.makeCutX();
    };

    this.makeCutX = function(){
        var index0 = this.markers.indexOf(this.cutPointStart);
        var index1 = this.markers.indexOf(this.cutPointEnd);

        var s = Math.min(index0, index1);
        var e = Math.max(index0, index1);

        this.setMarkerType(this.cutPointStart, "x");
        this.setMarkerType(this.cutPointEnd, "x");

        this.editMode = "NONE";

        for (let i = this.markers.length; i >= e + 1; i--)
            this.onMarkerDelete(this.markers[i]);

        for (let i = s - 1; i >= 0; i--)
            this.onMarkerDelete(this.markers[i]);

        this.cutPointStart = null;
        this.cutPointEnd = null;

        GP.dispatch("onTrackChanged", this);
        GP.setEditMode("NONE");
    };

    this.makeSplit = function(index){
        if (GP.debug) console.log("Make split on", index);

        if (GP.routingIsInProgress)
            return;

        var points = [];
        var segments = [];
        for (let i = index; i < this.trackPoints.length; i++)
            points.push(this.trackPoints[i]);

        if (this.type == "ROUTE")
        {
            for (let i = index; i < this.trackPoints.length; i++) {
                var segment = this.getSegmentAt(i);
                segments.push(segment || []);
            }

            for (let i = this.trackPoints.length - 1; i >= index; i--)
                this.markers[i].setMap(null);

            this.trackPoints.length = index;
            this.markers.length = index;

            this.routeSegments.length = index;
            this.routeSegments[index - 1] = null;
            this.renderRoute();
        }
        else
        {
            for (let i = this.trackPoints.length - 1; i >= index; i--)
            {
                this.trackLine.getPath().removeAt(i);
                this.markers[i].setMap(null);
            }
            this.trackPoints.length = index;
            this.markers.length = index;
        }

        GP.dispatch("onTrackChanged", this);

        var track = GP.createNewTrack(this.name + "+", this.description, points, null,
            { color: this.style.color, opacity: this.style.opacity, width: this.style.width },
            this.type, true, false, segments
        );
        if (this.type == "ROUTE") {
            track.routeSegments[0] = null;
            track.updateRouteLine();
        }

        GP.setEditMode("END");
        GP.historyClear();
    };

    this.addPoint = function(point, segment){
        if (!point)
            return null;

        var index = 0;

        if (GP.debug) {
            console.info(
                "AddPoint",
                this.editMode,
                this.type,
                point
            );
        }

        switch (this.editMode)
        {
            case "NONE":
                if (!this.trackLine)
                {
                    if (this.type == "ROUTE")
                    {
                        this.trackPoints.push(point);
                        this.routeSegments.push(segment ? {points: segment} : null);
                    }
                    else
                    {
                        this.trackPoints.push(point);
                    }

                    this.makeTrackLine([point]);
                    this.addedMarker = this.getNewMarker(point, "0", "border");
                    this.markers.push(this.addedMarker);
                    GP.setEditMode("END");
                    this.setZIndex(GP._gpTracks.length);
                    //return this.trackPoints.length();
                    return null;
                }
                else
                    return null;
                break;

            case "JOIN":
                return null;

            case "START":
            case "END":
                this.addActiveLineRemove();
                this.addedMarker = this.getNewMarker(point, null, "new");

                if (this.editMode == "END")
                {
                    if (this.markers.length > 1)
                        this.setMarkerType(this.markers[this.markers.length - 1], "x");
                    this.markers.push(this.addedMarker);
                    this.trackPoints.push(point);
                    this.trackLine.getPath().push(point);
                    if (this.tPath)
                        this.tPath.push(point);
                    ///index = this.trackPoints.length();
                    index = 0;

                    if (this.type == "ROUTE")
                    {
                        this.routeSegments.push(segment ? {points: segment} : null);
                        this.updateRouteLine();
                    }
                }
                else if (this.editMode == "START")
                {
                    this.setMarkerType(this.markers[0], "x");
                    this.markers.unshift(this.addedMarker);
                    this.trackPoints.unshift(point);
                    this.trackLine.getPath().insertAt(0, point);
                    if (this.tPath)
                        this.tPath.unshift(point);

                    index = 0;

                    if (this.type == "ROUTE")
                    {
                        this.routeSegments.unshift(segment ? {points: segment} : null);
                        this.updateRouteLine();
                    }
                }

                GP.dispatch("onTrackChanged", this);
                this.addActiveLineAdd(point, this.editMode);
                return index;
                break;
        }
    };

    this.pauseUpdate = function(){
        this.__routingPaused = true;
    };

    this.updateRouteLine = function(unpause){
        if (unpause)
            this.__routingPaused = false;

        if (this.__routingPaused)
            return;

        for (let i = 0; i < this.trackPoints.length - 1; i++)
        {
            if (this.routeSegments[i] == null || !this.routeSegments[i].points)
            {
                this.__updateRouteSegment(i);
            }
        }
    };

    this.getSegmentAt = function(index) {
        return this.routeSegments[index] && this.routeSegments[index].points ? this.routeSegments[index].points : null;
    };

    this.renderRoute = function(){
        this.tPath = [];

        if (GP.debug == 2) console.info("Render Route", this.trackPoints, this.routeSegments);

        for (let i = 0; i < this.trackPoints.length; i++)
        {
            this.tPath.push(this.trackPoints[i]);

            if (GP.debug == 2) console.info(" -> POINT", this.trackPoints[i]);

            var segment = this.getSegmentAt(i);
            if ((i < this.trackPoints.length - 1) && segment)
            {
                if (GP.debug == 2) console.info(" -> SEGMENT", i, this.routeSegments[i]);

                for (let j = 0; j < segment.length; j++)
                    this.tPath.push(segment[j]);
            }
        }

        if (this.editMode == "END" || this.editMode == "START")
            this.addActiveLineRemove();

        this.trackLine.setPath(this.tPath);

        if (this.editMode == "END" || this.editMode == "START")
        {
            if (this.editMode == "END" && this.markers.length > 1)
                this.setMarkerType(this.markers[this.markers.length - 1], "x");
            if (this.editMode == "START")
                this.setMarkerType(this.markers[0], "x");
            this.addActiveLineAdd(GP.mousePosition, this.editMode);
        }

        GP.dispatch("onTrackChanged", this);
    };

    this.__updateRouteSegment = function(index){
        var defaultKey = "832c932e-d017-402f-b29e-a2abc9506be5";
        var profile = GP.currentProfile;
        var host;
        var ghRouting = new GraphHopper.Routing({
            key: defaultKey,
            host: host,
            vehicle: profile,
            weighting: "shortest",
            elevation: false,
            instructions: false
        });

        var lineDistance = google.maps.geometry.spherical.computeDistanceBetween(this.trackPoints[index], this.trackPoints[index + 1]);

        if (lineDistance <= 150) {
            this.routeSegments[index] = {points: [
                /*new google.maps.LatLng(
                    (this.trackPoints[index].lat() + this.trackPoints[index + 1].lat())/2,
                    (this.trackPoints[index].lng() + this.trackPoints[index + 1].lng())/2
                )*/
            ]};
            setTimeout(function(){
                instance.renderRoute();
            }, 10);
            return;
        }

        this.routeSegments[index] = {points: []};

        ghRouting.addPoint(new GHInput(this.trackPoints[index].lat(), this.trackPoints[index].lng()));
        ghRouting.addPoint(new GHInput(this.trackPoints[index + 1].lat(), this.trackPoints[index + 1].lng()));

        GP.routingIsInProgress++;
        GP.dispatch("onRoutingStarted");

        var segmentInstance = this.routeSegments[index];

        ghRouting.doRequest()
            .then(function(json){
                GP.routingIsInProgress--;
                if (!GP.routingIsInProgress)
                    GP.dispatch("onRoutingEnded");

                // Add your own result handling here
                if (GP.debug) console.log("ghRouting Response OK", json);

                var routeDistance = 0;
                for (let i = 0; i < json.paths.length; i++) {
                    routeDistance += json.paths[i].distance;
                }
                if (GP.debug) console.log("LvR", lineDistance, routeDistance);
                /*if (profile === 'bike' && routeDistance >= 8 * lineDistance) {
                    instance.routeSegments[index] = [];
                } else*/ {
                    // instance.routeSegments[index] = [];
                    segmentInstance.points = [];
                    for (let i = 0; i < json.paths.length; i++) {
                        for (let j = 1, l = json.paths[i].points.coordinates.length - 1; j < l; j++) {
                            // instance.routeSegments[index].push(
                            segmentInstance.points.push(
                                new google.maps.LatLng(
                                    json.paths[i].points.coordinates[j][1],
                                    json.paths[i].points.coordinates[j][0]
                                )
                            );
                        }
                    }
                }
                instance.renderRoute();
            })
            .catch(function(err){
                GP.routingIsInProgress--;
                if (!GP.routingIsInProgress)
                    $('#map-routing-modes').removeClass('pp');
                // instance.routeSegments[index] = null;
                delete segmentInstance.points;
                console.error(err.message);
                toastr.warning(err.message);
            });
    };

    this.updateGhostMarker = function(point){
        if (!this.ghostMarker)
            return;

        //var position = this.ghostMarker.getPosition();
        //var l = this.getLengthToPoint(position);
        //GP.dispatch('onTrackHoverPosition', l);

        this.ghostMarker.setPosition(point);
    };

    this.addGhostMarker = function(point){
        if (this.ghostMarker)
        {
            this.updateGhostMarker(point);
            return;
        }

        var desc = "point";
        switch (this.editMode)
        {
            case "NONE":
                desc = "new";
                break;
            case "SPLIT":
                desc = "SPLIT";
                break;
            case "CUT":
                desc = "CUT";
                break;
            case "CUTX":
                desc = "CUTX";
                break;
            case "CUT_TO":
                desc = "CUT_TO";
                break;
            case "CUTX_TO":
                desc = "CUTX_TO";
                break;
        }

        this.ghostMarker = this.getNewMarker(point, "i", desc);
        this.ghostMarker.setZIndex(1);

        var marker = this.ghostMarker;

        var listener = google.maps.event.addListener(marker, "mousedown", function(event) {
            if (GP.debug) console.log("GhostMarker-DOWN, Marker-CLICK");

            var position = instance.ghostMarker.getPosition();
            google.maps.event.removeListener(listener);
            instance.ignoreMarkerClick = marker;
            instance.setMarkerType(marker, "x");
            instance.ghostMarker = null;
            ///instance.insertPoint(event.latLng, marker);
            instance.insertPoint(position, marker);
        });
    };

    this.ignoreMarkerClick = null;

    this.deleteGhostMarker = function(){
        if (!this.ghostMarker)
            return;

        this.ghostMarker.setMap(null);
        this.ghostMarker = null;

        /////GP.dispatch('onTrackHoverPosition', -1);
    };

    this.setEditMode = function(mode){
        if (!this.visible && mode === "")
            mode = "DEMO";
        if (this.blocked && mode === "")
            mode = "LOCK";

        if (mode == "")
            if (this.trackLine)
                this.trackLine.setOptions({clickable: GP.getActiveTrack() == null});

        if (mode == this.editMode)
            return;

        if (["START", "END"].indexOf(mode) >= 0 &&
            this.trackPoints.length < 1)
        {
            GP.setEditMode("NONE");
            return;
        }

        if (["JOIN", "SPLIT", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(mode) >= 0 &&
            this.trackPoints.length < 2)
        {
            GP.setEditMode("NONE");
            return;
        }

        if (["JOIN", "SPLIT", "CUT", "CUT_TO", "CUTX", "CUTX_TO"].indexOf(this.editMode) >= 0 &&
            ["JOIN", "SPLIT", "CUT", "CUTX"].indexOf(mode) >= 0)
        {
            this.setEditMode("NONE");
        }

        //console.log('Update Mode', mode);
        this.updateMarkers(mode);

        this.map.setOptions({draggableCursor: ""});

        switch (mode)
        {
            // NONE->, START->, END->, JOIN_TARGET->
            case "":
            case "DEMO":
                if (this.editMode == "START" || this.editMode == "END")
                    this.addActiveLineRemove();
                if (this.trackLine)
                    this.trackLine.setOptions({clickable: GP.getActiveTrack() == null});
                break;

            case "LOCK":
                if (this.trackLine)
                    this.trackLine.setOptions({clickable: false});
                break;

            // ""->, NONE->, START->, END->, JOIN->, SPLIT->
            case "NONE":
            case "START":
            case "END":
                if (this.editMode == "CUT_TO" || this.editMode == "CUTX_TO")
                {
                    this.setMarkerType(this.markers[this.cutPointStart], "x");
                    this.cutPointStart = null;
                }
                if (this.editMode == "START" || this.editMode == "END" || this.editMode == "JOIN")
                    this.addActiveLineRemove();
                if (mode == "START" || mode == "END")
                {
                    this.addActiveLineAdd(GP.mousePosition, mode);
                    this.map.setOptions({draggableCursor: "crosshair"});
                }
                if (mode == "NONE" && this.trackPoints.length == 0)
                    this.map.setOptions({draggableCursor: "crosshair"});
                if (this.trackLine)
                    this.trackLine.setOptions({clickable: mode == "NONE"});

                //console.log('Points: ', this.trackPoints.length);
                break;

            // NONE->, START->, END->
            case "JOIN":
                if (this.editMode == "START" || this.editMode == "END")
                    this.addActiveLineRemove();

                this.addActiveLineAdd(GP.mousePosition, "START");
                this.trackLine.setOptions({clickable: false});
                break;

            // ""->
            case "JOIN_TARGET":
                if (this.trackLine)
                    this.trackLine.setOptions({clickable: true});
                break;

            // NONE->, START->, END->
            case "SPLIT":
            case "CUT":
            case "CUTX":
                if (this.editMode == "START" || this.editMode == "END")
                    this.addActiveLineRemove();
                this.trackLine.setOptions({clickable: true});
                break;
        }

        GP.dispatch("onTrackChanged", instance);
        this.editMode = mode;
    };

    this.updateMarkers = function(mode){
        var modeList = ["NONE", "JOIN", "END", "START", "CUT", "CUT_TO", "CUTX", "CUTX_TO", "SPLIT"];
        var hasFullMarkers = modeList.indexOf(this.editMode) >= 0;

        if (modeList.indexOf(mode) >= 0)
        {
            if (!hasFullMarkers || this.markers.length === 0)
            {
                for (let i = 0; i < this.markers.length; i++)
                    this.markers[i].setMap(null);
                this.markers = [];

                for (let i = 0; i < this.trackPoints.length; i++)
                {
                    var marker = this.getNewMarker(this.trackPoints[i]);
                    this.markers.push(marker);
                }
            }

            if (this.markers.length > 0)
            {
                this.setMarkerType(this.markers[0], 0, "border");                           // START
                if (this.markers.length > 1)
                    this.setMarkerType(this.markers[this.markers.length - 1], 1, "border"); // END
            }
        }
        else /*if (mode == "DEMO")*/
        {
            // No Markers!!!
            if (this.markers.length > 0)
            {
                for (let i = 0; i < this.markers.length; i++)
                    this.markers[i].setMap(null);
                this.markers = [];
            }

            //if (mode == "HOVER")
            if (mode !== "DEMO" && mode !== "LOCK")
            {
                var marker0 = this.getBorderMarker(this.trackPoints[0], 0);
                var marker1 = this.getBorderMarker(this.trackPoints[this.trackPoints.length - 1], 1);
                this.markers.push(marker0);
                this.markers.push(marker1);
            }
        }
        /*else
        {
            if (hasFullMarkers || this.markers.length == 0)
            {
                for (let i = 0; i < this.markers.length; i++)
                    this.markers[i].setMap(null);
                this.markers = [];

                var marker0 = this.getBorderMarker(this.trackPoints[0], 0);
                var marker1 = this.getBorderMarker(this.trackPoints[this.trackPoints.length - 1], 1);
                this.markers.push(marker0);
                this.markers.push(marker1);
                //console.log('ADD BORDER MARKERS');
            }
        }*/

        //var canDrag = ["NONE"].indexOf(mode) >= 0;
        //for (let i = 1; i < this.markers.length - 1; i++)
        //    this.markers[i].setDraggable(canDrag);
    };

    this.makeClose = function(){
        GP.setEditMode("NONE");
        this.setMarkerType(this.markers[this.markers.length - 1], "x");

        this.addedMarker = this.getNewMarker(this.trackPoints[0], 1, "border");
        this.markers.push(this.addedMarker);
        this.trackPoints.push(this.trackPoints[0]);
        this.trackLine.getPath().push(this.trackPoints[0]);
    };

    this.changeType = function(toType){
        if (this.type === toType)
            return;

        var eMode = GP.editMode;

        if (this.trackPoints.length !== 1)
            GP.setEditMode("NONE");

        if (this.type === "ROUTE" && toType === "TRACK")
        {
            if (GP.debug) console.warn("CONVERT ROUTE-> TRACK");

            this.routeToTrack();

            if (this.trackPoints.length !== 1)
                GP.setActiveTrack(this);
            else {
                this.updateMarkers(this.editMode);
                this.setMarkerType(this.activeMarker, 1);
            }

            GP.dispatch("onTrackChanged", this);
        }

        if (this.type === "TRACK" && toType === "ROUTE")
        {
            if (GP.debug) console.warn("CONVERT TRACK -> ROUTE");

            if (this.trackPoints.length > 15)
                throw new Error("Too many points! Can't convert.");

            this.trackToRoute();

            if (this.trackPoints.length !== 1)
                GP.setActiveTrack(this);
            else {
                this.updateMarkers(this.editMode);
                this.setMarkerType(this.activeMarker, 1);
            }

            GP.dispatch("onTrackChanged", this);
        }

        if (this.trackPoints.length !== 1)
            GP.setEditMode(eMode);
    };

    this.routeToTrack = function(){
        this.type = "TRACK";
        this.routeSegments = [];

        if (this.trackPoints.length > 1) {
            this.tPath = null;
            this.trackPoints = this.trackLine.getPath().getArray();

            // simplify
            var rawPoints = [];
            for (let i = 0; i < this.trackPoints.length; i++) {
                rawPoints.push({
                    x: this.trackPoints[i].lat(),
                    y: this.trackPoints[i].lng(),
                    z: this.trackPoints[i].z,
                    time: this.trackPoints[i].time
                });
            }
            var points = simplifyPath(rawPoints, 0.00010);

            this.trackPoints = [];
            for (let j = 0; j < points.length; j++) {
                var pp = new google.maps.LatLng(points[j].x, points[j].y);
                pp.z = points[j].z;
                pp.time = points[j].time;
                this.trackPoints.push(pp);
            }
            //

            this.trackLine.setPath(this.trackPoints);
        }
    };

    this.trackToRoute = function(){
        this.type = "ROUTE";
        this.routeSegments = [];

        if (this.trackPoints.length > 1) {
            this.updateRouteLine();
        }
    };

    this.refreshState = function(){
        if (!this.visible)
        {
            this.setEditMode("DEMO");
            this.trackLine.setMap(null);
        }
        else if (this.blocked)
        {
            this.trackLine.setMap(GP._map);
            this.setEditMode("LOCK");
        }
        else
        {
            this.trackLine.setMap(GP._map);
            this.setEditMode("");
        }
        GP.dispatch("onTrackChanged", this);
    };

    this.toggleBlocked = function(){
        this.blocked = !this.blocked;
        this.setStyle('blocked', this.blocked);
        this.refreshState();
    };

    this.toggleVisibility = function(){
        this.visible = !this.visible;
        this.setStyle('visible', this.visible);
        this.refreshState();
    };

    this.makeReverse = function(){
        GP.setEditMode("NONE");

        var points = [];
        var item;
        while (item = this.trackPoints.pop()) points.push(item);

        this.trackPoints = points;

        if (type == "ROUTE")
        {
            this.routeSegments = [];
            this.updateRouteLine();
        }
        else
        {
            var list = [];
            for (let i = 0; i < points.length; i++)
                list.push(points[i]);
            this.trackLine.setPath(list);
        }

        var mlist = [];
        while (item = this.markers.pop()) mlist.push(item);
        this.markers = mlist;

        this.setMarkerType(this.markers[0], 0, "border");
        if (this.markers.length > 1)
            this.setMarkerType(this.markers[this.markers.length - 1], 1, "border");
    };

    this.iid = null;
    this.c = 0;

    this.animate = function(){
        var colors = ["#00FF00", "#FFFF00"];
        if (instance.trackLine)
            instance.trackLine.setOptions({strokeColor: colors[instance.c]});

        instance.c = 1 - instance.c;
    };

    this.highlight = function(){
        this.colorback();
        this.iid = setInterval(this.animate, 100);
    };
    this.colorback = function(){
        if (this.iid)
        {
            clearInterval(this.iid);
            this.iid = null;
        }
        if (this.trackLine)
            this.trackLine.setOptions({strokeColor: this.style.color});
    };

    this.setStyle = function(key, value){
        this.style[key] = value;
        if (this.trackLine)
            this.trackLine.setOptions({
                strokeColor: this.style.color,
                strokeOpacity: this.style.opacity,
                strokeWeight: this.style.width,
            });
        GP.dispatch("onTrackChanged", this);
    };

    this.setZIndex = function(index) {
        if (this.trackLine) {
            this.trackLine.setOptions({
                zIndex: index
            });
        }
    };

    //
    init.call(this, points, segments, visible, blocked);
}

//
GP.setTracks = function(tracks){
    GP.__tracks = tracks;
};
GP.setStartPoint = function(lat, lng){
    GP.myLatlng = new google.maps.LatLng(lat, lng);
    GP.mousePosition = GP.myLatlng;

    if (GP._map)
    {
        GP._map.setCenter(GP.myLatlng);
        GP._map.setZoom(15);
    }
};
GP.setViewLimits = function(bounds){
    GP.bounds = bounds;
    if (GP._map)
    {
        if (GP.bounds)
        {
            //if (GP.bounds.getNorthEast().lat() == GP.bounds.getSouthWest().lat() ||
            //    GP.bounds.getSouthWest().lng() == GP.bounds.getSouthWest().lng())
            //    a;
            //else
                GP._map.fitBounds(bounds);
        }
        else
        {
            if (GP.myLatlng)
                GP._map.setCenter(GP.myLatlng);
            GP._map.setZoom(GP.myLatlng ? 15 : 1);
        }
    }
};

GP.setViewLimitsR = function(lat0, lng0, lat1, lng1){
    GP.setViewLimits(new google.maps.LatLngBounds(new google.maps.LatLng(lat0, lng0), new google.maps.LatLng(lat1, lng1)));
};

GP.navigateMapToTrack = function(index){
    //marker.setAnimation(google.maps.Animation.BOUNCE);
    var t = GP.getTrack(index);

    GP._map.panToBounds(GP.getBounds([t]));
};

GP.navigateMapToPoint = function(index){
    //marker.setAnimation(google.maps.Animation.BOUNCE);
    var p = GP.getPoint(index);
    GP._map.panTo(p.point);
};

GP.getBounds = function(objList){
    var bounds = GP.getBoundsA(objList);
    if (bounds)
        return new google.maps.LatLngBounds(bounds[0], bounds[1]);
    else
        return null;
};

GP.getBoundsA = function(objList){
    var lat0 = null;
    var lat1 = null;
    var lng0 = null;
    var lng1 = null;

    if (objList.length == 0)
        return null;

    for (let t = 0; t < objList.length; t++)
    {
        var list;

        if (objList[t] instanceof GPTrack)
        {
            list = objList[t].trackPoints;
        }
        else if (objList[t] instanceof GPPoint)
        {
            list = [objList[t].point];
        }
        else // Array of google.maps.LatLng
        {
            list = objList[t];
        }

        for (let i = 0; i < list.length; i++)
        {
            lat0 = lat0 === null ? list[i].lat() : Math.min(lat0, list[i].lat());
            lat1 = lat1 === null ? list[i].lat() : Math.max(lat1, list[i].lat());
            lng0 = lng0 === null ? list[i].lng() : Math.min(lng0, list[i].lng());
            lng1 = lng1 === null ? list[i].lng() : Math.max(lng1, list[i].lng());
        }
    }

    //if (lat0 == lat1 || lng0 == lng1)
    //    return null;

    return [
        new google.maps.LatLng(lat0, lng0),
        new google.maps.LatLng(lat1, lng1)
    ];
};

var FShandler = function (){
    if (
        document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        ) {
        //alert(GP.__center);
        setTimeout(function(){
            google.maps.event.trigger(GP._map, 'resize');
            //GP._map.setCenter(GP.__center);
            GP.setViewLimits(GP.getBounds(GP.getCollection()));
        }, 1);
    }
    else
    {
        google.maps.event.trigger(GP._map, 'resize');
        //GP._map.setCenter(GP._map.getCenter());
        GP.setViewLimits(GP.getBounds(GP.getCollection()));
    }
};

GP.start = function(div){
    GP.div = div;
    //google.maps.event.addDomListener(window, 'load', GP.initialize);
    GP.initialize();

    document.addEventListener("fullscreenchange", FShandler);
    document.addEventListener("webkitfullscreenchange", FShandler);
    document.addEventListener("mozfullscreenchange", FShandler);
    document.addEventListener("MSFullscreenChange", FShandler);
};