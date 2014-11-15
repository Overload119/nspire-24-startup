(function(global) {

  var ProfileCardView = Backbone.View.extend({
    initialize: function(data) {
      this.person = data.person;
    },
    render: function() {
      template = Handlebars.compile($('#profile-card-template').html());
      this.$el.html(template(this.person));
      return this.$el;
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
      });
      $('.search-results').addClass('slide-in');
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
      debugger
      $.ajax({
        url: '/search',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'application/json',
        data: JSON.stringify({ query: query }),
        success: function(response) {
          debugger
          if (response.success) {
            debugger
            for (var i = 0; i < response.results.length; i++) {
              var profileCardEl = new ProfileCardView({ person: response.results[i].linkedIn });
              profileCardEl.appendTo( this.$el );
            }
          } else {
            this.$el.find('#search-result-list').empty().append('No results found.');
          }
        }
      });
    },
  });

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
      contentType: 'application/json',
      dataType: 'application/json',
      data: JSON.stringify({
        linkedIn: linkedInResult,
        location: { lat: lat, lng: lng }
      }),
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
  }

  global.onLinkedInAuth = function() {
    IN.API.Profile().ids('me').fields('email-address', 'interests', 'skills',
      'three-past-positions', 'first-name', 'headline', 'picture-url').result(setupLinkedInProfile);
    // Once they login with LinkedIn, show result view.
    new SearchResultView();
  }

  var centerGoogleMaps = function(lat, lng) {
    map.setOptions({
      center: { lat: lat, lng: lng },
      zoom: 15,
      draggable: true,
      zoomControl: true,
      scrollwheel: true,
      disableDoubleClickZoom: true
    });
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
