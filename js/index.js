initSessionStorageVars();

function execOnDReadyIndex() {
    setDefaultMenuBackground();
    setLanguage().then(function(){
        openDatabase();
        // fix general bug in Cordova;
        enableForeignKeys();
        createDatabase().then(function success() {
            initLoginScreen();
        });
    });
}

function initLoginScreen() {
    // TODO we keep account in local storage only in preparation for
    // migration to token and two-way SSL
    // readAccount();
    keepSupAccessPropsInLocalStorage();
//    createUserSettings();
    
    var selectedLanguage = window.localStorage.getItem("selectedLanguage"); 
    if(selectedLanguage == "fr") {
      $('#selectLanguage').val('fr');
      $('select').selectmenu("refresh", true);
    }

    getAspects();

    username = getUsername();
    password = getPassword();
    
    $("#selectLanguage").change(function() {
        var selectedLanguage = $("#selectLanguage").val();
        window.localStorage.setItem("selectedLanguage",selectedLanguage); 
        setLanguage();
    });

    // issue with net access, wait for new account or clear connection
    if (isVariableNull(username) || isVariableNull(password)) {
        alertMessage(localizeStringForKey("AM.noSuchAccount"), localizeStringForKey("AT.noSuchAccount"));
        $('#login-panel').panel('open');
        return;
    }

    serverUrl = getMethodEndpoint("login");

    console.log("login  in index.js");
    console.log("Execute url: " + serverUrl + " for username " + username);
    $.ajax({
        async: true,
        type: "post",
        url: serverUrl,
        data: {
            login: trimParameter(username),
        },
        dataType: "xml",
        cache: false,
        timeout: ajaxTimeout,
        success: function(response) {
            $(response).find('LoginResult').each(function() {
                result = $(this).find('result').text();
                personName = $(this).find('name').text();
                console.log("LoginResult: " + result);
                if (result == 1) {
                    window.location = "dashboard.html";
                } else if (result == 2) {
                    alertMessage(localizeStringForKey("AM.noSuchLogin"), localizeStringForKey("AT.noSuchLogin"));
                    $('#login-panel').panel('open');
                } else if (result == 3) {
                    alertMessage(localizeStringForKey("AM.wrongPass"), localizeStringForKey("AT.wrongPass"));
                    $('#login-panel').panel('open');
                } else if (result == 4) {
                    alertMessage(localizeStringForKey("AM.blockedLogin"), localizeStringForKey("AT.blockedLogin"));
                    $('#login-panel').panel('open');
                } else {
                	$('#login-panel').panel('open');
                }
            });
        },
        beforeSend: function(XMLHttpRequest) {
        },
        complete: function(XMLHttpRequest, textStatus) {
        },
        error: function(xhr, textStatus, thrownError) {
            if (isLoggedIn()){
                window.location = "dashboard.html";
            }
        }
    });
}

function getAspects() {

    serverUrl = getMethodEndpoint("getAspects");

    console.log("Execute url: " + serverUrl);
    $.ajax({
        async : true,
        type : 'get',
        url: serverUrl,
        timeout: ajaxTimeout,
        global: false,
        dataType: "xml",
        cache: false,
        success:function(xml) {
            callback(xml);
        },
        beforeSend: function(XMLHttpRequest){
        },
        complete: function (XMLHttpRequest, textStatus) {
        },
        error: function (xhr, textStatus, thrownError) {
            setDefaultMenuBackground();
        }
    })

    function callback(xml){
        $(xml).find('Aspect').each(function() {

            cssLastChange=$(this).find('cssLastChange').text();
            defaultFont=$(this).find('defaultFont').text();
            defaultFontColor=$(this).find('defaultFontColor').text();
            logoLastChange=$(this).find('logoLastChange').text();
            logoUrl=$(this).find('logoUrl').text();
            menuBarBackground=$(this).find('menuBarBackground').text();
            messageBtnLastChange=$(this).find('messageBtnLastChange').text();
            messageBtnUrl=$(this).find('messageBtnUrl').text();
            statementBtnLastChange=$(this).find('statementBtnLastChange').text();
            statementBtnUrl=$(this).find('statementBtnUrl').text();
            result=$(this).find('result').text();

            serverUrl = getConnectivityData().serverUrl;

            //log data to console
            console.log("cssLastChange: " + cssLastChange);
            console.log("defaultFont: " + defaultFont);
            console.log("defaultFontColor: " + defaultFontColor);
            console.log("logoLastChange: " + logoLastChange);
            console.log("logoUrl: " + serverUrl + '/' + logoUrl);
            console.log("menuBarBackground: " + menuBarBackground);
            console.log("messageBtnLastChange: " + messageBtnLastChange);
            console.log("messageBtnUrl: "+ serverUrl + '/'   + messageBtnUrl);
            console.log("statementBtnLastChange: " + statementBtnLastChange);
            console.log("statementBtnUrl: "+ serverUrl + '/'   + statementBtnUrl);
            console.log("result: " + result);

            //set variable local storage
            window.localStorage.setItem("cssLastChange",cssLastChange);
            window.localStorage.setItem("defaultFont",defaultFont);
            window.localStorage.setItem("defaultFontColor",defaultFontColor);
            window.localStorage.setItem("logoLastChange",logoLastChange);
            window.localStorage.setItem("logoUrl", serverUrl + '/'  + logoUrl);
            window.localStorage.setItem("menuBarBackground",menuBarBackground);
            window.localStorage.setItem("messageBtnLastChange",messageBtnLastChange);
            window.localStorage.setItem("messageBtnUrl", serverUrl + '/'  + messageBtnUrl);
            window.localStorage.setItem("statementBtnLastChange",statementBtnLastChange);
            window.localStorage.setItem("statementBtnUrl", serverUrl + '/'  + statementBtnUrl);
        })
        setMenuBackground();
    }
}
