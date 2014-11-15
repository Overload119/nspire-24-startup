(function(global) {
  var lat, lng, hasLocation = false;
  var map;
  var linkedInResult;

  $('.hero').height($(window).height());
  $('.front button').click(function() {
    if ($(this).hasClass('disabled')) {
      return;
    }

    IN.User.authorize(onLinkedInAuth)
  });

  var setupLocation = function() {
    var positionCallback = function(position) {
      lat = position.coords.latitude;
      lng = position.coords.longitude;
      hasLocation = true;
      centerGoogleMaps(lat, lng);
    }

    var positionFailCallback = function() {
      alert('We failed to get your location to connect you to people nearby. Please refresh the page.');
      $('.front button').addClass('disabled').prop('disabled', 'disabled');
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(positionCallback, positionFailCallback)
    }
  }

  var saveUser = function() {
    $.ajax({
      url: '/save_user',
      type: 'POST',
      dataType: 'json',
      data: {
        linkedIn: linkedInResult,
        location: { lat: lat, lng: lng }
      },
      success: function(response) {
        if (response.success) {
          console.log('Information saved.');
        }
      },
      error: function() {
      }
    });
  }

  var setupLinkedInProfile = function(response) {
    linkedInResult = response.values[0];
    saveUser();
  }

  global.onLinkedInLoad = function() {
    IN.Event.on(IN, 'auth', onLinkedInAuth);
    setupLocation();
  }

  global.onLinkedInAuth = function() {
    IN.API.Profile().ids('me').fields('email-address', 'interests', 'skills', 'three-past-positions')
      .result(setupLinkedInProfile);
    // Once they login, show the search results view.
    $('.front').fadeOut();
    $('.how-it-works').addClass('slide-out').one('webkitTransitionEnd', function() {
      $('.how-it-works').hide();
    });
    $('.search-results').addClass('slide-in');
  }

  var centerGoogleMaps = function(lat, lng) {
    map.setCenter({ lat: lat, lng: lng });
    map.setZoom(15);
  }

  var loadGoogleMaps = function() {
    // By default we center on Waterloo, until we know the user's location.
    // We also disable the interactivity of the map.
    var mapOptions = {
      center: { lat: 43.4631701, lng: -80.5224624 },
      zoom: 12.5,
      draggable: false,
      zoomControl: false,
      scrollwheel: false,
      disableDoubleClickZoom: true
    };

    map = new google.maps.Map(document.getElementById('gmap'), mapOptions);
  }

  google.maps.event.addDomListener(window, 'load', loadGoogleMaps);
  setupLocation();
})(this);
