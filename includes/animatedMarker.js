/*
 * L.AnimatedMarker is used to display animated icons on the map.
 */

L.AnimatedMarker = L.Marker.extend({
  options: {
    // meters
    distance: 2000,
    // ms
    interval: 1000,
	// miles
	distanceToStop: 3000,
    // animate on add?
    autoStart: false,
    // callback onend
    onEnd: function(){},
    clickable: false
  },
  
  initialize: function (latlngs, options) {
    if (L.DomUtil.TRANSITION) {
      // No need to to check up the line if we can animate using CSS3
      this._latlngs = latlngs;
    } else {
      // Chunk up the lines into options.distance bits
      this._latlngs = this._chunk(latlngs);
      this.options.distance = 10;
      this.options.interval = 1000;
    }

	this._latlngs = latlngs;
	
	if (typeof options.onEnd != "undefined"){
		this.options.onEnd = options.onEnd;
	}
    L.Marker.prototype.initialize.call(this, latlngs[0], options);
  },

  // Breaks the line up into tiny chunks (see options) ONLY if CSS3 animations
  // are not supported.
  _chunk: function(latlngs) {
    var i,
        len = latlngs.length,
        chunkedLatLngs = [];
		
    for (i=1;i<len;i++) {
      var cur = latlngs[i-1],
          next = latlngs[i],
          dist = cur.distanceTo(next),
          factor = this.options.distance / dist,
          dLat = factor * (next.lat - cur.lat),
          dLng = factor * (next.lng - cur.lng);

      if (dist > this.options.distance) {
        while (dist > this.options.distance) {
          cur = new L.LatLng(cur.lat + dLat, cur.lng + dLng);
          dist = cur.distanceTo(next);
          chunkedLatLngs.push(cur);
        }
      } else {
        chunkedLatLngs.push(cur);
      }
    }

    return chunkedLatLngs;
  },

  onAdd: function (map) {
    L.Marker.prototype.onAdd.call(this, map);

    // Start animating when added to the map
    if (this.options.autoStart) {
      this.start();
    }
  },

  animate: function() {
    var self = this,
        len = this._latlngs.length,
        speed = this.options.interval;

	var remainingDistance = this._latlngs[this._i-1].distanceTo(this._latlngs[this._i]);

    // Only if CSS3 transitions are supported
    if (L.DomUtil.TRANSITION) {
		// Normalize the transition speed from vertex to vertex
		if (this._i < len) {
		  speed = remainingDistance / this.options.distance * this.options.interval;
		}
		if (this._icon) { this._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms linear'); }
		if (this._shadow) { this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms linear'; }
    }

    // Move to the next vertex
    this.setLatLng(this._latlngs[this._i]);
    this._i++;

    // Queue up the animation ot the next next vertex
    this._tid = setTimeout(function(){
	  self._bringToFront();
	  if (remainingDistance < self.options.distanceToStop) {
		self.options.onEnd.apply(self, Array.prototype.slice.call(arguments));
      } else {
        self.animate();
      }
    }, speed);
  },

  // Start the animation
  start: function() {
    this._i = 1;
    this.animate();
  },

  // Stop the animation in place
  stop: function() {
    if (this._tid) {
      clearTimeout(this._tid);
    }
  },
  
  moveTo: function(latlngs){
    if (L.DomUtil.TRANSITION) {
      // No need to to check up the line if we can animate using CSS3
      this._latlngs = latlngs;
    } else {
      // Chunk up the lines into options.distance bits
      this._latlngs = this._chunk(latlngs);
    }
	this.start();
  }
});

L.animatedMarker = function (latlngs, options) {
  return new L.AnimatedMarker(latlngs, options);
};