var Maps = {};
Maps.addSupport = function(map){

    map.mapTypes.set("OSM", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "https://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "OpenStreetMap",
        maxZoom: 18
    }));

    map.mapTypes.set("OCM", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            //return "http://b.tile.opencyclemap.org/cycle/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
            return "https://tile.thunderforest.com/cycle/" + zoom + "/" + coord.x + "/" + coord.y + ".png?apikey=c12b750eaa2c40a2baaaf5c0848c92f0";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "OpenCycleMap",
        maxZoom: 18
    }));

    map.mapTypes.set("ODM", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "https://tile.thunderforest.com/outdoors/" + zoom + "/" + coord.x + "/" + coord.y + ".png?apikey=c12b750eaa2c40a2baaaf5c0848c92f0";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "OutdoorsMap",
        maxZoom: 18
    }));

    map.mapTypes.set("DGlobe", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://api.tiles.mapbox.com/v4/digitalglobe.nal0g75k/" + zoom + "/" + coord.x + "/" + coord.y + ".png?access_token=pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNpcGg5dHkzYTAxM290bG1kemJraHU5bmoifQ.CHhq1DFgZPSQQC-DYWpzaQ";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "© DigitalGlobe, Inc",
        maxZoom: 22
    }));

    Maps.overlayStravaR = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            //return 'proxy.php?url=' + btoa("https://heatmap-external-a.strava.com/tiles-auth/ride/hot/" + zoom + "/" + coord.x + "/" + coord.y + ".png?px=256");
            return "https://proxy.nakarte.me/https/content-a.strava.com/identified/globalheat/all/hot/" + zoom + "/" + coord.x + "/" + coord.y + ".png?px=256";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "© Strava",
        maxZoom: 16
    });

    Maps.overlayDigitalGlobe = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://api.tiles.mapbox.com/v4/digitalglobe.nal0mpda/" + zoom + "/" + coord.x + "/" + coord.y + ".png?access_token=pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNpcGg5dHkzYTAxM290bG1kemJraHU5bmoifQ.CHhq1DFgZPSQQC-DYWpzaQ";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "© DigitalGlobe, Inc",
        maxZoom: 22
    });

    GP._map.mapTypes.set("MapBox", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://api.tiles.mapbox.com/v4/maksimusxp.cisgeefnj006t2xpbxk4hmlu6/" + zoom + "/" + coord.x + "/" + coord.y + ".png?access_token=pk.eyJ1IjoibWFrc2ltdXN4cCIsImEiOiJjaXNnZWNuZHgwMDVsMnlvNmhvMndjMGZiIn0.SKEo44Hno52jhXAVxVd-iQ";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "MapBox",
        maxZoom: 22
    }));

    map.mapTypes.set("HBM", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://toolserver.org/tiles/hikebike/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
        },
        tileSize: new google.maps.Size(256, 256),
        name: "HikeBikeMap",
        maxZoom: 18
    }));

    map.mapTypes.set("Bing", new google.maps.ImageMapType({
        name: "Bing",
        getTileUrl: function(coord, zoom) {
            // this returns aerial photography
            return "http://ecn.t1.tiles.virtualearth.net/tiles/a" +
                bingTileToQuadKey(coord.x, coord.y,  zoom) + ".jpeg?g=1173&n=z";
            // i dont know what g=1173 means
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 21
    }));

    map.mapTypes.set("ESRI", new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/" + zoom + "/" + coord.y + "/" + coord.x;
        },
        tileSize: new google.maps.Size(256, 256),
        name: "ESRI",
        maxZoom: 18
    }));

    var yandexSatType = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://sat0"+((coord.x+coord.y)%5)+".maps.yandex.net/tiles?l=sat&v=3.121.0&x=" +
                coord.x + "&y=" + coord.y + "&z=" + zoom + "";
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true,
        alt: "Yandex",
        name: "Yandex",
        maxZoom: 18
    });

    var yandexMapType = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://vec0"+((coord.x+coord.y)%5)+".maps.yandex.net/tiles?l=map&v=3.121.0&x=" +
                coord.x + "&y=" + coord.y + "&z=" + zoom + "";
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true,
        alt: "Yandex",
        name: "Yandex",
        maxZoom: 18
    });

    Maps.yandexOverlayType = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return "http://vec0"+((coord.x+coord.y)%5)+".maps.yandex.net/tiles?l=skl&v=4.103.1&x=" +
                coord.x + "&y=" + coord.y + "&z=" + zoom + "";
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: true,
        alt: "Yandex",
        name: "Yandex",
        maxZoom: 18
    });

    yandexSatType.projection = new YandexProjection();
    Maps.yandexOverlayType.projection = new YandexProjection();
    map.mapTypes.set("YandexSat", yandexSatType);
    yandexMapType.projection = new YandexProjection();
    map.mapTypes.set("YandexMap", yandexMapType);
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

/*
function YandexProjection() {
    this.pixelOrigin_ = new google.maps.Point(128,128);
    var MERCATOR_RANGE = 256;
    this.pixelsPerLonDegree_ = MERCATOR_RANGE / 360;
    this.pixelsPerLonRadian_ = MERCATOR_RANGE / (2 * Math.PI);

    this.fromLatLngToPoint = function(latLng) {
        function atanh(x) {
            return 0.5*Math.log((1+x)/(1-x));
        }
        function degreesToRadians(deg) {
            return deg * (Math.PI / 180);
        }
        function bound(value, opt_min, opt_max) {
            if (opt_min != null) value = Math.max(value, opt_min);
            if (opt_max != null) value = Math.min(value, opt_max);
            return value;
        }

        var origin = this.pixelOrigin_;
        var exct = 0.0818197;
        var z = Math.sin(latLng.lat()/180*Math.PI);
        return new google.maps.Point(origin.x + latLng.lng() *this.pixelsPerLonDegree_,
            Math.abs(origin.y - this.pixelsPerLonRadian_*(atanh(z)-exct*atanh(exct*z))));
    };

    this.fromPointToLatLng = function(point) {
        var origin = this.pixelOrigin_;
        var lng = (point.x - origin.x) / this.pixelsPerLonDegree_;
        var latRadians = (point.y - origin.y) / -this.pixelsPerLonRadian_;
        var lat = Math.abs((2*Math.atan(Math.exp(latRadians))-Math.PI/2)*180/Math.PI);
        var Zu = lat/(180/Math.PI);
        var Zum1 = Zu+1;
        var exct = 0.0818197;
        var yy = -Math.abs(((point.y)-128));
        while (Math.abs(Zum1-Zu)>0.0000001){
            Zum1 = Zu;
            Zu = Math.asin(1-((1+Math.sin(Zum1))*Math.pow(1-exct*Math.sin(Zum1),exct))
                / (Math.exp((2*yy)/-(256/(2*Math.PI)))*Math.pow(1+exct*Math.sin(Zum1),exct)));
        }
        if (point.y>256/2) {
            lat=-Zu*180/Math.PI;
        } else {
            lat=Zu*180/Math.PI;
        }
        return new google.maps.LatLng(lat, lng);
    };

    return this;
}
*/

function YandexProjection() {

    var Gmaps = google.maps,
        MERCATOR_RANGE = 256;

    this.pixelOrigin_ = new Gmaps.Point(128,128);
    this.pixelsPerLonDegree_ = MERCATOR_RANGE / 360;
    this.pixelsPerLonRadian_ = MERCATOR_RANGE / (2 * Math.PI);

    this.fromLatLngToPoint = function(latLng) {
        var origin = this.pixelOrigin_,
            exct = 0.0818197,
            z = Math.sin(latLng.lat()/180*Math.PI);

        function atanh(x) {
            return 0.5 * Math.log((1 + x) / (1 - x));
        }

        return new Gmaps.Point(origin.x + latLng.lng() * this.pixelsPerLonDegree_,
            Math.abs(origin.y - this.pixelsPerLonRadian_ * (atanh(z) - exct * atanh(exct * z))));
    };

    this.fromPointToLatLng = function(point) {

        var origin = this.pixelOrigin_,
            lng = (point.x - origin.x) / this.pixelsPerLonDegree_,
            latRadians = (point.y - origin.y) / -this.pixelsPerLonRadian_,
            lat = Math.abs((2*Math.atan(Math.exp(latRadians))-Math.PI/2)*180/Math.PI),
            Zu = lat/(180/Math.PI),
            Zum1 = Zu+1,
            exct = 0.0818197,
            yy = -Math.abs(((point.y)-128));

        while (Math.abs(Zum1 - Zu) > 0.0000001) {
            Zum1 = Zu;
            Zu = Math.asin(1 - ((1 + Math.sin(Zum1)) * Math.pow(1 - exct * Math.sin(Zum1), exct)) / (Math.exp((2 * yy) / -(256/(2 * Math.PI))) * Math.pow(1 + exct * Math.sin(Zum1), exct)));
        }
        if (point.y > 256 / 2) {
            lat=-Zu * 180/Math.PI;
        } else {
            lat=Zu * 180/Math.PI;
        }

        return new Gmaps.LatLng(lat, lng);
    };

    return this;
}