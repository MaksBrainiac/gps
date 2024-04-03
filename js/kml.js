// use strict
const KML = {
};

KML.parse = function(fdata, _icons){
    var tracks = [];
    var waypoints = [];
    var description = "";
    var item = null;
    var track = null;
    var waypoint = null;
    var point = null;
    var acceptTrackName = false;
    var acceptTrackDescription = false;
    var acceptPointName = false;
    var acceptPointDesc = false;
    var acceptPointIcon = false;
    var acceptTrackPoints = false;
    var acceptTrackPointZ = false;
    var acceptTrackPointTime = false;
    var acceptWaypointZ = false;
    var acceptWaypointPosition = false;

    var style = null;
    var styles = [];
    var temp = "";
    var icons = _icons;

    var _type = null;
    var _rpoints = null;
    var _visible = true;
    var _blocked = false;

    var inDataKey = null;

        //var slatLimits = null;
    //var slonLimits = null;

    var parser = sax.parser(true);
    parser.onerror = function (e) {
        // an error happened.
    };

    parser.onopentag = function (node) {
        temp = "";
        switch (node.name)
        {
            case "ExtendedData":
                break;
            case "Data":
                inDataKey = node.attributes['name'];
                break;

            case "LineStyle":
                style.type = 'line';
                break;
            case "IconStyle":
                style.type = 'point';
                break;
            case "Style":
                style = {};
                style.id = '#' + node.attributes['id'];
                break;
            case "Placemark":
                item = {name: '', description: ''};
                break;
            case "LineString":
                if (!track)
                {
                    track = item;
                    if (!track.type)
                        track.type = "TRACK";
                    track.points = [];
                }
                item = null;

                if (track.surl)
                {
                    if (styles[track.surl])
                    {
                        var zstyle = styles[track.surl];
                        track.style = {};
                        if (zstyle.color)
                            track.style.color = zstyle.color;
                        if (zstyle.width)
                            track.style.width = zstyle.width;
                        if (zstyle.opacity)
                            track.style.opacity = zstyle.opacity;
                    }
                }
                if (_visible !== null) {
                    track.visible = _visible;
                }
                if (_blocked !== null) {
                    track.blocked = _blocked;
                }
                break;
            case "Point":
                waypoint = item;
                waypoint.icon = 'default';
                item = null;

                if (waypoint.surl)
                {
                    if (waypoint.surl.indexOf("#myGPSPointStyle") >=0)
                    {
                        var aex = waypoint.surl.split("myGPSPointStyle");
                        waypoint.icon = aex[1];
                    }
                    else if (styles[waypoint.surl])
                    {
                        var zstyle = styles[waypoint.surl];
                        zstyle.icon = zstyle.icon.replace("http:", "https:");
                        if (_icons[zstyle.icon]) {
                            waypoint.icon = _icons[zstyle.icon]
                        }
                    }
                }
                break;

            case "name":
                if (item)
                    acceptTrackName = true;
                break;
            case "description":
                if (item)
                    acceptTrackDescription = true;
                break;
            case "coordinates":
                if (track)
                    acceptTrackPoints = true;
                if (waypoint)
                    acceptWaypointPosition = true;
                break;
            //case "styleUrl":
            //    acceptStyleUrl = true;
            //  break;
        }
    };

    parser.onclosetag = function (name) {

        parser.__onText(temp, name);

        switch (name)
        {
            case "Data":
                inDataKey = null;
                break;

            case "ExtendedData":
                if (_type)
                    item.type = _type;
                if (_rpoints)
                    item.rpoints = _rpoints;
                _type = null;
                _rpoints = null;
                break;

            case "Style":
                styles[style.id] = style;
                style = null;
                break;
            case "LineStyle":
                break;
            case "IconStyle":
                break;

            case "Placemark":
                if (track)
                {
                    tracks.push(track);
                    /*for (var y = 0; y < track.points.length; y++)
                    {
                        var p = track.points[y];

                        if (!slatLimits)
                         slatLimits = {min: p.x, max: p.x};
                         else
                         slatLimits = {min: Math.min(slatLimits.min, p.x), max: Math.max(slatLimits.max, p.x)};

                         if (!slonLimits)
                         slonLimits = {min: p.y, max: p.y};
                         else
                         slonLimits = {min: Math.min(slonLimits.min, p.y), max: Math.max(slonLimits.max, p.y)};
                    }*/
                    track = null;
                }
                else
                {
                    waypoints.push(waypoint);
                    waypoint = null;
                }
                break;
            case "coordinates":
                acceptTrackPoints = false;
                break;
        }
    };

    parser.__onText = function (data, name) {

        switch (name)
        {
            case "value":
                if (inDataKey)
                {
                    if (inDataKey === "type")
                        _type = data;
                    else if (inDataKey === "rpoints")
                        _rpoints = data.split(",");
                    else if (inDataKey === "visible")
                        _visible = data === 'on';
                    else if (inDataKey === "blocked")
                        _blocked = data === 'on';
                }
                break;

            case "href":
                if (style)
                    style.icon = data;
                break;
            case "color":
                if (style)
                {
                    //style.color = '#' . substr($data, 6, 2) . substr($data, 4, 2) . substr($data, 2, 2);
                    //style.opacity = Math.round(intval(substr($data, 0, 2), 16) / 255 * 100) / 100;
                    style.color = '#' + data.substr(6, 2) + data.substr(4, 2) + data.substr(2, 2);
                    style.opacity = Math.round(parseInt(data.substr(0, 2), 16) / 255 * 100) / 100;
                }
                break;
            case "width":
                if (style)
                    style.width = data;
                break;
            case "styleUrl":
                if (item)
                    item.surl = data;
                break;
            case "description":
                if (!acceptTrackDescription)
                    description = data;
                break;
        }

        if (acceptTrackName)
        {
            item.name = data;
            acceptTrackName = false;
        }
        if (acceptWaypointPosition)
        {
            var line = data.trim();
            var zzz = line.split(',');
            waypoint.position = {x: Number(zzz[1]), y: Number(zzz[0]), z: zzz.length > 2 ? Number(zzz[2]) : 0};
            acceptWaypointPosition = false;
        }
        if (acceptTrackPoints)
        {
            var points = data.trim();
            if (points.indexOf('\n') >= 0)
                points = points.split('\n');
            else
                points = points.split(' ');

            for (var i = 0; i < points.length; i++)
            {
                var line = points[i].trim();
                if (line === "") continue;

                var zzz = line.split(',');
                track.points.push({x: Number(zzz[1]), y: Number(zzz[0]), z: zzz.length > 2 ? Number(zzz[2]) : 0});
            }
        }
        if (acceptTrackDescription)
        {
            item.description = data.stripTags();
            acceptTrackDescription = false;
        }
    };

    parser.ontext = function (t) {
        temp = temp + t;
    };

    /*parser.onattribute = function (attr) {
        if (point)
        {
            //console.log(attr);
        }
        // an attribute.  attr has "name" and "value"
    };*/
    parser.write(fdata).close();

    /*var slat = 0;
    var slon = 0;

    if (slatLimits)
    {
        slat = (slatLimits.max + slatLimits.min) / 2;
        slon = (slonLimits.max + slonLimits.min) / 2;
    }*/

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

KML.convert = function(json) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<kml xmlns="http://earth.google.com/kml/2.2">';
    xml += '<Document>';
    xml += '<name></name>';
    xml += '<description>ツ</description>';

    const styles = {};

    json.waypoints.forEach(waypoint => {
        if (!styles[waypoint.icon]) {
            xml += '<Style id="myGPSPointStyle' + waypoint.icon + '">';
            xml += '<IconStyle>';
            xml += '<Icon>';
            xml += '<href>' + IconConvertor.getGStaticIconForKML(waypoint.icon) + '</href>';
            xml += '</Icon>';
            xml += '</IconStyle>';
            xml += '</Style>';

            styles[waypoint.icon] = 1;
        }
    });

    let k = 1;
    json.tracks.forEach(track => {
        const op = (Math.ceil(track.style.opacity * 255)).toString(16).padStart(2, '0');
        const color = [
            track.style.color.substring(5, 7),
            track.style.color.substring(3, 5),
            track.style.color.substring(1, 3)
        ];

        xml += '<Style id="myGPSLineStyle' + k + '">';
        xml += '<LineStyle>';
        xml += '<color>' + op + color.join('') + '</color>';
        xml += '<width>' + track.style.width + '</width>';
        xml += '</LineStyle>';
        xml += '</Style>';
        k++;
    });

    json.waypoints.forEach(waypoint => {
        xml += '<Placemark>';
        xml += '<name>' + escapeHtml(waypoint.name) + '</name>';
        xml += '<styleUrl>#myGPSPointStyle' + waypoint.icon + '</styleUrl>';
        xml += '<Point>';
        xml += '<coordinates>' + waypoint.position.y + ',' + waypoint.position.x + ',0.000000</coordinates>';
        xml += '</Point>';
        xml += '</Placemark>';
    });

    k = 1;
    json.tracks.forEach(track => {
        const points = [];
        const routePoints = [];
        let kkx = 0;

        track.points.forEach((p, i) => {
            routePoints.push(kkx);
            points.push(p);
            kkx++;

            if (track.type === "ROUTE") {
                if (track.segments[i]) {
                    track.segments[i].forEach(sp => {
                        points.push(sp);
                        kkx++;
                    });
                }
            }
        });

        xml += '<Placemark>';
        xml += '<name>' + escapeHtml(track.name) + '</name>';
        xml += '<styleUrl>#myGPSLineStyle' + k + '</styleUrl>';
        xml += '<ExtendedData>';
        if (track.type === "ROUTE") {
            xml += '<Data name="type"><value>ROUTE</value></Data>';
            xml += '<Data name="rpoints"><value>' + routePoints.join(",") + '</value></Data>';
        }
        if (track.visible !== undefined) {
            xml += '<Data name="visible"><value>' + (track.visible ? 'on' : 'off') + '</value></Data>';
        }
        if (track.blocked !== undefined) {
            xml += '<Data name="blocked"><value>' + (track.blocked ? 'on' : 'off') + '</value></Data>';
        }
        xml += '</ExtendedData>';
        xml += '<LineString>';
        xml += '<tessellate>1</tessellate>';
        xml += '<coordinates>' + points.map(p => p.y + ',' + p.x + ',0.000000').join('\n') + '</coordinates>';
        xml += '</LineString>';
        xml += '</Placemark>';
        k++;
    });

    xml += '</Document>';
    xml += '</kml>';
    return xml;
};