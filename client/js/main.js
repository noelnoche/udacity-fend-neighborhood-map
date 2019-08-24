/* jshint strict: false */

/**
 * @fileOverview A basic single-page Map application
 * @author Noel Noche
 * @version 3.0.0
 */
 
/**
 * Encapsulates the global execution context into a defined variable
 * @name App
 * @namespace
 * @param {Object} global - The global execution context (global this)
 */
var App = (function(global) {

  'use strict';

  /**
   * Holds the current index of an Array in for-loops
   * @type {(undefined | Object)}
   */
  var i;

  /**
   * Holds length of an Array in for-loops
   * @type {(undefined | Object)}
   */
  var len;


  /**
   * Holds the map Object generated by Google Maps
   * @type {string}
   */
  var API_KEY = 'Place your Google Maps API key here';
  

  /**
   * Holds the map Object generated by Google Maps
   * @type {(undefined | Object)}
   */
  var map;

  /**
   * Holds PlaceServices API
   * @type {(undefined | Object)}
   */
  var service;


  /* ERROR HANDLERS
  ----------------------------------------------------------------------------*/
  /**
   * Displays general and specific error messages from failed JS geolocation and Google Maps API requests
   * @function displayAlert
   * @param {string} errorId - Error code or message
   */
  function displayAlert(errorId) {
    var $msgNode = $('.alert__notifier');
    var errorMsg = null;
    var errorTypes = {
      'OK': 'Successful connection to API service', // dev only
      'ERROR': 'There was a problem contacting Google servers',
      'INVALID_REQUEST': 'This request was invalid',
      'OVER_QUERY_LIMIT': 'The webpage has gone over its request quota',
      'REQUEST_DENIED': 'The webpage is not allowed to use the PlacesService',
      'UNKNOWN_ERROR': 'The request could not be processed due to a server error. The request may succeed if you try again.',
      'PERMISSION_DENIED': 'User denied the request for Geolocation.',
      'POSITION_UNAVAILABLE': 'Location information is unavailable.',
      'TIMEOUT': 'The request to get user location timed out.',
      'ZERO_RESULTS': 'No nearby cafes detected.'
    };

    if (errorTypes[errorId]) {
      errorMsg = errorTypes[errorId];
    }
    else if (errorId.message) {
      errorMsg = errorId.message;
    }
    else {
      errorMsg = errorId;
    }

    $msgNode.text('An error has occurred. See browser\'s error log for details.').css('display', 'block');
    console.error(errorMsg);
  }

  /**
   * Check if the browser supports geolocation
   * @function checkGeolocation
   */
  function checkGeolocation() {

    /* jshint ignore:start */
    if ('geolocation' in window.navigator) {
      return true;
    }
    else {
      displayAlert('Browser does not support geolocation.');
      return false;
    }
    /* jshint ignore:end */    
  }

  /**
   * Checks if the user is connected to the internet
   * @function checkOnlineStatus
   * @return {boolean}
   */
  function checkOnlineStatus() {
    if (window.navigator.onLine === true) {
      return true;
    }
    else {
      displayAlert('You appear to be offline. Please check your wifi settings.');
      return false;
    }
  }


  /* GOOGLE MAPS
  ----------------------------------------------------------------------------*/
  /**
   * Initial callback function for Google Maps
   * @function initMaps
   */
  function initMaps() {
    if (checkGeolocation() === true  && checkOnlineStatus() === true) {
      navigator.geolocation.getCurrentPosition(buildMap, displayAlert);
    }
  }

  /**
   * Loads script tags on to the DOM (here it's only for Google Maps)
   * @function callGoogleMaps
    * @param {string} apiKey - Your Google Maps API key
   */
  function callGoogleMaps(apiKey) {
    var mapsUrl = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=places';

    $.ajax({
      url: mapsUrl,
      dataType: 'jsonp'
    })
    .done(initMaps);
  }

  /**
   * Makes search results alphabetical
   * @function sortResults
   * @param {Array.<Object>} dataArray - The array containing the retrieved places data
   */
  function sortResults(dataArray) {
    var sortedNamesArray = [];
    var sortedDataArray = [];
    var temp, j;

    for (i = 0; i < dataArray.length; i++) {
      temp = dataArray[i].name;
      sortedNamesArray.push(temp);
      // placesOpenData[temp.id] = temp.opening_hours.isOpen;
    }

    sortedNamesArray.sort();
    var lenB = sortedNamesArray.length;

    for (i = 0; i < lenB; i++) {
      for (j = 0; j < dataArray.length; j++) {
        if (sortedNamesArray[i] === dataArray[j].name) {
          temp = dataArray[j];
          sortedDataArray.push(temp);
          dataArray.splice(j, 1);
          temp = null;
        }
      }
    }

    return sortedDataArray;
  }

  /**
   * Processes search results and applies Knockout JS binding context
   * This is a request callback of nearbySearch service in buildMap()
   * @function callback
   * @param {Array.<Object>} results - The array containing the retrieved places data
   * @param {Object} status - Contains the status data send back from the place request
   */
  function callback(results, status) {
    var bounds = new google.maps.LatLngBounds();
    var sortedResults;
    var viewModelObj;

    if (status === google.maps.places.PlacesServiceStatus.OK) {
      sortedResults = sortResults(results);

      for (i = 0, len = sortedResults.length; i < len; i++) {
        bounds.extend(sortedResults[i].geometry.location);
      }

      map.fitBounds(bounds);

      /** Implementing Knockout JS */
      viewModelObj = new AppViewModel(map, sortedResults);
      ko.applyBindings(viewModelObj);
      viewModelObj.initializeAppView();
    }
    else {
      displayAlert(status);
    }
  }

  /**
   * Builds Google Maps object from from Javascript geolocation API response data
   * @function buildMap
   * @param {Object} posObj - Holds location data from JS geolocation response object
   */
  function buildMap(posObj) {
    var lat = posObj.coords.latitude;
    var lon = posObj.coords.longitude;

    if (lat && lon) {

      // Comment-out this data for production version
      var lat = 37.7833;
      var lon = -122.4167;

      var locObj = new google.maps.LatLng(lat, lon);

      var mapProperties = {
        center: locObj,
        zoom: 15,
        disableDefaultUI: true
      };

      var request = {
        location: locObj,
        radius: 1000,
        types: ['cafe', 'bakery'],
        keyword: 'coffee'
      };

      try {
        map = new google.maps.Map(document.getElementById('map-canvas'), mapProperties);
        service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, callback);
      }
      catch (err) {
        displayAlert(err);
      }
    }
    else {
      displayAlert('Unable to get user location.');
    }
  }


  /* MARKER DATA LOADER
  ----------------------------------------------------------------------------*/
  /**
   * Loads data from Google Place Search APIs to clicked marker
   * @function loadMarkerData
   * @param {Object} mkrObj - The object containing the data for a marker
   */
  function loadMarkerData(mkrObj) {
    var requestObj = {
      placeId: mkrObj.id
    };
    
    service.getDetails(requestObj, function(place, status) {
      var placeDataList = ['photos', 'address_components', 'formatted_phone_number', 'international_phone_number', 'price_level', 'rating', 'user_ratings_total', 'opening_hours', 'reviews', 'url'];
      var curItem = null;
      var phone = null;
     
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        for (i = 0, len = placeDataList.length; i < len; i++) {
          curItem = place[placeDataList[i]];
          if (typeof curItem === 'undefined') {
            place[placeDataList[i]] = '?';
          }
        }

        // Photos
        if (typeof place.photos === 'object') {
          place.photos.forEach(function(photo) {
            mkrObj.photos.push(photo.getUrl({
              'maxWidth': 350,
              'maxHeight': 200
            }));
          });
        }
        else {
          mkrObj.photos.push('https://lh3.googleusercontent.com/_nFDV0pen9rXCLMAw0zyVxiG-xspV2EDK1xJ1RcMm1rn3RjWvh-DJHGuVD8YIs7TMxZLLQkHBSvsoGS3yBbnV4tQmJDVx-UXW-wvOKwOULfuIO-3QbFvt-K3oVUFIjYGT7vMSMLaWg=s300-no');
          console.log('No photos for ' + place.name);
        }

        // Address, phone and homepage 
        mkrObj.address1(place.address_components[0].long_name + ' ' + place.address_components[1].long_name);
        mkrObj.address2(place.address_components[2].long_name + ', ' + place.address_components[3].short_name +
          ' ' + place.address_components[5].short_name);

        if (place.formatted_phone_number !== '?') {
          phone = place.formatted_phone_number;
        }
        else {
          phone = place.international_phone_number;
        }

        mkrObj.phone(phone);
        mkrObj.hp(place.website);

        // Price, rating and status
        if (place.price_level !== '?') {
          var priceLvl = '';
          for (i = 0; i < place.price_level; i++) {
            priceLvl += '$';
          }
          mkrObj.price(priceLvl);
        }
        else {
          mkrObj.price('?');
        }

        mkrObj.ratingText(place.rating + ' (' + place.user_ratings_total + ' total ratings)');

        if (place.opening_hours.open_now === true) {
          mkrObj.status('Now Open');
        }
        else {
          mkrObj.status('Now Closed');
        }        

        // Review snippit with source link
        var clip = '';
        if (place.reviews !== '?') {
          clip = place.reviews[0].text;
          if (clip.length > 150) {
            clip = clip.slice(0, 150) + '...';
          }
          mkrObj.clipping(clip);
          mkrObj.url(place.url);
        }
        else if (place.url !== '?') {
          clip = 'View more details';
          mkrObj.clipping(clip);
          mkrObj.url(place.url);
        }
        else {
          clip = 'No comments or link available.';
        }
      } 
      else {
        displayAlert(status);
      }
    });
  }


  /* CUSTOM KO BINDERS
  ----------------------------------------------------------------------------*/
  /**
   * Custom Knockout binding for applying a highlight effect when user
   * hovers the mouse pointer over an item in the locations list
   * @function highlight
   * @param {Object} element - The element to which the binding is applied
   * @param {number} valueAccessor - The duration of the highlight effect
   */
  ko.bindingHandlers.highlight = {
    update: function(element, valueAccessor) {
      var duration = valueAccessor();
      $(element).mouseenter(function() {
        $(element).fadeTo(duration, 0.5);
      });
      $(element).mouseleave(function() {
        $(element).fadeTo(duration, 1);
      });
    }
  };

  /**
   * Custom Knockout binding for applying a fade-in effect
   * @function fadein
   * @param {Object} element - The element to which the binding is applied
   * @param {number} valueAccessor - The duration of the fade-in animation
   */
  ko.bindingHandlers.fadein = {
    update: function(element, valueAccessor) {
      var duration = valueAccessor();
      $(element).fadeIn(duration);
    }
  };

  /**
   * Custom Knockout binding for toggle fade effect
   * @function fadeVisible
   * @param {Object} element - The element to which the binding is applied
   * @param {number} valueAccessor - The duration of the fade-in animation
   */
  ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
      var value = valueAccessor();
      $(element).toggle(ko.unwrap(value));
    },
    update: function(element, valueAccessor) {
      var value = valueAccessor();

      if (ko.unwrap(value)) {
        $(element).fadeIn();
      }
      else {
        $(element).fadeOut();
      }
    }
  };


  /* MARKER
  ----------------------------------------------------------------------------*/
  /**
   * Creates a Marker object
   * @memberof Global
   * @class Represents a marker on the map
   * @param {Object} parent - The AppViewModel Object
   * @param {Object} map - The Google Maps map Object
   * @param {Object} data - The data returned form Google Maps and third-party services
   * @property {boolean} winOpen - Keeps track of InfoWindow state
   * @property {string} name - The name of the place
   * @property {string} vicinity - The simplified address of the place
   * @property {Object} placeLoc - Contains the place coordinates
   * @property {string} memo - Holds memo data input by the user
   * @property {boolean} hasMemo - Indicates if the place has memo data
   * @property {boolean} memoOn - Keeps track of state of memo composition window
   * @property {number} topRanker - Marks if the place has a rating of 4.5 or greater
   * @property {Array.<string>} photos - Holds array of photo urls
   * @property {string} id - Unique identifier which is used to get more detailed info on the place
   * @property {string} address1 - Holds part of the complete address
   * @property {string} address2 - Holds part of the complete address
   * @property {string} hp - Hold the homepage url
   * @property {string} phone - Holds the phone number
   * @property {string} url - Holds the url to the reviews source
   * @property {string} status - Holds the current store status (opened or closed)
   * @property {string} price - Holds the price level
   * @property {number} ratingText - If Yelp rating is not available, the Places Library rating is used
   * @property {string} clipping - Holds the first few lines of a review
   * @property {Object} pin - Holds the marker pin data
   * @property {Object} infoWin - Holds the data for the info window (not modal window)
   */
  function Marker(parent, map, data) {

    /** @this {Marker} */
    var self = this;

    /**
     * For limiting the length of the marker bounce animation
     * @type {(undefined | number)}
     */
    var timer;

    self.winOpen = false;
    self.name = data.name;
    self.address = data.vicinity;
    self.placeLoc = data.geometry.location;
    self.memo = ko.observable();
    self.hasMemo = ko.observable(false);
    self.memoOn = ko.observable(false);
    self.topRanker = ko.observable(false);
    self.photos = ko.observableArray([]);
    self.id = data.place_id;
    self.address1 = ko.observable();
    self.address2 = ko.observable();
    self.hp = ko.observable();
    self.phone = ko.observable();
    self.url = ko.observable();
    self.ratingText = ko.observable();
    self.status = ko.observable();
    self.price = ko.observable();
    self.clipping = ko.observable();

    /** Default marker options */
    var mkrOptions = {
      position: self.placeLoc,
      title: data.name,
      animation: google.maps.Animation.DROP
    };

    // Sets alternative icon for high ranking business
    if (data.rating >= 4.5) {
      self.topRanker(true);
      mkrOptions.icon = 'assets/star-pin.png';
    }

    self.pin = new google.maps.Marker(mkrOptions);

    /** Info window content */
    var infoWinOptions = {
      content: '<div id="infowin-content">' +
        '<strong>' + self.name + '</strong><br>' +
        '<br><button id="details-btn" style="text-align: center" type="button" class="btn btn-default btn-block" data-toggle="modal" data-target="#modalWin"><span class="glyphicon glyphicon-new-window" aria-hidden="true"><span class="sr-only">Details</span>' +
        '</div>'
    };

    self.infoWin = new google.maps.InfoWindow(infoWinOptions);

    /**
     * Retrieves a specified array from localStorage; creates one if it doesn't exist
     * @function getMemosArray
     * @param {string} arrayId - The id used to retrieve the specific array
     */
    function getMemosArray(arrayId) {
      var targetArray = localStorage.getItem(arrayId);

      if (!targetArray) {
        targetArray = [];
        localStorage.setItem(arrayId, JSON.stringify(targetArray));
      }
      else {
        targetArray = JSON.parse(targetArray);
      }
      return targetArray;
    }

    /**
     * Ensures than when the user closes the modal window for this marker,
     * the info window also closes -- for smaller screens, it brings back the list
     * @memberof Marker.prototype
     * @method closeModal
     */
    self.closeModal = function() {
      self.winOpen = false;
      self.memoOn(false);
      if (parent.viewportWidth() < 750) {
        parent.showMenu(true);
      }
      self.infoWin.close();
    };

    /**
     * Invokes the text box when the user clicks the pencil icon on the modal window
     * @memberof Marker.prototype
     * @method createMemo
     */
    self.createMemo = function() {
      self.memoOn(true);
      var $modalBackdrop = $('.modal-backdrop');

      // Corrects the issue where the modal's dark backdrop does not
      // fill the entire screen when the memo window is open.
      $modalBackdrop.css('height', '765px');
    };

    /**
     * Stores the memo in localStorage
     * @memberof Marker.prototype
     * @method saveMemo
     */
    self.saveMemo = function(data) {
      var memosArray = getMemosArray('memosArray');
      var key = self.name;
      var value = self.memo();

      if (!memosArray) {
        displayAlert('Please check if your browser settings allow caching with localStorage API');
      }

      if (value) {
        if (memosArray[key]) {
          memosArray[key] = value;
        }
        else {
          localStorage.setItem(key, value);
          memosArray.push(key);
        }
        localStorage.setItem('memosArray', JSON.stringify(memosArray));
        self.hasMemo(true);
      }
      else {
        if (localStorage[key]) {
          localStorage.removeItem(key);
        }

        self.hasMemo(false);
      }
      self.memoOn(false);
    };

    /**
     * Centers the map to the marker when selected
     * @memberof Marker.prototype
     * @method toggleBounce
     */
    self.centerOn = function() {
      map.panTo(self.pin.getPosition());
    };

    /**
     * Toggles the state of the Marker
     * @memberof Marker.prototype
     * @method toggleBounce
     */
    self.toggleBounce = function() {
      if (self.winOpen) {
        window.clearTimeout(timer);
        self.pin.setAnimation(null);
        self.infoWin.close();
        self.winOpen = false;

        /** Return to list on smaller screens */
        if (parent.viewportWidth() < 750) {
          parent.showMenu(true);
        }
      }
      else {
        self.pin.setAnimation(google.maps.Animation.BOUNCE);
        timer = window.setTimeout(function() {
          self.pin.setAnimation(null);
        }, 2800);
        self.infoWin.open(map, self.pin);
        self.winOpen = true;
        if (parent.viewportWidth() < 750) {
          parent.showMenu(false);
        }
      }
    };

    /** Maps event listener for user click actions on the Marker icon */
    google.maps.event.addListener(self.pin, 'click', function() {
      parent.set_marker(self);
    });

    /** Maps event listener for the close tab of the info window */
    google.maps.event.addListener(self.infoWin, 'closeclick', function() {
      self.pin.setAnimation(null);
      if (parent.viewportWidth() < 750) {
        parent.showMenu(true);
      }
    });
  }


  /* APP VIEW MODEL
  ----------------------------------------------------------------------------*/
  /**
   * Creates a AppViewModel object
   * @memberof Global
   * @class Represents the View Model of the application
   * @param {Object} map - The Google Maps map Object
   * @param {Array.<Object>} results - The array containing the retrieved places data
   * @property {string} query - The string entered in the search filter
   * @property {boolean} noMatch - Signals when search filter query returns no matches
   * @property {Array.<Object>} markerList - Holds the Marker (location) objects
   * @property {Object} currentMarker - Holds the currently selected Marker
   * @property {Object} lastActive - Holds the previously selected Marker
   * @property {boolean} showMenu - Signals when the location list should be visible
   * @property {number} viewportWidth - Tracks viewport size to optimize layout for mobile screens
   * @property {boolean} raterFilterOn - Indicates when the filter for highly rated places is on
   * @property {Array.<Object>} ratersArray - Holds Marker (location) objects that are highly rated
   */
  function AppViewModel(map, results) {

    /** @this {AppViewModel} */
    var self = this;
    var locAddr = results[0].vicinity;
    var locAddrLen = locAddr.split(",").length;
    
    if (locAddrLen > 0) {
      self.location = locAddr.split(',')[locAddrLen - 1];
    }
    else {
      self.location = "?";
    }
    self.query = ko.observable('');
    self.noMatch = ko.observable(false);
    self.markerList = ko.observableArray();
    self.currentMarker = ko.observable();

    /**
     * To avoid a cluttered window, (and because all markers share the same modal window)
     * we need to keep track of the previously clicked location
     */
    self.lastActive = ko.observable();
    self.showMenu = ko.observable(true);
    self.viewportWidth = ko.observable(window.screen.width);
    self.raterFilterOn = ko.observable(false);
    self.ratersArray = ko.observableArray();

    /**
     * Initializes the arrays corresponding to the Marker (location) and "top rater" objects
     * Also checks localStorage for user memo data and updates the corresponding Marker properties
     * @memberof AppViewModel.protoype
     * @method initializeAppView
     */
    self.initializeAppView = function() {
      
      /**
       * Technique for updating ko observable arrays without invoking binding
       * every time an item is added (which would increase latency)
       */
      var subArray1 = self.markerList;
      var subArray2 = self.ratersArray;

      results.forEach(function(result) {
        var mkrObj = new Marker(self, map, result);
        
        if (localStorage[mkrObj.name]) {
          mkrObj.memo(localStorage[mkrObj.name]);
          mkrObj.hasMemo(true);
        }

        if (mkrObj.topRanker()) {
          subArray2.push(mkrObj);
        }
        subArray1.push(mkrObj);
      });

      subArray1.valueHasMutated();
      subArray2.valueHasMutated();
    };

    /**
     * Filters out the top rated places
     * @memberof AppViewModel.prototype
     * @method filter_raters
     */
    self.filter_raters = function() {
      if (!self.raterFilterOn()) {
        self.raterFilterOn(true);
        $('.nav__ranker-btn').attr('class', 'btn btn-success btn-block glyphicon glyphicon-star');

        for (i = 0, len = self.markerList().length; i < len; i++) {
          self.markerList()[i].pin.setMap(null);
        }

        self.ratersArray().forEach(function(mkrObj) {
          if (mkrObj.topRanker()) {
            mkrObj.pin.setMap(map);
          }
        });
      }
      else {
        $('.nav__ranker-btn').attr('class', 'btn btn-default btn-block glyphicon glyphicon-star-empty');
        self.raterFilterOn(false);

        for (i = 0, len = self.markerList().length; i < len; i++) {
          self.markerList()[i].pin.setMap(map);
        }
      }
    };

    /**
     * Sets the clicked marker, keeping only one marker active at a time
     * @memberof AppViewModel.prototype
     * @method filter_raters
     */
    self.set_marker = function(clickedMarker) {
      if (self.lastActive() && self.lastActive().name !== clickedMarker.name) {
        self.lastActive().infoWin.close();
        self.lastActive().winOpen = false;
        self.currentMarker(clickedMarker);
      }
      else {
        self.currentMarker(clickedMarker);
      }

      // On smaller screens, closes the places list while the marker is selected
      if (self.viewportWidth() < 750) {
        self.showMenu(false);
      }

      clickedMarker.toggleBounce();
      clickedMarker.centerOn();

      loadMarkerData(clickedMarker);

      self.lastActive(clickedMarker);
    };

    /**
     * Filters out all places that match the current letters entered in the search filter bar
     * @memberof AppViewModel.prototype
     * @method filtered
     */
    self.filtered = ko.computed(function() {
      var filterGroup;
      var filter = self.query().toLowerCase().replace(/\s+/g, '');

      if (self.raterFilterOn()) {
        filterGroup = self.ratersArray();
      }
      else {
        filterGroup = self.markerList();
      }

      /** Checks if user input valid search query; otherwise, returns a "No matches" message */
      for (i = 0; i < results.length; i++) {
        if (results[i].name.toLowerCase().replace(/\s+/g, '').indexOf(filter) > -1) {
          self.noMatch(false);
          break;
        }
        self.noMatch(true);
      }

      if (!filter) {
        for (i = 0; i < filterGroup.length; i++) {
          filterGroup[i].pin.setMap(map);
        }
        return filterGroup;
      }
      else {
        return ko.utils.arrayFilter(filterGroup, function(place) {
          if (place.name.toLowerCase().replace(/\s+/g, '').indexOf(filter) > -1) {
            place.pin.setMap(map);
            return place;
          }
          else {
            place.pin.setMap(null);
          }
        });
      }
    });
  }


  window.onload = callGoogleMaps(API_KEY);
})(this);


