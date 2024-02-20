var GPX = {

};

GPX.parse = function(fdata){

    var tracks = [];

/*
    <wpt lat="49.925518000" lon="35.760456000">
        <ele>0.000000</ele>
        <name>Огульцы (конечная)</name>
        <cmt>&lt;div dir=&quot;ltr&quot;&gt;Харьков-Огульцы 	08:25&lt;br&gt;Харьков-Огульцы 	09:50&lt;br&gt;&lt;br&gt;Огульцы-Харьков 	20:17&lt;/div&gt;</cmt>
        <desc>&lt;div dir=&quot;ltr&quot;&gt;Харьков-Огульцы 	08:25&lt;br&gt;Харьков-Огульцы 	09:50&lt;br&gt;&lt;br&gt;Огульцы-Харьков 	20:17&lt;/div&gt;</desc>
        </wpt>
    <wpt lat="50.043030000" lon="35.429192000">
        <ele>0.000000</ele>
        <name>Шаровка</name>
        <cmt>&lt;div dir=&quot;ltr&quot;&gt;1&lt;/div&gt;</cmt>
        <desc>&lt;div dir=&quot;ltr&quot;&gt;1&lt;/div&gt;</desc>
        </wpt>
    <wpt lat="49.986111000" lon="35.765991000">
        <ele>0.000000</ele>
        <name>Старый Мерчик</name>
        <cmt>Старый Мерчик</cmt>
        <desc>Старый Мерчик</desc>
    </wpt>
*/

    while (true)
    {

        var k = fdata.indexOf('<trk>');
        if (k == -1)
            break;

        var track = {

        };

        fdata =  fdata.substr(k + 5);
        k = fdata.indexOf('</trk>');

        var fsegment;

        if (k == -1)
        {
            fsegment = fdata;
            fdata = "";
        }
        else
        {
            fsegment = fdata.substr(0, k);
            fdata = fdata.substr(k + 6);
        }

        var k0 = fsegment.indexOf('<name>');
        var k1 = fsegment.indexOf('</name>');

        if (k0 != -1 && k1 != -1)
            track.name = fsegment.substr(k0 + 6, k1 - k0 - 6);
        else
            track.name = "Track " + tracks.length;

        track.points = [];
        var fpoint = null;

        while (true)
        {
            k = fsegment.indexOf('<trkpt');
            if (k == -1)
                break;

            fsegment = fsegment.substr(k + 7);
            k = fsegment.indexOf('>');
            if (k == -1)
            {
                fpoint = fsegment;
                fsegment = "";
            }
            else
            {
                fpoint = fsegment.substr(0, k);
                fsegment = fsegment.substr(k + 7);
            }

            var lat = 0;
            var lon = 0;

            fpoint = fpoint.split(" ");

            for (var z = 0; z < fpoint.length; z++)
            {
                var fpart = fpoint[z];

                if (fpart.indexOf('lat=') === 0)
                {
                    k0 = fpart.indexOf('"');
                    k1 = fpart.indexOf('"', k0 + 1);
                    lat = Number(fpart.substr(k0 + 1, k1 - k0 - 1));
                }
                if (fpart.indexOf('lon=') === 0)
                {
                    k0 = fpart.indexOf('"');
                    k1 = fpart.indexOf('"', k0 + 1);
                    lon = Number(fpart.substr(k0 + 1, k1 - k0 - 1));
                }
            }
            track.points.push([lat, lon]);
        }
    }

    var slatLimits = null;
    var slonLimits = null;

    for (var z = 0; z < tracks.length; z++)
    {
        var path = tracks[z].points;
        for (var y = 0; y < path.length; y++)
        {
            var point = path[y];

            if (!slatLimits)
                slatLimits = [point[0], point[0]];
            else
                slatLimits = [Math.min(slatLimits[0], point[0]), Math.max(slatLimits[1], point[0])];

            if (!slonLimits)
                slonLimits = [point[1], point[1]];
            else
                slonLimits = [Math.min(slonLimits[0], point[1]), Math.max(slonLimits[1], point[1])];
        }
    }

    var slat = 0;
    var slon = 0;

    if (slatLimits)
    {
        slat = (slatLimits[1] + slatLimits[0]) / 2;
        slon = (slonLimits[1] + slonLimits[0]) / 2;
    }

    return {
        tracks: tracks,
        limits: [slatLimits, slonLimits],
        center: [slat, slon]
    };
};
