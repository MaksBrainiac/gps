// use strict
var GPX = {
};

GPX.parse = function(fdata){
    var tracks = [];
    var waypoints = [];
    var track = null;
    var waypoint = null;
    var point = null;
    var acceptTrackName = false;
    var acceptPointName = false;
    var acceptPointDesc = false;
    var acceptPointIcon = false;
    var acceptTrackPointZ = false;
    var acceptTrackPointTime = false;
    var acceptWaypointZ = false;

    //var slatLimits = null;
    //var slonLimits = null;

    var tags = [];
    var defaultName = null;

    var parser = sax.parser(true);
    parser.onerror = function (e) {
        // an error happened.
    };
    parser.ontext = function (t) {
        if (acceptPointName)
        {
            waypoint.name = t;
            //acceptPointName = false;
            return;
        }
        if (acceptPointIcon)
        {
            waypoint.icon = t;
            //acceptPointIcon = false;
            return;
        }
        if (acceptPointDesc)
        {
            waypoint.description = t;
            //acceptPointDesc = false;
            return;
        }
        if (acceptTrackName)
        {
            track.name = t;
            //acceptTrackName = false;
            return;
        }
        if (acceptTrackPointZ)
        {
            point.z = t;
            //acceptTrackPointZ = false;
            return;
        }
        if (acceptTrackPointTime)
        {
            point.time = t;
            //acceptTrackPointTime = false;
            return;
        }
        if (acceptWaypointZ)
        {
            waypoint.position.z = t;
            //acceptWaypointZ = false;
            return;
        }
        if (tags[tags.length - 1] == "name" && !defaultName) {
            defaultName = t;
        }
    };
    parser.oncdata = function (t) {
        //console.log('cdata', t, tags);
        parser.ontext(t);
    };
    parser.onclosetag = function (name) {
        switch (name)
        {
            case "trk":
            case "rte":
                tracks.push(track);
                for (var y = 0; y < track.points.length; y++)
                {
                    var p = track.points[y];

                    /*if (!slatLimits)
                        slatLimits = {min: p.x, max: p.x};
                    else
                        slatLimits = {min: Math.min(slatLimits.min, p.x), max: Math.max(slatLimits.max, p.x)};

                    if (!slonLimits)
                        slonLimits = {min: p.y, max: p.y};
                    else
                        slonLimits = {min: Math.min(slonLimits.min, p.y), max: Math.max(slonLimits.max, p.y)};*/
                }
                track = null;
                acceptTrackName = false;
                break;
            case "trkpt":
            case "rtept":
                track.points.push(point);
                point = null;
                break;
            case "wpt":
                waypoints.push(waypoint);
                waypoint = null;
                acceptPointDesc = false;
                break;

            case "name":
                if (waypoint)
                    acceptPointName = false;
                if (track)
                    acceptTrackName = false;
                break;
            case "desc":
                if (waypoint)
                    acceptPointDesc = false;
                break;
            case "ele":
                if (waypoint)
                    acceptWaypointZ = false;
                if (track)
                    acceptTrackPointZ = false;
                break;
            case "sym":
                if (waypoint)
                    acceptPointIcon = false;
                break;
            case "time":
                if (track && point)
                    acceptTrackPointTime = false;
                break;
        }
        tags.pop();
    };
    parser.onopentag = function (node) {
        tags.push(node.name);
        switch (node.name)
        {
            case "wpt":
                waypoint = { position: {x: node.attributes.lat, y: node.attributes.lon, z: 0, time: null}, name: "", description: "", icon: "default" };
                break;
            case "trk":
            case "rte":
                track = { points: [], name: defaultName || "Track" };
                break;
            case "trkpt":
            case "rtept":
                point = {x: node.attributes.lat, y: node.attributes.lon, z: 0};
                break;
            case "name":
                if (waypoint)
                    acceptPointName = true;
                if (track)
                    acceptTrackName = true;
                break;
            case "desc":
                if (waypoint)
                    acceptPointDesc = true;
                break;
            case "sym":
                if (waypoint)
                    acceptPointIcon = true;
                break;
            case "time":
                if (track && point)
                    acceptTrackPointTime = true;
                break;
            case "ele":
                if (waypoint)
                    acceptWaypointZ = true;
                if (track)
                    acceptTrackPointZ = true;
                break;
        }
    };
    /*parser.onattribute = function (attr) {
        if (point)
        {
            //console.log(attr);
        }
        // an attribute.  attr has "name" and "value"
    };*/
    parser.write(fdata).close();

    //var slat = 0;
    //var slon = 0;

    /*if (slatLimits)
    {
        slat = (slatLimits.max + slatLimits.min) / 2;
        slon = (slonLimits.max + slonLimits.min) / 2;
    }*/

    return {
        waypoints: waypoints,
        tracks: tracks
        //limits: {lat: slatLimits, lng: slonLimits},
        //center: {lat: slat, lng: slon}
    };
};

GPX.convert = function (json, format) {
    let text = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>';
    text += '<gpx version="1.1" creator="BestGPXEditor" ' +
        'xmlns="http://www.topografix.com/GPX/1/1" ' +
        'xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" ' +
        'xmlns:wptx1="http://www.garmin.com/xmlschemas/WaypointExtension/v1" ' +
        'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'xsi:schemaLocation="http://www.topografix.com/GPX/1/0 ' +
        'http://www.topografix.com/GPX/1/0/gpx.xsd ' +
        'http://www.topografix.com/GPX/1/1 ' +
        'http://www.topografix.com/GPX/1/1/gpx.xsd ' +
        'http://www.garmin.com/xmlschemas/GpxExtensions/v3 ' +
        'http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd ' +
        'http://www.garmin.com/xmlschemas/WaypointExtension/v1 ' +
        'http://www8.garmin.com/xmlschemas/WaypointExtensionv1.xsd ' +
        'http://www.garmin.com/xmlschemas/TrackPointExtension/v1 ' +
        'http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">';

    for (const waypoint of json.waypoints) {
        text += '<wpt lat="' + waypoint.position.x + '" lon="' + waypoint.position.y + '">';
        text += '<name>' + escapeHtml(waypoint.name) + '</name>';
        text += '<sym>' + escapeHtml(waypoint.icon) + '</sym>';
        text += '</wpt>';
    }

    for (const track of json.tracks) {
        if (format === 'GPXt' || format === 'GPXtg') {
            text += '<trk>';
            text += '<name>' + escapeHtml(track.name) + '</name>';

            if (format === 'GPXtg')
            {
                text += '<extensions><gpxx:TrackExtension><gpxx:DisplayColor>DarkBlue</gpxx:DisplayColor></gpxx:TrackExtension></extensions>';
            }

            text += '<trkseg>';
            for (const p of track.points) {
                text += '<trkpt lat="' + p.x + '" lon="' + p.y + '"></trkpt>';
            }
            text += '</trkseg>';
            text += '</trk>';
        } else {
            text += '<rte>';
            text += '<name>' + escapeHtml(track.name) + '</name>';
            for (const p of track.points) {
                text += '<rtept lat="' + p.x + '" lon="' + p.y + '"></rtept>';
            }
            text += '</rte>';
        }
    }
    text += '</gpx>';
    return text;
};