jQuery.cookie = function (name, value, options) {
    if (typeof value != 'undefined') {
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString();
        }
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};

(
  function(global) {
    var GeoCheck = function () {
      this.params = global.location.search.slice(1).split("&");
      this.cookie_name = 'country_code';
      // The default expiration cookie is 30 days
      this.exdays = { expires: 30 };  // set expiration cookie to 30 days
      this.country_code = $.cookie(this.cookie_name)
      return this
    };

    GeoCheck.prototype.getURLParameter = function (param) {
      var i = 0, output;
      for (i; i < this.params.length; i++) {
        var splitParams = this.params[i].split("=");
        if(splitParams.length === 2 && splitParams[0] === param) {
          return output = splitParams[1];
        }
      }
      return output;
    };

    GeoCheck.prototype.cid_if_present_in_url = function (){
      var cid_param = this.getURLParameter('cid');
      if (cid_param) {
        cid_param = "&cid=" +cid_param;
      }
      return cid_param || ""
    };

    // data hash params data passing to /srv_check_geo_ip web service to get
    // country code and redirect url, for a given ip and url
    // For testing purpose, force_ip can be set as params input arguments
    GeoCheck.prototype.get_geo_ip_data_hash = function (country_code) {
      var data_hash = {
          ip: this.getURLParameter("force_ip"),
          url: this.getURLParameter("force_url"),
        }, check;
      for (check in data_hash) {
        if (data_hash.hasOwnProperty(check)) {
          if (!data_hash[check]) {
            delete data_hash[check];
          }
        }
      }
      return data_hash;
    }

    GeoCheck.prototype.get_geourl_for_pricing_page_hash = function (country_code) {
      var pricing_page_data_hash = {
          "AU":'http://www.intuit.com.au/g/pricing/querystring',
          "BR":'http://www.quickbooks.com.br/quickbooks-advanced/querystring#pricing',
          "CA":'http://quickbooks.intuit.ca/accounting-software/quickbooks-online-accounting/buy-quickbooks-sale/querystring',
          "FR":'http://quickbooks.intuit.fr/les-offres-quickbooks/querystring',
          "GB":'https://www.quickbooks.co.uk/g/pricing/querystring',
          "IN":'http://www.quickbooks.in/qbhome/querystring'
        },
        query_partner = this.getURLParameter("partner_uid"),
        final_url = null;
      if (query_partner) {
        final_url = pricing_page_data_hash[country_code].replace("querystring","?partner_uid=" + query_partner + this.cid_if_present_in_url());
      }
      return final_url;
    }

    GeoCheck.prototype.check_for_us_pricing_path = function(){
      return global.location.href.match(/quickbooks\.intuit\.com\/online/i) ;
    }

    // - If the user chooses to stay on the US site by clicking 'No Thanks', set a cookie (country_code=US) to remember
    // the user's preference of site and do not show the IP redirection on subsequent visits.
    GeoCheck.prototype.noThanksCallback = function () {
      $.cookie(this.cookie_name, 'US', this.exdays);
      $.modal.close();
      $('body').removeClass("modal-open");
    }

    // - If the user chooses to go to the local site by clicking 'Go to Site' button, set a cookie (country_code=CA, CA
    // is an example of a local country code) to remember the user's preference of
    // site and always send them to that domain on subsequent visits.
    GeoCheck.prototype.goToSiteCallback = function () {
      $.cookie(this.cookie_name, this.country_code, this.exdays);
      var finalurl = this.get_geourl_for_pricing_page_hash(this.country_code);
      if (this.check_for_us_pricing_path() && finalurl ){
        global.location.href = finalurl;
      } else {
        global.location.href = this.redirect_url;
      }
      return false;
    }

    GeoCheck.prototype.onShowCallback = function (dialog) {
      $('body').addClass("modal-open");
      dialog.container.css('height', 'auto');
      dialog.overlay.show().addClass('show');
      dialog.container.show().addClass('show');
      $('.no-thanks', dialog.data[0]).click(this.noThanksCallback);
      $('.goto-site', dialog.data[0]).click(this.goToSiteCallback.bind(this));
    }

    GeoCheck.prototype.doneCallback = function (data) {
      if (data) {
        if ((!data['country_code']) || (data['country_code'] == 'US')) {
          $.cookie(this.cookie_name, 'US', this.exdays);
        } else if(this.country_code !== 'US'){
          var country_name = data['country_name'];
          var fmt_country_name = country_name.replace(/\s+/, "").toLowerCase();
          if (data['redirect_url'] || this.get_geourl_for_pricing_page_hash(data['country_code'])) {
            if (this.country_code) {
              var finalurl = this.get_geourl_for_pricing_page_hash(this.country_code);
              if (this.check_for_us_pricing_path() && finalurl) {
                global.location.href = finalurl ;
              } else {
                global.location.href = data['redirect_url'];
              }
            }
            if (!this.country_code) {
              this.country_code = data['country_code'];
              this.redirect_url = data['redirect_url'];
              $.modal(
                "<div id='geo-ip-redirect-popup' class='simplemodal-data'><h2>Welcome to Intuit</h2><p>To check out products designed specifically for your country, please visit the "+country_name+" site.</p><div class='button'><a class='no-thanks simplemodal-close' href='#' data-wa-link='global-geoip-"+fmt_country_name+"-us'>Visit the US site​</a><a href='#'><div class='goto-site ctalarge ctaprimary' data-wa-link='global-geoip-"+fmt_country_name+"'>Take me there</div></a></div></div>",
                {
                  opacity:50,
                  overlayCss: {backgroundColor:"#000"},
                  close: false,
                  containerCss: {
                    "background-color": "#fff",
                    "borderRadius": "5px",
                    "margin": "0 auto",
                    "padding": "40px 30px",
                    "width": "500px"
                  },
                  onShow: this.onShowCallback.bind(this)
                }
              );
            }
          }
        }
      }
    }

    GeoCheck.prototype.failCallback = function (data) {
      $.cookie(this.cookie_name, null); //delete cookie
    }

    // The codes are regarding geo ip redirect pop up.
    // When a users IP is detected as a non US one, they will be presented with a pop-up.
    GeoCheck.prototype.onLoadCallback = function () {
      var country_name,
        dataHash;
      // - If the user's referrer is http://global.intuit.com/choose-country.jsp, reset cookie to null
      if (document.referrer && (document.referrer === 'http://global.intuit.com/choose-country.jsp')) {
        $.cookie(this.cookie_name, null); // reset cookie
      }
      dataHash = this.get_geo_ip_data_hash(this.country_code);
      if (this.country_code !== 'US') {
        if(dataHash.ip) {
          $.ajax({
            url: Intuit.Utils.Constants.SBGMServiceUrl + "/v1/geoip/full",
            type: "POST",
            data: dataHash,
            beforeSend: function(xhr) {
              xhr.setRequestHeader(
                "Authorization",
                Intuit.Utils.Constants.SBGMAuthKey
              );
            },
            success: this.doneCallback.bind(this),
            error: this.failCallback.bind(this)
          })
        } else {
          $.ajax({
            url: Intuit.Utils.Constants.SBGMServiceUrl + "/v1/geoip",
            type: "GET",
            beforeSend: function(xhr) {
              xhr.setRequestHeader(
                "Authorization",
                Intuit.Utils.Constants.SBGMAuthKey
              );
            },
            success: this.doneCallback.bind(this),
            error: this.failCallback.bind(this)
          })
        }
      }
    };

    global.GeoCheck = GeoCheck;
  }
)(window)

var geoClass = new GeoCheck();

$(window).load(geoClass.onLoadCallback.bind(geoClass));
