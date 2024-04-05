// use strict
const EXT = {
    handles: {}
};

// async function* getFilesRecursively(entry) {
//   if (entry.kind === "file") {
//     const file = await entry.getFile();
//     if (file !== null) {
//       // file.relativePath = getRelativePath(entry);
//       yield file;
//     }
//   } else if (entry.kind === "directory") {
//     for await (const handle of entry.values()) {
//       yield* getFilesRecursively(handle);
//     }
//   }
// }

EXT.saveFile = function (dir, id, title, format, json, callback) {
    console.info("EXT.saveFile", dir, id);

    (async function () {

        if (id) {
            format = id.split("/").pop().split('.').pop().toLocaleUpperCase();
        }

        let blob = EXT.serialize(json, format);
        let fileHandle = null;

        if (id) {
            let path = id.split('/');
            let entry = User.dirHandle;

            for (let i = 1; i < path.length - 1; i++) {
                let dirx = path.splice(0, i + 1).join('/');
                if (EXT.handles[dirx]) {
                    entry = EXT.handles[dirx];
                } else {
                    entry = await entry.getDirectoryHandle(path[i]);
                    EXT.handles[dirx] = entry;
                }
            }

            fileHandle = await entry.getFileHandle(path.pop());
        } else {
            let path = dir.split('/');
            let entry = User.dirHandle;

            for (let i = 1; i < path.length; i++) {
                let dirx = path.splice(0, i + 1).join('/');
                if (EXT.handles[dirx]) {
                    entry = EXT.handles[dirx];
                } else {
                    entry = await entry.getDirectoryHandle(path[i]);
                    EXT.handles[dirx] = entry;
                }
            }

            let fileName = title + '.' + format.toLocaleLowerCase();
            try {
                let handle = await entry.getFileHandle(fileName);
                let fileInfo = await handle.getFile();
                throw new Error('File already exists');
            } catch (e) {
                if (e instanceof DOMException && e.name === "NotFoundError") {
                    // OK!
                } else {
                    throw e; // let others bubble up
                }
            }

            // Create a FileSystemWritableFileStream to write to.
            fileHandle = await entry.getFileHandle(fileName, { create: true });
            id = dir + '/' + fileName;
        }

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return {
            fileId: id,
            title: title,
        };

    })().then(callback);
};

EXT.readFileAsync = async function (id) {
    console.info("EXT.readFile", id);

    let path = id.split('/');
    let entry = User.dirHandle;

    for (let i = 1; i < path.length - 1; i++) {
        let dir = path.splice(0, i + 1).join('/');
        if (EXT.handles[dir]) {
            entry = EXT.handles[dir];
        } else {
            entry = await entry.getDirectoryHandle(path[i]);
            EXT.handles[dir] = entry;
        }
    }

    let handle = await entry.getFileHandle(path.pop());
    return await handle.getFile();
};

EXT.readFile = function (id, callback) {
    EXT.readFileAsync(id).then(callback);
};

EXT.readDir = function (dir, callback) {
    (async function () {
        let entry = null;
        if (dir === '' || dir === '/') {
            // dir = '/';
            entry = User.dirHandle;
        } else {
            if (EXT.handles[dir]) {
                entry = EXT.handles[dir];
            } else {
                entry = await User.dirHandle.getDirectoryHandle(dir.substring(1));
                EXT.handles[dir] = entry;
            }
        }

        let files = [];
        if (dir !== '' && dir !== '/') {
            files.push({
                id:  "",
                name: "...",
                type: "dir",
            });
        }
        for await (const handle of entry.values()) {
            // let idx = "hx-" + (new Date()).getTime() + Math.floor(Math.random() * 100000);
            // EXT.handles[idx] = handle;
            // console.log(handle);
            files.push({
                id:  dir + '/' + handle.name,
                name: handle.name,
                type: handle.kind === "file" ? "file" : "dir",
                ext: handle.name.split('.').pop()
            });
        }

        files.sort((a, b) => -a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

        return files;
    })().then(callback);
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

EXT.serialize = function (json, format) {
    let mime = null;
    let fileData = null;
    let taBlob = null;

    switch (format) {
        case "KML":
        case "KMZ":
            let ext = format.toLocaleLowerCase();
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
            mime = 'application/gpx+xml';
            fileData = GPX.convert(EXT.render(json), format);
            break;
        default:
            UI.showError("Unknown format!");
            return;
    }

    if (!taBlob)
        taBlob = new Blob([fileData], {type: mime});
    return taBlob;
};

EXT.save = function (json, format, name) {
    let taBlob = EXT.serialize(json, format);

    let ext = null;
    switch (format) {
        case "KML":
        case "KMZ":
            ext = format.toLocaleLowerCase();
            break;

        case "GPXt":
        case "GPXr":
        case "GPX":
        case "GPXtg":
            ext = 'gpx';
            break;
        default:
            UI.showError("Unknown format!");
            return;
    }

    if (!name)
        name = 'track-' + (new Date()).getTime();

    let tempLink = document.createElement("a");
    tempLink.setAttribute('href', URL.createObjectURL(taBlob));
    tempLink.setAttribute('download', name + '.' + ext);
    tempLink.click();

    URL.revokeObjectURL(tempLink.href);
};