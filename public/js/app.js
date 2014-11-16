(function(global) {

  vex.defaultOptions.className = 'vex-theme-flat-attack';

  var LAT_KEY = 'lat_21';
  var LNG_KEY = 'lng_21';

  var lat, lng, hasLocation = false;
  var map;
  var linkedInResult;

  if (localStorage.getItem(LAT_KEY)) {
    lat = parseFloat(localStorage.getItem(LAT_KEY));
    hasLocation = true;
  }

  if (localStorage.getItem(LNG_KEY)) {
    lng = parseFloat(localStorage.getItem(LNG_KEY));
    hasLocation = true;
  }

  var getDistanceFromLatLngInKm = function(lat1,lon1,lat2,lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1);
    var a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
  }

  var deg2rad = function deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  var preparePersonObject = function(person) {
    // Compute the distance between the current user.
    person.distance = Math.round(getDistanceFromLatLngInKm(lat, lng,
      person.location.lat, person.location.lng) * 100) / 100;

    person.hasSkills = person.linkedIn.skills._total > 0;
    person.hasPositions = person.linkedIn.threePastPositions._total > 0;
    return person;
  }

  $(document).on('click', '.profile-dialog button', function(evt) {
    var $diaEl      = $(this).closest('.profile-dialog');
    var shouldSend  = $(this).data('ready');
    var uuid        = $(this).data('uuid');
    if (shouldSend) {
      var userMessage = $diaEl.find('textarea').val();
      $.ajax({
        url: '/contact',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          message: userMessage,
          toUserUuid: uuid,
          userEmail: linkedInResult.emailAddress
        }),
        success: function(response) {
          if (response.success) {
            $diaEl.find('button').prop('disabled', 'disabled').addClass('disabled').html('Sent!');
            $diaEl.find('textarea').slideUp();
          }
        }
      });
    } else {
      $(this).html('Send');
      $(this).closest('.profile-dialog').find('textarea').slideDown();
      $(this).data('ready', true);
    }
  });

  var ProfileCardView = Backbone.View.extend({
    events: {
      'click .profile-card': 'onClickProfileCard'
    },
    initialize: function(data) {
      this.person = data.person;
      return this.render();
    },
    render: function() {
      template = Handlebars.compile($('#profile-card-template').html());
      var templateData = preparePersonObject(this.person);

      this.$el.html(template(templateData));
      return this.$el;
    },
    onClickProfileCard: function() {
      template = Handlebars.compile($('#profile-dialog-template').html());
      vex.open({
        content: template(this.person)
      });
    }
  });

  var SearchResultView = Backbone.View.extend({
    el: '.search-results',
    events: {
      'keyup #search': 'onSearchKeyUp'
    },
    initialize: function() {
      this._searchTimer = null;
      $('.front').fadeOut();
      $('.hero').removeAttr('style').addClass('condense');
      $('.how-it-works').addClass('slide-out').one('webkitTransitionEnd transitionend', function() {
        $('.how-it-works').hide();
        if (hasLocation) {
          centerGoogleMaps(lat, lng);
        }
      });
      $('.search-results').addClass('slide-in');
      $.ajax({
        url: '/get_users',
        data: { userEmail: linkedInResult.emailAddress },
        type: 'GET',
        success: function(response) {
          if (response.success) {
            for (var i = 0; i < response.results.length; i++) {
              (function() {
                var personData = preparePersonObject(response.results[i]);
                var marker = new google.maps.Marker({
                  position: personData.location,
                  map: map
                });
              })();
            }
          }
        }
      });
    },
    onSearchKeyUp: function(evt) {
      var c = evt.keyCode;
      if (this._searchTimer) {
        clearTimeout(this._searchTimer);
      }

      if (c === 13) {
        // If they hit enter, do an instant search.
        this.triggerSearch();
      } else {
        this._searchTimer = setTimeout(this.triggerSearch.bind(this), 1000);
      }
    },
    triggerSearch: function() {
      var query = this.$el.find('#search').val();
      $.ajax({
        url: '/search',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ query: query, userEmail: linkedInResult.emailAddress }),
        success: function(response) {
          if (response.success) {
            for (var i = 0; i < response.results.length; i++) {
              var profileCardView = new ProfileCardView({ person: response.results[i] });
              this.$el.find('#search-result-list').empty().append( profileCardView.$el );
            }
          } else {
            this.$el.find('#search-result-list').empty().append('No results found.');
          }
        }.bind(this)
      });
    },
  });

  $('.hero').height($(window).height());
  $('.front button').click(function() {
    if ($(this).hasClass('disabled')) {
      return;
    }
    IN.User.authorize(onLinkedInAuth)
  });

  var setupLocation = function() {
    console.log('Setting up location...');

    var positionCallback = function(position) {
      lat = position.coords.latitude;
      lng = position.coords.longitude;
      hasLocation = true;

      localStorage.setItem(LAT_KEY, lat);
      localStorage.setItem(LNG_KEY, lng);

      centerGoogleMaps(lat, lng);
      saveUser();
      console.log('Location has been set.');
    }

    var positionFailCallback = function() {
      $('.front button').addClass('disabled').prop('disabled', 'disabled');
      alert('We failed to get your location to connect you to people nearby. Please refresh the page.');
    }

    if (navigator.geolocation && !hasLocation) {
      navigator.geolocation.getCurrentPosition(positionCallback, positionFailCallback)
    }
  }

  var saveUser = function() {
    $.ajax({
      url: '/save_user',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        linkedIn: linkedInResult,
        location: { lat: lat, lng: lng }
      }),
      success: function(response) {
        if (response.success) {
          console.log('Information saved.');
        }
      }
    });
  }

  var setupLinkedInProfile = function(response) {
    linkedInResult = response.values[0];
    saveUser();
    // Once they login with LinkedIn, show result view.
    new SearchResultView();
  }

  global.onLinkedInLoad = function() {
    IN.Event.on(IN, 'auth', onLinkedInAuth);
  }

  global.onLinkedInAuth = function() {
    IN.API.Profile().ids('me').fields('email-address', 'interests', 'skills', '',
      'three-past-positions', 'three-current-positions', 'first-name', 'headline', 'picture-url').result(setupLinkedInProfile);
  }

  var centerGoogleMaps = function(lat, lng) {
    if (map) {
      map.setOptions({
        center: { lat: lat, lng: lng },
        zoom: 15,
        draggable: true,
        zoomControl: true,
        scrollwheel: true,
        disableDoubleClickZoom: false
      });
    }
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

  $(document).ready(function() {
    google.maps.event.addDomListener(window, 'load', loadGoogleMaps);
    setupLocation();
  });
})(this);
