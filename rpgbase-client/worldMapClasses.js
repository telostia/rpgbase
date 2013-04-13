function Map(dimX, dimY, data, spritesheet) {
  // mapData must be array of dimensions equal to dimX and dimY.
  this._mapData = data;
  this._dimX = dimX;
  this._dimY = dimY;

  this._img = new Image();
  this._img.src = spritesheet;
}
Map.prototype = {
  getTileForCode: function(mapCode) {
    return {x:mapCode, y:0};
  }
}

function MapScreen(htmlElem, numTilesX, numTilesY, tilePixelsX,
                  tilePixelsY){
  this._currentDomain = null;
  this._scrollX = 0;
  this._scrollY = 0;
  this._htmlElem = htmlElem;  // must be canvas
  this._ctx = this._htmlElem.getContext("2d");
  this._ctx.scale(2, 2);

  this.numTilesX = numTilesX;
  this.numTilesY = numTilesY;
  this.tilePixelsX = tilePixelsX;
  this.tilePixelsY = tilePixelsY;

  // TODO set width and height of canvas element to
  // numTilesX * tilePixelsX, etc.
}
MapScreen.prototype = {
  setNewDomain: function( domain ) {
    this._currentDomain = domain;
    this._scrollX = 0;
    this._scrollY = 0;
  },

  getLandType: function( x, y ) {
    // x, y are world-coordinates, not screen-coordinates.
    return this._currentDomain._mapData[y][x];
  },
  _getTileElementAt: function( x, y ) {
    //convert to screen coordinates:
    x = x - this._scrollX;
    y = y - this._scrollY;
    var id = "tile_" + x + "_" + y;
    return document.getElementById(id);
  },
  transform: function( worldX, worldY ) {
    // transforms world coords to screen coords:
    var screenX = this.tilePixelsX * (worldX - this._scrollX);
    var screenY = this.tilePixelsY * (worldY - this._scrollY);
    return [screenX, screenY];
  },
  isOnScreen: function( worldX, worldY ) {
    var screenX = worldX - this._scrollX;
    var screenY = worldY - this._scrollY;
    return (screenX > -1 && screenX < this.numTilesX &&
            screenY > -1 && screenY < this.numTilesY);
  },
  autoScrollToPlayer: function( x, y ) {
    // plotAt, but also scrolls screen if this is too close to the edge and it's
    // possible to scroll.
    var screenX = x - this._scrollX;
    var screenY = y - this._scrollY;
    var scrollVal = 0;
    if (screenX < 3) {
      this.scroll( (screenX - 3), 0 );
    } else if (screenX > 7) {
      this.scroll( (screenX - 7), 0 );
    }
    if (screenY < 3) {
      this.scroll( 0, (screenY - 3) );
    } else if (screenY > 7) {
      this.scroll( 0, (screenY - 7 ) );
    }
    this.render();
  },

  render: function() {
    for (var y = 0; y < this.numTilesY; y++) {
      for (var x = 0; x < this.numTilesX; x++) {
        var code = this.getLandType( x + this._scrollX,
                                     y + this._scrollY);
        var img = this._currentDomain._img;
        
        var tile = this._currentDomain.getTileForCode(code);
        var spriteOffsetX = tile.x * this.tilePixelsX;
        var spriteOffsetY = tile.y * this.tilePixelsY;

        this._ctx.drawImage(img,
                            spriteOffsetX,
                            spriteOffsetY,
                            this.tilePixelsX,
                            this.tilePixelsY,
                            x * this.tilePixelsX,
                            y * this.tilePixelsY,
                            this.tilePixelsX,
                            this.tilePixelsY);
      }
    }

  },

  scroll: function( deltaX, deltaY ) {
    var scrollX = this._scrollX + deltaX;
    var scrollY = this._scrollY + deltaY;
    if (scrollX < 0)
      scrollX = 0;
    if ( scrollX + this.numTilesX > this._currentDomain._dimX)
      scrollX = this._currentDomain._dimX - this.numTilesX;
    if (scrollY < 0)
      scrollY = 0;
    if (scrollY + this.numTilesX > this._currentDomain._dimY)
      scrollY = this._currentDomain._dimY - this.numTilesY;

    this._scrollX = scrollX;
    this._scrollY = scrollY;
  },

  pointInBounds: function( x, y ) {
    if ( x >= this._currentDomain._dimX || x < 0 )
      return false;
    if ( y >= this._currentDomain._dimY || y < 0 )
      return false;
    return true;
  },

  scrollToShow: function( x, y ) {
    var screenX = x - this._scrollX;
    var screenY = y - this._scrollY;
    this.scroll( x-4, y-4 );
  }
};