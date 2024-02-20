// use strict
var GEOJSON = {
};

GEOJSON.parse = function(doc){
    var tracks = [];
    var waypoints = [];
    var description = "";
    
    function pItem(item) {
        if (item.type == "FeatureCollection")
        {
            if (item.properties && item.properties.description)
                description = item.properties.description;

            for (var i = 0; i < item.features.length; i++)
                pItem(item.features[i]);
        }
        else if (item.type == "Feature")
        {
            if (item.geometry)
            {
                switch (item.geometry.type)
                {
                    case "Point":
                        var zzz = item.geometry.coordinates;
                        var point = {};
                        point.name = "New Point";
                        point.icon = "default";
                        if (item.properties && item.properties.name)
                            point.name = item.properties.name;
                        if (item.properties && item.properties.icon)
                            point.icon = item.properties.icon;

                        point.position = {x: zzz[1], y: zzz[0], z: (zzz.length > 2 ? zzz[2] : 0)};
                        waypoints.push(point);
                        break;

                    case "LineString":
                    case "MultiLineString":
                        var track = {};
                        track.name = "New Line";
                        if (item.properties && item.properties.name)
                            track.name = item.properties.name;
                        if (item.properties && item.properties.style)
                            track.style = item.properties.style;

                        if (item.properties.type)
                            track.type = item.properties.type;
                        else
                            track.type = "TRACK";
                        if (item.properties.rpoints)
                            track.rpoints = item.properties.rpoints;

                        track.points = [];

                        if (item.geometry.type == "LineString")
                        {
                            var pList = item.geometry.coordinates;
                            for (var i = 0; i < pList.length; i++)
                            {
                                var zzz = pList[i];
                                track.points.push({x: zzz[1], y: zzz[0], z: (zzz.length > 2 ? zzz[2] : 0)})
                            }
                        }
                        else
                        {
                            for (var i = 0; i < item.geometry.coordinates.length; i++)
                            {
                                var pList = item.geometry.coordinates[i];
                                for (var j = 0; j < pList.length; j++)
                                {
                                    var zzz = pList[j];
                                    track.points.push({x: zzz[1], y: zzz[0], z: (zzz.length > 2 ? zzz[2] : 0)})
                                }
                            }
                        }
                        tracks.push(track);
                        break;
                }
            }
        }
    }
    
    pItem(doc);

    for (var i = 0; i < tracks.length; i++)
    {
        if (tracks[i].type == "ROUTE")
        {
            var points = [];
            var segments = [];

            var k = 0;
            points.push(tracks[i].points[k]);

            for (var j = 1; j < tracks[i].rpoints.length; j++)
            {
                while (tracks[i].rpoints[j] != k)
                {
                    if (!(segments[j - 1]))
                        segments[j - 1] = [];
                    segments[j - 1].push(tracks[i].points[k]);
                    k++;
                }

                points.push(tracks[i].points[k]);
                k++;
            }

            delete tracks[i].rpoints;
            tracks[i].points = points;
            tracks[i].segments = segments;
        }
    }

    return {
        waypoints: waypoints,
        tracks: tracks,
        description: description
        //limits: {lat: slatLimits, lng: slonLimits},
        //center: {lat: slat, lng: slon}
    };
};