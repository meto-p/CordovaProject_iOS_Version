var loginPanel = 
    "   <div data-role='panel' data-position='right' data-position-fixed='true' data-display='overlay' data-theme='a' id='login-panel'> " +
    "       <div class='ui-grid-a center' style='height:2.8em'> " +
    "           <div class='ui-block-a' style='height:2.8em' id='logo'>  " +
    "               <img  style='height:2.8em; width:10em' src='css/images/logo.png' alt='Logo' class='logo'/>" +
    "           </div> " +
    "           <div class='ui-block-b' style='height:2.8em' id='closePanel'>" +
    "              <a href='#' data-rel='close' class='ui-btn ui-btn-b ui-corner-all ui-icon-delete ui-btn-icon-notext ui-btn-inline'>Close</a>" +
    "           </div> " +
    "       </div> " +
    "       <div class='title languageHTML' data-text='loginAcc'> </div> "  +
    "       <form id='loginForm'> " +
    "           <div data-role='ui-field-contain'> " +
    "               <label class='languageHTML' for='username' data-text='loginLbl'></label> " +
    "               <input type='text' name='username' id='username' value=''/> " +
    "           </div> " +
    "           <div data-role='ui-field-contain'> " +
    "               <label class='languageHTML' for='password' data-text='passLbl'></label> " +
    "               <input type='password' name='password' id='password' value=''/> " +
    "           </div> " +
    "               <label class='languageHTML' for='keepAccount' data-text = 'rememberAccLbl'></label> " +
    "               <input type='checkbox' name='keepAccount' id='keepAccount' data-iconpos='right'/> " +
    "               <button id='submitLoginPage' class='languageHTML' type='button' data-role='button' data-text='loginBtn' > </button> " +
    "         </form> " +
    "   </div>";




$(document).one('pageinit', function() {

    console.log("LoginPanel pageinit ");

    var keepAccount = window.localStorage.getItem(CONSTANTS.KEEP_ACCOUNT);
    if (isTrue(keepAccount)) {
        $("input#keepAccount").prop("checked", true).checkboxradio("refresh");
    } else {
        $("input#keepAccount").prop("checked", false).checkboxradio("refresh");
    }

    var currentUsername = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    console.log("currentUsername: " + currentUsername);
    
    var currentPass = window.localStorage.getItem(CONSTANTS.PASSWORD_PARAM);
    console.log("currentPass: " + currentPass);
    
    $('input#username').val(currentUsername);    
//    if (isVariableNotNull(currentPass)) {
//        if (document.getElementById("keepAccount").checked) {
//            $('input#password').val(currentPass);
//        }
//        else {
//            $('input#password').val('');
//        }
//    };

    $(document).on('vclick', '#submitLoginPage', function() {
        $('#login-panel').panel('close');
        
        keepSupAccessPropsInLocalStorage();
        var serverUrl = window.localStorage.getItem(CONSTANTS.SERVER_URL_PARAM);

        var username = trimParameter($('input#username').val());
        var password = trimParameter($('input#password').val());
        var serverUrl = supAccessProps.serverBackend;

        var serverMethod = getServerMethodEndpoint(serverUrl, "login");

        console.log('Execute url: ' + serverMethod + ' for ' + username);
        $.ajax({
            async: true,
            type: 'post',
            url: serverMethod,
            data: {
                login: trimParameter(username),
                password: trimParameter(password)
            },
            dataType: 'xml',
            cache: false,
            global: false,
            timeout: ajaxTimeout,
            success: function(response, status, xhr) {
                $(response).find('LoginResult').each(function() {
                    result = $(this).find('result').text();                  
                    passwordToken = $(this).find('token').text();
                    if (passwordToken != null && passwordToken !='') {
                        setLocStorageToken(passwordToken);
                    }                    
                    personName = $(this).find('name').text();
                    console.log('LoginResult: ' + result);
                    if (result == 1) {
                        // TODO we keep account in local storage only in
                        // preparation for migration to token and two-way SSL
                        // writeAccount();
                        
                        createUserLogin(username, personName).then(function(){
                            keepAccountInLocalStorage(username, password, serverUrl, $("input#keepAccount").is(':checked'), personName);
                            reloadAllWS().then(function(){
                                // reload LOVs
                                $('#login-panel').panel('close');
                              //  if (location.pathname.replace(/^.*[\\\/]/, '') == "index.html"){
                              //      location.reload();
                              //  }
                                
                            })
                        })
                    } else {
                        // wrong account, clear form and storage, wait for real one
                        if (isVariableNotNull(username)) {
                            $('input#username').val(username);
                        }
                        $('input#password').val('');
                        keepAccountInLocalStorage(username, '', serverUrl, false, '');

                        if (result == 2) {
                            console.log("No such login in the database " + username);
                            alertMessage(localizeStringForKey("AM.noSuchLogin"), localizeStringForKey("AT.noSuchLogin"));
                            $('#login-panel').panel('open');
                        } else if (result == 3) {
                            console.log('The passwords do not match for ' + username);
                            alertMessage(localizeStringForKey("AM.wrongPass"), localizeStringForKey("AT.wrongPass"));
                            $('#login-panel').panel('open');
                        } else if (result == 4) {
                            console.log("Account is blocked " + username);
                            alertMessage(localizeStringForKey("AM.blockedLogin"), localizeStringForKey("AT.blockedLogin"));
                            $('#login-panel').panel('open');
                        } else {
                            console.log('Unknown result code: ' + result);
                            errorMessage(localizeStringForKey("AM.UnknownResCode") + result);
                            $('#login-panel').panel('open');
                        }
                    }
                });
            },
            beforeSend: function(XMLHttpRequest) {
                $.blockUI('');
            },
            complete: function(XMLHttpRequest, textStatus) {
                $.unblockUI();
            },
            error: function(xhr, textStatus, thrownError) {
                console.log("Login Error: " + textStatus + " " + thrownError);
                var err = getAjaxErrorMsg('event', xhr, textStatus, thrownError)
                alertMessage(err);
                $('#login-panel').panel('open');
		//   alertMessage(localizeStringForKey("timeoutErr"));
            }
        });
        return false;
    });
});


//hide keyboard by pressing "go" button
$(document).ready(function() {
    $('input#username').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);

        if ((code == 13) || (code == 10)) {
            $("#password").focus();
        }
    });

    $('#password').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);

        if ((code == 13) || (code == 10)) {
            $(this).blur();
            $('#submitLoginPage').trigger('click');            
        }
    });
});
