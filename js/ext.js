// use strict
const EXT = {
};

EXT.render = function (json) {
    for (const track of json.tracks) {
        if (track.type === "ROUTE") {
            let points = [];
            for (let i = 0; i < track.points.length; i++) {
                points.push(track.points[i]);
                if (track.segments[i])
                {
                    for (const sp of track.segments[i]) {
                        points.push(sp);
                    }
                }
            }
            track.points = points;
            track.type = "TRACK";
        }
    }
    return json;
};

EXT.save = function (json, format, name) {
    let ext = null;
    let mime = null;
    let fileData = null;
    let taBlob = null;

    if (!name)
        name = 'track-' + (new Date()).getTime();

    switch (format) {
        case "KML":
        case "KMZ":
            ext = format.toLocaleLowerCase();
            mime = ext === 'kml' ? 'application/vnd.google-earth.kml+xml' : 'application/vnd.google-earth.kmz';
            fileData = KML.convert(EXT.render(json));
            if (ext === "kmz") {
                let zip = new JSZip();
                zip.file("doc.kml", fileData);
                taBlob = zip.generate({type: "blob"});
            }
            break;

        case "GPXt":
        case "GPXr":
        case "GPX":
        case "GPXtg":
            ext = 'gpx';
            mime = 'application/gpx+xml';
            fileData = GPX.convert(EXT.render(json), format);
            break;
        default:
            UI.showError("Unknown format!");
            return;
    }

    let tempLink = document.createElement("a");

    if (!taBlob)
        taBlob = new Blob([fileData], {type: mime});
    tempLink.setAttribute('href', URL.createObjectURL(taBlob));
    tempLink.setAttribute('download', name + '.' + ext);
    tempLink.click();

    URL.revokeObjectURL(tempLink.href);
};