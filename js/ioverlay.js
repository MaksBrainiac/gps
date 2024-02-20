var OUI = {
    ///rectangle: null,

    alpha: false,
    visible: true,
    fixed: false,
    
    overlay: null,
    image: null,
    
    _onChange: null,
    bounds: null,
    boundMarkers: [], // 5!

    alphaToggle: function() {
        if (!OUI.visible)
            OUI.toggle();
        OUI.alpha = !OUI.alpha;
        OUI.setAlpha(OUI.alpha);
        OUI._onChange();
    },

    setAlpha: function(val) {
        OUI.overlay.alpha_ = val ? 0.3 : 1;
        OUI.overlay.draw();
    },
    
    fixPosition: function() {
        if (!OUI.visible)
            OUI.toggle();
        OUI.fixed = !OUI.fixed;
        OUI.setFixed(OUI.fixed);
        OUI._onChange();
    },

    setFixed: function(val) {
        if (val) {
            OUI.boundLine.setMap(null);

            OUI.boundMarkers[0].setMap(null);
            OUI.boundMarkers[1].setMap(null);
            OUI.boundMarkers[2].setMap(null);
            OUI.boundMarkers[3].setMap(null);
        }
        else {
            // UNFIX
            OUI.overlay.setMap(GP._map);

            OUI.boundLine.setMap(GP._map);

            OUI.boundMarkers[0].setMap(GP._map);
            OUI.boundMarkers[1].setMap(GP._map);
            OUI.boundMarkers[2].setMap(GP._map);
            OUI.boundMarkers[3].setMap(GP._map);
        }
    },
    
    toggle: function() {
        OUI.visible = !OUI.visible;
        
        if (OUI.visible) {
            OUI.overlay.setMap(GP._map);
            setTimeout(function(){
                OUI.setFixed(OUI.fixed);
                OUI.setAlpha(OUI.alpha);
            });
        }
        else {
            OUI.setFixed(true);
            OUI.setAlpha(true);
            OUI.overlay.setMap(null);
        }
        OUI._onChange();
    },
    
    remove: function() {
        OUI.image = null;

        OUI.boundLine.setMap(null);

        OUI.boundMarkers[0].setMap(null);
        OUI.boundMarkers[1].setMap(null);
        OUI.boundMarkers[2].setMap(null);
        OUI.boundMarkers[3].setMap(null);

        OUI.overlay.setMap(null);

        OUI._onChange();
    },

    showNewRect: function(event) {
        //OUI.bounds = OUI.boundLine.getBounds();

        OUI.updateBoundsLocation(OUI.boundLine.getBounds(), "rect");

        //OUI.overlay.bounds_ = bounds;
        //OUI.overlay.draw();
        //OUI._onChange();
    },

    isFixed: function () {
        return !OUI.boundLine.getMap();
    },

    hasOverlay: function() {
        return !!OUI.image;
    },

    serialize: function() {
        if (!OUI.image)
            return "";

        //OUI.bounds = OUI.rectangle.getBounds();
        return JSON.stringify({
            src: OUI.image,
            bounds: [
                OUI.bounds.getSouthWest().lat(),
                OUI.bounds.getSouthWest().lng(),
                OUI.bounds.getNorthEast().lat(),
                OUI.bounds.getNorthEast().lng()
            ],
            fixed: OUI.isFixed(),
            alpha: OUI.alpha,
            visible: OUI.visible
        });
    },

    init: function(imgOverlayObj, onChange){
        OUI._onChange = onChange;

        var srcImage = null;
        var googleMap = null;

        var fixed = false;
        var visible = true;

        var center = GP._map.getCenter();
        if (imgOverlayObj && imgOverlayObj !== "") {
            var obj = JSON.parse(imgOverlayObj);
            srcImage = obj.src;
            googleMap = GP._map;
            OUI.bounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(obj.bounds[0], obj.bounds[1]),
                new google.maps.LatLng(obj.bounds[2], obj.bounds[3])
            );
            OUI.image = srcImage;
            OUI.alpha = obj.alpha;
            fixed = obj.fixed;
            visible = obj.visible;
        }
        else {
            OUI.bounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(center.lat() - 0.03, center.lng() - 0.05),
                new google.maps.LatLng(center.lat() + 0.03, center.lng() + 0.05)
            );
            srcImage = '/images/wiki.png';
            OUI.image = null;
            OUI.alpha = false;
        }

        // Define a rectangle and set its editable property to true.
        /*OUI.rectangle = new google.maps.Rectangle({
            bounds: bounds,
            editable: true,

            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0
        });*/

        // left, top
        OUI.boundMarkers[0] = OUI.__createBoundMarker(center);
        OUI.boundMarkers[1] = OUI.__createBoundMarker(center);
        OUI.boundMarkers[2] = OUI.__createBoundMarker(center);
        OUI.boundMarkers[3] = OUI.__createBoundMarker(center);

        OUI.boundLine = new google.maps.Rectangle({
            clickable: true,
            editable: false,
            draggable: true,

            strokeColor: "#000000",
            strokeOpacity: 1,
            strokeWeight: 1,

            fillOpacity: 0,
            map: GP._map,
            bounds: OUI.bounds
        });
        OUI.boundLine.addListener("bounds_changed", OUI.showNewRect);
        OUI.boundLine.addListener("rightclick", function(event) {
             OUI.fixPosition();
        });

        OUI.overlay = new EditableOverlay(OUI.bounds, srcImage, OUI.alpha ? 0.3 : 1, googleMap);

        OUI.updateBoundsLocation(OUI.bounds, "init");

        if (fixed)
            OUI.fixPosition();
        if (!OUI.image)
            OUI.remove();
        if (!visible)
            OUI.toggle();
        
        onChange();
    },

    __createBoundMarker: function(loc){
        var marker = new google.maps.Marker({
            position: loc,
            flat: true,
            icon: {
                anchor:	new google.maps.Point(4, 4),
                scaledSize:	new google.maps.Size(9, 9),
                size: new google.maps.Size(9, 9),
                url: 'img/tracks/mxr.png'
            },
            raiseOnDrag: false,
            draggable: true,
            clickable: true,
            map: GP._map,
            zIndex: 2
            //title: "click to resize"
        });

        /*google.maps.event.addListener(marker, "mousedown", function(event) {
            if (GP.debug) console.log("Image-Marker-Mouse-Down");
        });
        google.maps.event.addListener(marker, "mouseup", function(event) {
            if (GP.debug) console.log("Image-Marker-Mouse-Up");
        });*/
        google.maps.event.addListener(marker, "drag", function(event) {
            //if (GP.debug) console.log("Image-Marker-Drag");
            OUI.boundMarkerDrag(marker, event);
        });

        /*google.maps.event.addListener(marker, "click", function(event) {
            if (GP.debug) console.log("Image-Marker-CLICK");
            instance.onMarkerClicked(marker);
        });*/
        return marker;
    },

    boundMarkerDrag: function(marker, event){
        var index = OUI.boundMarkers.indexOf(marker);
        var newBounds;
        if (index === 4) {
            /*var pc = OUI.bounds.getCenter();
            var shift = [
                event.latLng.lat() - pc.lat(),
                event.latLng.lng() - pc.lng()
            ];
            //console.log("CENTER!!!", shift, event);
            var newBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(OUI.bounds.getSouthWest().lat() + shift[0], OUI.bounds.getSouthWest().lng() + shift[1]),
                new google.maps.LatLng(OUI.bounds.getNorthEast().lat() + shift[0], OUI.bounds.getNorthEast().lng() + shift[1])
            );*/
        }
        else {
            switch (index)
            {
                case 0:
                    newBounds = new google.maps.LatLngBounds(
                        new google.maps.LatLng(OUI.bounds.getSouthWest().lat(), event.latLng.lng()),
                        new google.maps.LatLng(event.latLng.lat(), OUI.bounds.getNorthEast().lng())
                    );
                    break;
                case 1:
                    newBounds = new google.maps.LatLngBounds(
                        OUI.bounds.getSouthWest(),
                        event.latLng
                    );
                    break;
                case 2:
                    newBounds = new google.maps.LatLngBounds(
                        new google.maps.LatLng(event.latLng.lat(), OUI.bounds.getSouthWest().lng()),
                        new google.maps.LatLng(OUI.bounds.getNorthEast().lat(), event.latLng.lng())
                    );
                    break;
                case 3:
                    newBounds = new google.maps.LatLngBounds(
                        event.latLng,
                        OUI.bounds.getNorthEast()
                    );
                    break;
            }
        }
        if (newBounds)
            OUI.updateBoundsLocation(newBounds);
    },

    updateBoundsLocation: function(newBounds, on){

        OUI.bounds = newBounds;

        OUI.boundMarkers[0].setPosition(new google.maps.LatLng(OUI.bounds.getNorthEast().lat(), OUI.bounds.getSouthWest().lng()));
        OUI.boundMarkers[1].setPosition(OUI.bounds.getNorthEast());
        OUI.boundMarkers[2].setPosition(new google.maps.LatLng(OUI.bounds.getSouthWest().lat(), OUI.bounds.getNorthEast().lng()));
        OUI.boundMarkers[3].setPosition(OUI.bounds.getSouthWest());

        if (on !== "rect")
            OUI.boundLine.setBounds(OUI.bounds);

        OUI.overlay.bounds_ = OUI.bounds;
        OUI.overlay.draw();

        OUI._onChange();
    },

    showOverlayFromFile: function(fileObj){
        if (!fileObj.type.indexOf('image/') < 0)
            return;

        var reader = new FileReader();
        reader.onload = function(e) {
            OUI.image = e.target.result;
            OUI.overlay.image_ = e.target.result;
            if (OUI.overlay && OUI.overlay.img_) {
                OUI.overlay.img_.src = e.target.result;
            }

            if (!OUI.overlay.getMap()) {
                var center = GP._map.getCenter();
                var bounds = new google.maps.LatLngBounds(
                    new google.maps.LatLng(center.lat() - 0.03, center.lng() - 0.06),
                    new google.maps.LatLng(center.lat() + 0.03, center.lng() + 0.06)
                );
                //OUI.overlay.bounds_ = bounds;
                OUI.updateBoundsLocation(bounds);
            }
            OUI.overlay.setMap(GP._map);
            ///OUI.rectangle.setMap(GP._map);

            if (OUI.isFixed())
                OUI.fixPosition();
        };
        reader.readAsDataURL(fileObj);
    }
};

// ------------------------------------------------------------------------------------------------------------------ //

//var overlay;
EditableOverlay.prototype = new google.maps.OverlayView();

/** @constructor */
function EditableOverlay(bounds, image, alpha, map) {

    // Initialize all properties.
    this.bounds_ = bounds;
    this.image_ = image;
    this.alpha_ = alpha;
    this.map_ = map;

    // Define a property to hold the image's div. We'll
    // actually create this div upon receipt of the onAdd()
    // method so we'll leave it null for now.
    this.div_ = null;

    // Explicitly call setMap on this overlay.
    if (map)
        this.setMap(map);
}

/**
 * onAdd is called when the map's panes are ready and the overlay has been
 * added to the map.
 */
EditableOverlay.prototype.onAdd = function() {

    var div = document.createElement('div');
    div.style.borderStyle = 'none';
    div.style.borderWidth = '0px';
    div.style.position = 'absolute';

    // Create the img element and attach it to the div.
    var img = document.createElement('img');
    img.src = this.image_;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.position = 'absolute';
    div.appendChild(img);

    this.img_ = img;
    this.div_ = div;

    // Add the element to the "overlayLayer" pane.
    var panes = this.getPanes();
    panes.overlayLayer.appendChild(div);
};

EditableOverlay.prototype.draw = function() {

    // We use the south-west and north-east
    // coordinates of the overlay to peg it to the correct position and size.
    // To do this, we need to retrieve the projection from the overlay.
    var overlayProjection = this.getProjection();
    if (!overlayProjection)
        return;

    // Retrieve the south-west and north-east coordinates of this overlay
    // in LatLngs and convert them to pixel coordinates.
    // We'll use these coordinates to resize the div.
    var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
    var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

    // Resize the image's div to fit the indicated dimensions.
    var div = this.div_;
    div.style.left = sw.x + 'px';
    div.style.top = ne.y + 'px';
    div.style.width = (ne.x - sw.x) + 'px';
    div.style.height = (sw.y - ne.y) + 'px';
    div.style.opacity = this.alpha_;
};

// The onRemove() method will be called automatically from the API if
// we ever set the overlay's map property to 'null'.
EditableOverlay.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
};