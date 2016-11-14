$(document).on(
  'mobileinit',
  function()
  {
    // Bypass Access-Control-Allow-Origin
    $.support.cors = true;
    $.mobile.allowCrossDomainPages = true;
  }
);