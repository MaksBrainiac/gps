const IconConvertor = {
};

IconConvertor.gKMLIcons = {};

IconConvertor.initialize = function(map) {
    IconConvertor.gKMLIcons = map;
};

IconConvertor.getFrom = function(icon, source) {
    switch (source) {
        case 'google-kml':
            const k = icon.replace("http://", "https://");
            if (IconConvertor.gKMLIcons[k])
                return IconConvertor.gKMLIcons[k];
            break;
    }
    return 'default';
};

IconConvertor.getGStaticIconForKML = function(icon) {
    for (const [url, val] of Object.entries(IconConvertor.gKMLIcons)) {
        if (val === icon)
            return url;
    }
    return 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png';
};