var H5P = H5P || {};

/**
 * Constructor.
 *
 * @param {Object} params Options for this library.
 * @param {Number} id Content identifier
 * @returns {undefined}
 */
(function ($) {
  H5P.EPubDocument = function (params, id, extras) {
    H5P.EventDispatcher.call(this);
    this.extras = extras;
    this.source = H5P.getPath(params.file.path, id);

    if (params.chapter) {
      this.chapter = params.chapter;
    }

  };

  H5P.EPubDocument.prototype = Object.create(H5P.EventDispatcher.prototype);
  H5P.EPubDocument.prototype.constructor = H5P.EPubDocument;

  /**
   * Wipe out the content of the wrapper and put our HTML in it.
   *
   * @param {jQuery} $wrapper
   * @returns {undefined}
   */
  H5P.EPubDocument.prototype.attach = function ($wrapper) {
    var self = this;
    var source = this.source;
    self.$epubContainer = $('<div>', {
      width: '100%',
      height: '100%',
      id: 'epub-container' ,
      class: 'epub-container',
    });

    self.$epub = $('<div>', {
      id: 'viewer' ,
      on: {
        load: function () {
          self.trigger('loaded');
          handleXAPI();
        }
      }
    });

    // Create the '‹' (previous) arrow element
    var prevArrow = document.createElement("div");
    prevArrow.id = "prev";
    prevArrow.className = "arrow";
    prevArrow.innerHTML = "‹";

    // Create the '›' (next) arrow element
    var nextArrow = document.createElement("div");
    nextArrow.id = "next";
    nextArrow.className = "arrow";
    nextArrow.innerHTML = "›";

    // Append the elements to the container
    self.$epubContainer.append(prevArrow);
    self.$epubContainer.append(nextArrow);
    self.$epubContainer.append(self.$epub)

    var book = ePub(source);
    var rendition = book.renderTo(self.$epub[0], {
      width:  900,
      height: 600,
    });

    var displayed = self.chapter ? rendition.display(self.chapter) : rendition.display();
    displayed.then(function(renderer){
      self.trigger('resize');
    });
    
    // Navigation loaded
    book.loaded.navigation.then(function(toc){
      console.log(toc);
    });

    nextArrow.addEventListener("click", function(){
      book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
      e.preventDefault();
    }, false);

    prevArrow.addEventListener("click", function(){
      book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
      e.preventDefault();
    }, false);

    var keyListener = function(e){

      // Left Key
      if ((e.keyCode || e.which) === 37) {
        book.package.metadata.direction === "rtl" ? rendition.next() : rendition.prev();
      }

      // Right Key
      if ((e.keyCode || e.which) === 39) {
        book.package.metadata.direction === "rtl" ? rendition.prev() : rendition.next();
      }

    };

    rendition.on("keyup", keyListener);
    document.addEventListener("keyup", keyListener, false);


    // Handle errors during book loading
    book.opened.catch(function(error) {
      console.error('Error opening book:', error);
    });

    rendition.on("relocated", function(location){
      console.log(location.start.location);
      var next = book.package.metadata.direction === "rtl" ? prevArrow : nextArrow;
      var prev = book.package.metadata.direction === "rtl" ? nextArrow : prevArrow;

      var isEndOfSelectedChapter = location.end.displayed.page === location.end.displayed.total;
      var isStartOfSelectedChapter = location.start.displayed.page === 1;
      if (location.atEnd || isEndOfSelectedChapter) {
        next.style.visibility = "hidden";
      } else {
        next.style.visibility = "visible";
      }

      if (location.atStart || isStartOfSelectedChapter) {
        prev.style.visibility = "hidden";
      } else {
        prev.style.visibility = "visible";
      }
      self.trigger('resize');

    });

    window.addEventListener("unload", function () {
      book.destroy();
    });


    /**
     * trigger XAPI based on activity if activity is CP then trigger after slide consumed else trigger on attach
     */
    var handleXAPI = function () {
      // for CP trigger only on slide open for others trigger on attach
      if (self.extras.hasOwnProperty("parent") && self.extras.parent.hasOwnProperty("presentation")) {
        self.on('trigger-consumed', function () {
          triggerXAPIConsumed();
        });
      } else {
        triggerXAPIConsumed();
      }
    };

    /**
     * Trigger the 'consumed' xAPI event
     *
     */
    var triggerXAPIConsumed = function () {
      var xAPIEvent = self.createXAPIEventTemplate({
        id: 'http://activitystrea.ms/schema/1.0/consume',
        display: {
          'en-US': 'consumed'
        }
      }, {
        result: {
          completion: true
        }
      });

      Object.assign(xAPIEvent.data.statement.object.definition, {
        name:{
          'en-US': self.title !== undefined ? self.title : 'ePub'
        }
      });

      self.trigger(xAPIEvent);
    };

    $wrapper.addClass('h5p-epub').html(self.$epubContainer);

  };

  return H5P.EPubDocument;
}(H5P.jQuery));
