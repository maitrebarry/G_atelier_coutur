(function () {
  function stripTrailingSlash(value) {
    return value ? value.replace(/\/+$/, '') : value;
  }

  function isDefined(value, placeholder) {
    return Boolean(value) && value !== placeholder;
  }

  var defaultOrigin;
  if (window.location.hostname === 'localhost') {
    defaultOrigin = 'http://localhost:8081';
  } else {
    defaultOrigin = window.location.origin || '';
  }

  var rawApi = "%REACT_APP_API_BASE_URL%";
  var rawApiLocal = "%REACT_APP_API_BASE_URL_LOCAL%";
  var rawMedia = "%REACT_APP_MEDIA_BASE_URL%";
  var rawMediaLocal = "%REACT_APP_MEDIA_BASE_URL_LOCAL%";

  var resolvedApi = isDefined(rawApi, "%REACT_APP_API_BASE_URL%")
    ? rawApi
    : (isDefined(rawApiLocal, "%REACT_APP_API_BASE_URL_LOCAL%")
        ? rawApiLocal
        : defaultOrigin ? defaultOrigin.replace(/\/+$/, '') + '/api' : '');

  var resolvedMedia = isDefined(rawMedia, "%REACT_APP_MEDIA_BASE_URL%")
    ? rawMedia
    : (isDefined(rawMediaLocal, "%REACT_APP_MEDIA_BASE_URL_LOCAL%")
        ? rawMediaLocal
        : defaultOrigin);

  window.APP_CONFIG = Object.assign({}, window.APP_CONFIG, {
    API_BASE_URL: stripTrailingSlash(window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || stripTrailingSlash(resolvedApi),
    MEDIA_BASE_URL: stripTrailingSlash(window.APP_CONFIG && window.APP_CONFIG.MEDIA_BASE_URL) || stripTrailingSlash(resolvedMedia)
  });
})();
