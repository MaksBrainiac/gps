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
    EXT.saveFileAsync().then(callback);
};

EXT.saveFileAsync = async function (dir, id, title, format, json) {
    if (id) {
        format = id.split("/").pop().split('.').pop().toLocaleUpperCase();
    }

    let blob = EXT.serialize(json, format);
    let fileHandle = null;

    if (id) {
        let pathArr = id.split('/');
        let fileName = pathArr.pop();
        let path = pathArr.join('/');

        let entry = await EXT.getDirEntryAsync(path);
        fileHandle = await entry.getFileHandle(fileName);
    } else {
        let entry = await EXT.getDirEntryAsync(dir);
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
};

EXT.getDirEntryAsync = async function (path) {
    if (path === '' || path === '/') {
        return User.dirHandle;
    }

    if (EXT.handles[path]) {
        return EXT.handles[path];
    }

    let dirArr = path.split('/');
    let dName = dirArr.pop();
    let dPath = dirArr.join('/');

    let entry = await EXT.getDirEntryAsync(dPath);
    return await entry.getDirectoryHandle(dName);
}

EXT.readFileAsync = async function (id) {
    console.info("EXT.readFile", id);

    let pathArr = id.split('/');
    let fileName = pathArr.pop();
    let path = pathArr.join('/');

    let entry = await EXT.getDirEntryAsync(path);
    let handle = await entry.getFileHandle(fileName);
    return await handle.getFile();
};

EXT.readFile = function (id, callback) {
    EXT.readFileAsync(id).then(callback);
};

EXT.readDirAsync = async function (dir) {
    let entry = await EXT.getDirEntryAsync(dir);
    let files = [];
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

    files.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    if (dir !== '' && dir !== '/') {
        files.unshift({
            id:  "",
            name: "...",
            type: "dir",
        });
    }

    return files;
};

EXT.readDir = function (dir, callback) {
    EXT.readDirAsync().then(callback);
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

    if (!name) {
        name = 'track-' + (new Date()).getTime();
    } else {
        let aName = name.split('.');
        if (aName.length > 1 && aName[aName.length-1] !== "")
            aName.pop();
        name = aName.join('.');
    }

    let tempLink = document.createElement("a");
    tempLink.setAttribute('href', URL.createObjectURL(taBlob));
    tempLink.setAttribute('download', name + '.' + ext);
    tempLink.click();

    URL.revokeObjectURL(tempLink.href);
};