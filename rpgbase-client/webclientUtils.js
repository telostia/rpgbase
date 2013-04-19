function AssetLoader() {
    this._things = [];
    this._thingsToLoad = 0;
    this._thingsLoaded = 0;
}
AssetLoader.prototype = {
    add: function(url) {
	this._thingsToLoad++;
	var tag = new Image();
	var thing = { url: url,
	              tag: tag };
	this._things.push(thing);
	return tag;
    },

    loadThemAll: function(callback, updateFunc) {
	var self = this;
	// Edge case where nothing has been added - call callback immediately:
	if (this._thingsToLoad == 0) {
	    callback();
	    return;
	}
	for (var t = 0; t < this._thingsToLoad; t++) {
	    (function(thing) {
		thing.tag.onload = function() {
		    self._thingsLoaded ++;
		    if (updateFunc) {
			updateFunc( self._thingsLoaded / self._thingsToLoad );
		    }
		    if (self._thingsLoaded == self._thingsToLoad) {
			callback();
		    }
		};
		thing.tag.src = thing.url;
	    })(this._things[t]);
	}
    }
};