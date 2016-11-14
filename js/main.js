var defaultMenuBackground = "#8A0808";
var restEndpoint = "/rs/";
var noConnectionTimeout = 35000;
var ajaxTimeout = 35000;

var CONSTANTS = {
    "SERVER_URL_PARAM" : "serverUrl",
    "USERNAME_PARAM"   : "username",
    "PASSWORD_PARAM"   : "password",
    "PERSON_NAME_PARAM" : "personName",
    "KEEP_ACCOUNT"     : "keepAccount"
}

initAllEventHandlers();

/**
 * Inits all handlers for a page
 */
function initAllEventHandlers() {
    addEventListeners();
    setGlobalErrorHandler();
    setGlobalAjaxHandlers();
}

/**
 * add  event listener to a page 
 */
function addEventListeners() {
    $(document).ready(function() {
        document.addEventListener("online", onOnline, false);
        document.addEventListener("offline", onOffline, false);
    });
}

/**
 * Sets the global error handler to a page
 */
function setGlobalErrorHandler() {
    console.log("Set global error handler for : " + location);
    $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
        errorMsg = getAjaxErrorMsg(event, jqXHR, ajaxSettings, thrownError);
        showErrorAlertBox(errorMsg);
        setOfflineStatLbl();
        if (jqXHR.statusText == 'timeout') {
            handleOfflineEvent();   
            recheckIfOnline(handleOnlineEvent);
        }
    });
}

function setGlobalReadyHandler() {
    console.log("Set global ready handler for : " + location);
    $(document).ready(function() {
        // hide no connection label
        $("#errorAlert").click(function() {
            $("#noConnectionAlert").hide();
        });
        
        if (cordova.platformId == "ios") {
        	  StatusBar.overlaysWebView(false);
        	  StatusBar.backgroundColorByHexString("#333");
        }
        
        if (!isInternetEnabled()) {
            console.log("The internet connectivity of the mobile device is disabled! Must enable it to work properly!");
        } else if (!isOnline()) {
            console.log("Connection to the server is lost. Will recheck it periodically! " );
            recheckIfOnline(handleOnlineEvent);
            if (langObject != undefined || langObject != null){
                showErrorAlertBox(localizeStringForKey("timeoutErr"));
                setOfflineStatLbl();
            } else {
                setLanguage().then(function(){
                    showErrorAlertBox(localizeStringForKey("timeoutErr"));
                    setOfflineStatLbl();
                });
            }
        }
    });
}

/**
 *  deviceready event fires once Cordova has fully loaded. 
 *  After the device has fired, you can safely make calls to Cordova function.
 */
function execOnDevReadyGlobal() {
    setGlobalReadyHandler();
    openDatabase();
    loadMenuBar();
}

function setLanguage() {
    //set the language based on the device's settings
    var deferred = $.Deferred();
    navigator.globalization.getPreferredLanguage(
        function (locale) {
            applyI18n(locale).then(function(){
                deferred.resolve();
            })
       },
        function () {
    	   alertMessage('Error getting language\n');
        }
     );   
    return deferred.promise();
}

/**
 * Sets the global send handler for all ajax requests
 */
function setGlobalSendHandler() {
 
  $(document).ajaxSend(function(event, jqXHR, ajaxOptions) {
      token = getLocStorageToken();
      abortRequest = false;
      
      if (token == 'undefined' || token == null) {
          $('#login-panel').panel('open');
          $.unblockUI();
          abortRequest = true;
      }
      
      if (abortRequest) {
          jqXHR.abort();
          return;
      } else {
          console.log("Request will be set with token : " + token);
          jqXHR.setRequestHeader('password-token', token);
      }
  });
}

/**
 *  show ajax loader before request
 */
function setGlobalStartHandler() {
    $(document).ajaxStart(function() {
        $.blockUI();
    });
}
 
/**
 * hide ajax loader after request
 */
function setGlobalCompleteHandler() {
    $(document).ajaxComplete(function(event, jqXHR, ajaxOptions) {
        if(ajaxOptions.suppressGlCompleted) {
            // do nothing
        } else {
            $.unblockUI();
        }
    });
}


/**
 * Sets all global ajax request handlers
 */
function setGlobalAjaxHandlers() {
    setGlobalSendHandler();
    setGlobalStartHandler();
    setGlobalCompleteHandler();
}

/**
 * 
 * Checks if the app is online or offline
 * 
 * @returns {Boolean}
 */
function isOnline() {
    var isOnline = window.sessionStorage.getItem("isOnline");

    if (isOnline == "true" || isOnline == 'undefined' ||
            isOnline == null || isOnline =='') {
        return true;
    } else {
        return false;
    }
}

/**
 * 
 * Sets isOnline parameter to the sessionStorage
 * isOnline variable must be set when the internet connection gets lost
 * due to timeout of a client request to the server for example
 * 
 * @param isOnline=true/false
 */
function setIsOnline(isOnline) {
    window.sessionStorage.setItem("isOnline", isOnline);
}


/**
 * 
 * Sets isInternetEnabled variable to the session storage
 * isInternetEnabled must be set/unset when phone's internet access gets disabled/enabled
 * e.g if the user disabled his/her 3g connectivity
 * 
 * @param isInternetEnabled
 */
function setIsInternetEnabled(isInternetEnabled) {
    window.sessionStorage.setItem("isInternetEnabled", isInternetEnabled);
}

/**
 * 
 * Gets if phone internet access is enabled(e.g airplane mode is not turned on)
 * 
 * @returns {Boolean}
 */
function isInternetEnabled() {
    var isInternetEnabled = window.sessionStorage.getItem("isInternetEnabled");
    if (isInternetEnabled == "true") {
        return true;
    } else {
        return false;
    }
}

/**
 * Called when phone's intenet access gets enabled
 */
function onOnline() {
    console.log("onOnline listener fired for location :  " + location);
    if (!isInternetEnabled()) {
        console.log("onOnline fired for : " + location + " The page will be reloaded in online mode!");
        $("#noConnectionAlert").hide();
        if(db != undefined) {
            submitAutomaticOfflineReqs().then(function(){
                //  should not reload the page when we are on "writeMessage" screen
                if(location.pathname.replace(/^.*[\\\/]/, '') != "writeMessage.html"){        
                    reloadAllWS();
                } else {
                    $("#noConnectionAlert").hide();
                }
            })
        }
    }
    setOnlineStatLbl();
    
    setIsInternetEnabled("true");
}

/**
 * Called when phone's internet access gets disabled
 */
function onOffline() {
    console.log("onOffline listener fired for location :  " + location);
   
    if (!($('#noConnectionAlert').is(':visible'))) {
        showErrorAlertBox(localizeStringForKey("AM.aeroplaneMode"));
    }
    if (isInternetEnabled()) {
        console.log("onOffline fired for : " + location + " The page will be reloaded in offline mode!");
    }
    setOfflineStatLbl();
    
    setIsInternetEnabled("false");
}

function setOnlineStatLbl() {
	$("#connectionStat").removeClass();
	$("#connectionStat").addClass( "connOnline");
	$("#connectionStat").text("online");
	
	$("#connIcon").removeClass();
	$("#connIcon").addClass( "glyphicon glyphicon-link connOnline");
}

function setOfflineStatLbl() {
	$("#connectionStat").removeClass();
	$("#connectionStat").addClass( "connOffline");
	$("#connectionStat").text("offline");
	
	$("#connIcon").removeClass();
	$("#connIcon").addClass( "glyphicon glyphicon-link connOffline");
}

/**
 * Inits all session storage vars
 */
function initSessionStorageVars() {
    //init isOnline flag. This must happen once only
    if (window.sessionStorage.getItem("isOnline")  == 'undefined' ||
            window.sessionStorage.getItem("isOnline")  == null ||
            window.sessionStorage.getItem("isOnline")  == '') {
        setIsOnline("true");
    }
}

/**
 * Gets the local storage token
 */
function getLocStorageToken() { 
    return window.localStorage.getItem("password-token");
}

/**
 * Sets the local storage token
 * 
 * @param passwordToken
 */
function setLocStorageToken(passwordToken) {
    window.localStorage.setItem("password-token", passwordToken);
}

/**
 * 
 * Checks repeatedly if the connection to the server is resumed
 * 
 * @returns
 */
function recheckIfOnline(callBack) {
    /*TODO : Due to errors related to the network plugin on jquery ready event
     we must comment checkConnection temporarily and replace it with isInternetEnabled check.
     This is a temporary fix and it should be further analyzed if this is a decent approach.
     checkConnection() exceptions  must be handled in JTM-36*/ 
     /*if (!checkConnection()) {
        return;
     }*/
    if (!isInternetEnabled()) {
        return;
    }
    serverUrl = getMethodEndpoint("isAlive");
    console.log("Execute url: " + serverUrl);
    return $.ajax({
        async: true,
        type: 'GET',
        url: serverUrl,
        timeout: ajaxTimeout,
        dataType: "text",
        cache: false,
        global: false,
        success: function(xml) {
            callBack();
            return;
        },
        error: function(xhr, textStatus, thrownError) {
            setTimeout(function() { 
                recheckIfOnline(callBack);
            }, noConnectionTimeout);
        }
    })
}

/**
 * Handles the app offline event, triggered by loss of connection to the server
 */
function handleOfflineEvent(callBack) {
    setIsOnline("false");
}

/**
 * Handles the app online event, triggered when the connection to the server is resumed
 */
function handleOnlineEvent() {
    setIsOnline("true");
 
    submitAutomaticOfflineReqs().then(function(){
        //  should not reload the page when we are on "writeMessage" screen
        if(location.pathname.replace(/^.*[\\\/]/, '') != "writeMessage.html"){
//            location.reload();  ???
            reloadAllWS();
        } else {
            $("#noConnectionAlert").hide();
        }
    })
}

/**
 * @returns {Boolean}
 */
//FIXME: in JTM-36 we need to handle exceptions thrown by this method 
function checkConnection() {
    console.log("checkConnection : navigator.connection : " + navigator.connection);
    return (navigator.connection.type != Connection.NONE);
}

/**
 * Loads the menu bar
 */
function loadMenuBar() {
    // load menuBar
    getCountOfPendingPayments().then(function(count){
        if (count == 0){
            // param. false - there isn't any pending orders
            createMenuBar(false);
            setPositionOfMenuBar(false);
        }
        else {
            createMenuBar(true);
            setPositionOfMenuBar(true);
        }
        setMenuBackground();
    });
}

function getConnectivityData () {
    var connectivityData = new Object();
    connectivityData.serverUrl=window.localStorage.getItem(CONSTANTS.SERVER_URL_PARAM);
    connectivityData.username=window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    connectivityData.password = window.localStorage.getItem(CONSTANTS.PASSWORD_PARAM);
    connectivityData.serviceEndpoint = connectivityData.serverUrl + restEndpoint;
    console.log("Trace: " + connectivityData.serviceEndpoint);
    return connectivityData;
}

function getPageTitle(pageTitle) {
    return '/ ' + localizeStringForKey(pageTitle);
}

function getLoggedUser() {
    return localizeStringForKey("loggedAs") +
        window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
}

function reportConnectionError () {
    navigator.notification.alert(String.format(localizeStringForKey("AM.reportConnErr"), getConnectivityData().serverUrl) +
        localizeStringForKey("AM.tryAgain"),"",localizeStringForKey("AT.reportConnErr"), localizeStringForKey("ok"));
}

function notificationMessage(message) {
    alertMessage(message, localizeStringForKey("info"));
}

function errorMessage(message) {
    alertMessage(message, localizeStringForKey("unexpErr"));
}

function alertMessage(message, title) {
	if(title == undefined) {
		title = "";
	}
    navigator.notification.alert(message, function doNothing(){}, title, localizeStringForKey("ok"));
}

function alertMessageCallback(message, title, callback) {
    navigator.notification.alert(message, callback, title, localizeStringForKey("ok"));
}

function getMethodEndpoint(methodName) {
    console.log("Trace: " + getConnectivityData().serviceEndpoint + methodName);
    return getConnectivityData().serviceEndpoint + methodName;
}

function getServerMethodEndpoint(serverUrl, methodName) {
    console.log(serverUrl + restEndpoint + methodName);
    return serverUrl + restEndpoint + methodName;
}

function getUsername() {
    return getConnectivityData().username;
}

function getPassword() {
    return getConnectivityData().password;
}

function encodeContract(contractNo, contractCurrency, contractLabel) {
    return "contractNo=" + encodeURIComponent(contractNo)
    + "&accCurr=" + encodeURIComponent(contractCurrency)
    + "&accLabel=" + encodeURIComponent(contractLabel);
}

function decodeContract(uriStr) {

    var uriElems = uriStr.split("?");
    if (uriElems.length > 0) {
        uriStr = uriElems[1];
    }

    var accountDetails = new Object();
    var elements = uriStr.split("&");
    for(i=0; i < elements.length; i++){
        key = elements[i].split("=")[0];
        value = elements[i].split("=")[1];
        if ("contractNo" == key) {
            accountDetails.code = decodeURIComponent(value);
        } else if ("accCurr" == key) {
            accountDetails.currency = decodeURIComponent(value);
        } else  if ("accLabel" == key) {
            accountDetails.label = decodeURIComponent(value);
        };
    }
    return accountDetails;
}

function encodeURIValue(key, value) {
    return key + "=" + encodeURIComponent(value);
}

function loadingSpinner(showOrHide) {

    console.log('loadingSpinner = ' + showOrHide);

    var interval = setInterval(function(){
        $.mobile.loading(showOrHide);
        clearInterval(interval);
    },1);
}

function decodeURIValue(uriStr, keyValue) {
    var result = "";
    var elements = uriStr.split("&");
    for(i=0; i < elements.length; i++){
        key = elements[i].split("=")[0];
        value = elements[i].split("=")[1];
        if (keyValue == key) {
            result = decodeURIComponent(value);
            break;
        };
    }
    return result;
}

function getMenuBackground() {
    var menuBackground=window.localStorage.getItem("menuBarBackground");
    if ((typeof menuBackground === "undefined") || (menuBackground == null) || (menuBackground.length <= 0))
    {
        menuBackground = defaultMenuBackground;
    }
    return menuBackground;
}

function setDefaultMenuBackground() {
    menuBackground = getMenuBackground();
    $("img.logo").css('background',menuBackground);
    $("#logo").css('background',menuBackground);
    $("#login").css('background',menuBackground);
    $("#logout").css('background',menuBackground);
    $("#closePanel").css('background',menuBackground);
    $(".ui-bar-a").css('background',menuBackground);
}

function setMenuBackground() {

    logoUrl=window.localStorage.getItem("logoUrl");
    menuBackground=getMenuBackground();
    $("img.logo").attr("src",logoUrl);
    $("img.logo").css('background',menuBackground);

    $("#logo").css('background',menuBackground);
    $("#login").css('background',menuBackground);
    $("#logout").css('background',menuBackground);
    $("#closePanel").css('background',menuBackground);
    $("#message").css('background',menuBackground);
    $("#statement").css('background',menuBackground);
    $("#refresh").css('background',menuBackground);
    $("#pending").css('background',menuBackground);
    $("#menuPanel").css('background',menuBackground);
}

function formatNbr(x) {
    result = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (result.split(".")[1]) {
        return result;
    }
    else {
        return result + ".00";
    }
}

function formatAmmount(ammount, currency) {
    result = ammount;
    if (currency != null ) {
        currencyCode = currency.toUpperCase();
        if (currencyCode == "USD") {
            result = "$" + ammount;
        } else if (currencyCode == "JPY") {
            result = "&yen;" + ammount;
        } else if (currencyCode == "EUR") {
            result = "&euro;" + ammount;
        } else if (currencyCode == "GBP") {
            result = "&pound;" + ammount;
        } else {
            result = ammount + " " + currencyCode;
        }
    }

    return result;
}

function trimParameter(value) {
    return value != null ? value.trim() : value;
}

function isVariableNull(param) {
    return ((param == null) || (typeof(param) == 'undefined') || ((typeof(param) == 'string') && param.length <= 0) || (param === undefined));
}

function isVariableNotNull(param) {
    return ((param != null) && (typeof(param) != 'undefined') && (!(typeof(param) == 'string') || param.length > 0) && (param !== undefined));
}

function isTrue(param) {
    return isVariableNotNull(param) && (((typeof(param) == 'string') && param == 'true') || (typeof(param) == 'boolean' && param));
}

function isFalse(param) {
    return isVariableNull(param) || ((typeof(param) == 'string') && param == 'false') || (typeof(param) == 'boolean' && !param);
}

function isNumber(param) {
    if ((param == null) || (param.trim() == "")) {
        return false;
    }
    return !isNaN(param);
}

function isLoggedIn() {
    var username = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    var password = window.localStorage.getItem(CONSTANTS.PASSWORD_PARAM);

    if (isVariableNull(username) || isVariableNull(password))
    {
        return false;
    }

    return true;
}

function keepSupAccessPropsInLocalStorage() {

    var serverUrl = window.localStorage.getItem(CONSTANTS.SERVER_URL_PARAM);

    if (isVariableNull(serverUrl)) {
        if (isVariableNotNull(supAccessProps.serverBackend))
        {
            window.localStorage.setItem(CONSTANTS.SERVER_URL_PARAM, supAccessProps.serverBackend);
        } else {
            alertMessageCallback(localizeStringForKey("AM.missingServerURL"),
                localizeStringForKey("AT.missingServerURL"), ExitSupplierAccessClient);
        }
    }
}

function keepAccountInLocalStorage(username, password, serverUrl, keepAccount, personName) {
    window.localStorage.setItem(CONSTANTS.USERNAME_PARAM, username);
    window.localStorage.setItem(CONSTANTS.PASSWORD_PARAM, password);
    window.localStorage.setItem(CONSTANTS.SERVER_URL_PARAM, serverUrl);
    window.localStorage.setItem(CONSTANTS.KEEP_ACCOUNT, keepAccount);
    window.localStorage.setItem(CONSTANTS.PERSON_NAME_PARAM, personName);
}

$(document).one('pageinit', function() {
    $(document).on('vclick', '#logout', function() {
        navigator.notification.confirm(localizeStringForKey("AM.logout"), 
            onConfirm, 
            localizeStringForKey("AT.logout"), [localizeStringForKey("no"), localizeStringForKey("yes")]);
    });
    function onConfirm(button) {
        if (button == 2) {
            console.log("Application exits. Cleat window.localStorage");
            var isKeepAccountTrue = isTrue(window.localStorage.getItem(CONSTANTS.KEEP_ACCOUNT));

            var username = '';
            var password = '';
            var serverUrl = '';
            var personName = '';
            var passToken = '';

            if (isKeepAccountTrue) {
                username = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
                password = window.localStorage.getItem(CONSTANTS.PASSWORD_PARAM);
                serverUrl = window.localStorage.getItem(CONSTANTS.SERVER_URL_PARAM);
                personName = window.localStorage.getItem(CONSTANTS.PERSON_NAME_PARAM);
                passToken = window.localStorage.getItem("password-token");
            }

//            window.localStorage.clear();

            if (isKeepAccountTrue) {
                console.log("Application exits, will keepAccount");
                keepAccountInLocalStorage(username, "", serverUrl, false, personName);
                
		// setLocStorageToken(passToken);
            } else {
                console.log("Application exits, will not keepAccount");
                keepAccountInLocalStorage('', '', '', false, '');
            }
            
            localStorage.removeItem(CONSTANTS.PASSWORD_PARAM);
            localStorage.removeItem("password-token");
            
            if (cordova.platformId == 'android') {
            	ExitSupplierAccessClient();
            } else if (cordova.platformId == "ios") {
            	window.location = "index.html";
            }
            
        }
    }
    $(document).on('vclick', '#statement', function() {
        if (isLoggedIn()) {
        	// fixing bug in ios version
        	if (cordova.platformId == 'ios') {
        		setTimeout(function(){ 
            		window.location = "Availability.html"; 
            	}, 350);
            } else{
            	window.location = "Availability.html"; 
            }
        } else {
            window.location = "index.html";
        }
    });

    $(document).on('vclick', '#refresh', function() {
        if (isLoggedIn()) {
            if (window.location == "Availability.html") {
                sessionStorage.setItem("caseSelected", $("#account")[0].selectedIndex);
                console.log('sessionStorage.setItem: caseSelected = ' + sessionStorage.getItem("caseSelected"));
            }
            reloadAllWS();
        } else {
            window.location = "index.html";
        }
    });

    $(document).on('vclick', '#message', function() {
        if (isLoggedIn()) {
        	// fixing bug in ios version
        	if (cordova.platformId == 'ios') {
        		setTimeout(function(){ 
            		window.location = "communication.html"; 
            	}, 350);
            } else{
            	window.location = "communication.html"; 
            }
        } else {
            window.location = "index.html";
        }
    });

    $(document).on('vclick', '#pending', function() {
        if (isLoggedIn()) {
            window.location = "offlinePmntRequests.html";
        } else {
            window.location = "index.html";
        }
    });
});

function ExitSupplierAccessClient() {
    if ("Android" == device.platform) {
        navigator.app.exitApp();
    }
}


function reloadAllWS() {
    var deferred = $.Deferred();
    if (!isOnline() || !isInternetEnabled()) {
        alertMessage(localizeStringForKey("AM.noIntConn"), localizeStringForKey("AM.offlineMode"));
        deferred.reject();
    }
    // FIXME find the way to do this without loadWS()
    else {
        console.log("starting refresh: " + currentDate());
        $.blockUI();
        suppressGlCompleted = true;
        var WSToReload = [];

        // reload all WS without this on the current page
        if(location.pathname.replace(/^.*[\\\/]/, '') == "Availability.html") {
            WSToReload = [refreshMailBox, callGetLastAssignmentInfo, callGetCallMeContractsWS, callGetLovWS, callGetContractsMsgWS];
            loadWS();
        } else if (location.pathname.replace(/^.*[\\\/]/, '') == "communication.html"){
            WSToReload = [callGetAccountInfoWS, callGetLastAssignmentInfo, callGetCallMeContractsWS, callGetLovWS, callGetContractsMsgWS];
            loadWS();
        } else if (location.pathname.replace(/^.*[\\\/]/, '') == "callMe.html"){
            WSToReload = [callGetAccountInfoWS, refreshMailBox, callGetLastAssignmentInfo, callGetLovWS, callGetContractsMsgWS];
            loadWS();
        } else if (location.pathname.replace(/^.*[\\\/]/, '') == "lastAF.html"){
            WSToReload = [callGetAccountInfoWS, refreshMailBox, callGetCallMeContractsWS, callGetLovWS, callGetContractsMsgWS];
            loadWS();
        } else if (location.pathname.replace(/^.*[\\\/]/, '') == "writeMessage.html"){
            WSToReload = [callGetAccountInfoWS, refreshMailBox, callGetLastAssignmentInfo, callGetCallMeContractsWS, callGetLovWS];
            loadWS();            
        } else {
            WSToReload = [callGetAccountInfoWS, refreshMailBox, callGetLastAssignmentInfo, callGetCallMeContractsWS, callGetLovWS, callGetContractsMsgWS];
            $.when(WSToReload[0](), WSToReload[1](), WSToReload[2](), WSToReload[3](), WSToReload[4](), WSToReload[5]())
            .then(function () {
                $.unblockUI();
                console.log("update-a zavarshi: "  + currentDate());
                location.reload();           
            })
            .fail(function(WSEerr0, WSEerr1, WSEerr2, WSEerr3, WSEerr4, WSEerr5) {
                console.log("WSEerr0: " + WSEerr0 + " WSEerr1: " + WSEerr1 + " WSEerr2: " + WSEerr2 + " WSEerr3 : " +  WSEerr3 + " WSEerr4: " + WSEerr4 + " WSEerr5: " + WSEerr5);
                $.unblockUI();
                alertMessage("refresh fail", "Test alert");
                location.reload();
                deferred.resolve();
            });
        }

        function loadWS() {
            $.when(WSToReload[0](), WSToReload[1](), WSToReload[2](), WSToReload[3](), WSToReload[4]())
            .then(function () {
                $.unblockUI();
                console.log("update-a zavarshi: "  + currentDate());
                location.reload();           
            })
            .fail(function(WSEerr0, WSEerr1, WSEerr2, WSEerr3, WSEerr4) {
                console.log("WSEerr0: " + WSEerr0 + " WSEerr1: " + WSEerr1 + " WSEerr2: " + WSEerr2 + " WSEerr3 : " +  WSEerr3 + " WSEerr4: " + WSEerr4 );
                $.unblockUI();
                alertMessage("refresh fail", "Test alert");
                location.reload();
                deferred.resolve();
            });
        }
    }
    return deferred.promise();
}

/**
 * Create Menu Bar
 * @param hasPendingReq
 */
function createMenuBar(hasPendingReq) {
    var menuContainer = document.createElement("div");    
    $(menuContainer).attr({"data-role": "header", "class": "menu", "data-position": "fixed"});
    
    var menuBar = document.createElement("div");
    menuBar.setAttribute("class","ui-grid-e center");
    
    createMenuPanelBtn(menuBar);
    createIMXLogo(menuBar);
    createOnlainStatLbl(menuBar);
    createRefreshBtn(menuBar);
    
    menuContainer.appendChild(menuBar);
    
    var menu = document.getElementById("menuBar");
    menu.appendChild(menuContainer);
    
    if (isOnline() && isInternetEnabled()){
		setOnlineStatLbl();
	} else {
		setOfflineStatLbl();
	}
}

/**
 * reload Menu 
 */
function reloadMenu() {
    var menuContainer = document.createElement("div");    
    $(menuContainer).attr({"data-role": "header", "class": "menu", "data-position": "fixed"});
    
    var menuBar = document.createElement("div");
    menuBar.setAttribute("class","ui-grid-e center");
    
    createMenuPanelBtn(menuBar);
    createIMXLogo(menuBar);
    createOnlainStatLbl(menuBar);
    createRefreshBtn(menuBar);
    
    menuContainer.appendChild(menuBar);
    
    var menu = document.getElementById("menuBar");
    var oldMenu = $(".menu")[0];
    menu.replaceChild(menuContainer, oldMenu);
    
    if (isOnline() && isInternetEnabled()){
		setOnlineStatLbl();
	} else {
		setOfflineStatLbl();
	}
}

/**
 * creates a button named MenuPanel. it opens a detailed menu
 * @param menuBar
 */
function createMenuPanelBtn(menuBar) {
    var menuPanelBtn = document.createElement("div");
    menuPanelBtn.setAttribute("id","menuPanel");
    menuPanelBtn.setAttribute("class","ui-block-a");
    
    var menuPanelLink = document.createElement("a");
    menuPanelLink.setAttribute("href", "#menu-panel");
    menuPanelLink.setAttribute("class","ui-btn ui-btn-b ui-corner-all ui-icon-bars ui-btn-icon-notext ui-btn-inline open left");
    
    menuPanelBtn.appendChild(menuPanelLink);    
    menuBar.appendChild(menuPanelBtn);
}



function createIMXLogo(menuBar) {
	var logoContainer = document.createElement("div");
	logoContainer.setAttribute("id","dashboardLogoContainer");
	logoContainer.setAttribute("class","ui-block-b");
	
	var dashboardLogo = document.createElement("img");
	dashboardLogo.setAttribute("id","dashboardLogoImg");
	
	dashboardLogo.src = "css/images/iMX_logo_72x27.png";
	dashboardLogo.setAttribute("alt", "imxLogo");
	
	logoContainer.appendChild(dashboardLogo);
	menuBar.appendChild(logoContainer);
}

function createOnlainStatLbl(menuBar) {
	var statusContainer = document.createElement("div");
	statusContainer.setAttribute("id","statusContainer");
	statusContainer.setAttribute("class","ui-block-c");
	
	var connIcon = document.createElement("span");
	connIcon.setAttribute("class","glyphicon glyphicon-link");
	connIcon.setAttribute("id","connIcon");
	
	
	var onlineStat = document.createElement("span");
//	onlineStat.setAttribute("class", "onlineStat");
	onlineStat.setAttribute("id","connectionStat");
	var onlineStatTxt = document.createTextNode("online");
	onlineStat.appendChild(onlineStatTxt);
	
	statusContainer.appendChild(connIcon);
	statusContainer.appendChild(onlineStat);
	
	menuBar.appendChild(statusContainer);
}


// OLD MENU BAR

/**
 * creates a button named message. it redirects the page to communication screen
 * @param menuBar
 */
function createMessageBtn(menuBar) {
    var messageBtn = document.createElement("div");
    messageBtn.setAttribute("id","message");
    messageBtn.setAttribute("class","ui-block-b");
    
    var messageLink = document.createElement("a");
    messageLink.setAttribute("class","ui-btn ui-btn-b ui-corner-all ui-icon-mail ui-btn-icon-notext ui-btn-inline");
    
    messageBtn.appendChild(messageLink);    
    menuBar.appendChild(messageBtn);
}

/**
 * creates a button named Statement. it redirects the page to main screen
 * @param menuBar
 */
function createStatementBtn(menuBar) {
    var statementBtn = document.createElement("div");
    statementBtn.setAttribute("id","statement");
    statementBtn.setAttribute("class","ui-block-c");
    
    var statementLink = document.createElement("a");
    statementLink.setAttribute("class","ui-btn ui-btn-b ui-corner-all ui-icon-action ui-btn-icon-notext ui-btn-inline");
    
    statementBtn.appendChild(statementLink);    
    menuBar.appendChild(statementBtn);
}

/**
 * create Refresh button
 * @param menuBar
 */
function createRefreshBtn(menuBar) {
    var refreshBtn = document.createElement("div");
    refreshBtn.setAttribute("id","refresh");
    refreshBtn.setAttribute("class","ui-block-d");
    
    var refreshLink = document.createElement("a");
    refreshLink.setAttribute("class","ui-btn ui-btn-b ui-corner-all ui-icon-recycle ui-btn-icon-notext ui-btn-inline");
    
    refreshBtn.appendChild(refreshLink);    
    menuBar.appendChild(refreshBtn);
}  

/**
 * creates a button named Pending. it redirects the page to offline screen
 * @param menuBar
 */
function createPendingBtn(menuBar) {
    var pendingBtn = document.createElement("div");
    pendingBtn.setAttribute("id","pending");
    pendingBtn.setAttribute("class","ui-block-e");
    
    var pendingLink = document.createElement("a");
    pendingLink.setAttribute("class","ui-btn ui-btn-b ui-corner-all ui-icon-pending ui-btn-icon-notext ui-btn-inline");
    
    pendingBtn.appendChild( pendingLink);    
    menuBar.appendChild(pendingBtn);
}

/**
 * create Logout button
 * @param menuBar
 */
function createLogoutBtn(menuBar) {
    var logoutBtn = document.createElement("div");
    logoutBtn.setAttribute("class","ui-block-f");
    logoutBtn.setAttribute("id","logout");
    
    var logoutLink = document.createElement("a");
    logoutLink.setAttribute("class","ui-btn ui-btn-b ui-corner-all ui-icon-power ui-btn-icon-notext ui-btn-inlin");
    
    logoutBtn.appendChild(logoutLink);    
    menuBar.appendChild(logoutBtn);
}



/**
 * set position of menu bar according to number of buttons 
 * @param hasPendingReq
 */
function setPositionOfMenuBar(hasPendingReq) {    	
	$(".ui-grid-e>.ui-block-a").css({"width": "20%"});
	$(".ui-grid-e>.ui-block-b").css({"width": "35%"});
	$(".ui-grid-e>.ui-block-c").css({"width": "25%"});
	$(".ui-grid-e>.ui-block-d").css({"width": "10%"});
	$(".ui-grid-e>.ui-block-f").css({"width": "10%"});
	document.getElementById('pending').style.pointerEvents = 'auto'; 
}

/**
 * block UI & show spenner  /unBlock UI
 * example: $.blockUI('some msg');  $.unblockUI();
 */
(function($) {
    $.extend({
        blockUI: function(content){
            var textVisible = true;

            if(content == undefined) {
                textVisible = false;
            }
            if ($("#uiLockId")[0] == undefined) {
                $('<div></div>').attr('id', 'uiLockId').css({
                    'position': 'fixed',
                    'top': '0',
                    'left': '0',
                    'z-index': 1000,
                    'opacity': 0.1,
                    'width':'100%',
                    'height':'100%',
                    'background-color':'black'
                }).html('').appendTo('body');
                $.mobile.loading( "show", {
                    text: content,
                    textVisible: textVisible,
                    theme: "a",
                    html: ""
                });
            }
        },
        unblockUI: function(){
            $('#uiLockId').remove();
            $.mobile.loading("hide");
        }
    });
})(jQuery);

/** 
 * provides a way to write string with format:
 * example (String.format('You have {0} more pending orders. {1} ', var1, var2))
 * {0} match va1 ; {1}  match var2
 */ 
if (!String.format) {
    String.format = function(format) {
      var args = Array.prototype.slice.call(arguments, 1);
      return format.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined'
          ? args[number] 
          : match
        ;
      });
    };
  }

/**
 * @returns current date
 */
function currentDate() {
    var currentDate;
    var d = new Date();
    var curr_date = d.getDate();
    var curr_month = d.getMonth() + 1; //Months are zero based
    var curr_year = d.getFullYear();
    var curr_hour = d.getHours();
    var curr_min = d.getMinutes();
    var curr_sec = d.getSeconds();   
    var curr_millisec = d.getMilliseconds();

    if (curr_date < 10 ) {curr_date = "0" + curr_date;} 
    if (curr_month < 10) {curr_month = "0" + curr_month;} 
    if (curr_hour < 10 ) {curr_hour = "0" + curr_hour;}
    if (curr_min < 10 ) {curr_min = "0" + curr_min;}    
    if (curr_sec < 10 ) {curr_sec = "0" + curr_sec;}    
    if (curr_millisec < 10) {
        curr_millisec = "00" + curr_millisec;
    } else if (curr_millisec > 10 && curr_millisec < 100){
        curr_millisec = "0" + curr_millisec;
    }

    currentDate = (curr_date + "-" + curr_month + "-" + curr_year + " " + curr_hour + ":" + curr_min + ":" + 
            curr_sec + "." + curr_millisec);
    return currentDate;
}

