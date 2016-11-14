/**
 * @param errorMesage
 */
function showErrorAlertBox(errorMesage) {
    $("#noConnectionAlert").remove();
    if (errorMesage == undefined) {
        errorMesage = "undefined error";
    }
    var alert = document.createElement("div");
    alert.setAttribute("id", "noConnectionAlert");
    
    var closeButton = document.createElement("span");
    closeButton.setAttribute("class", "alertCloseButton");
    closeButton.setAttribute("aria-label", "close");
    var closeSymbol = (String.fromCharCode(10006));
    var closeButtonValue = document.createTextNode(closeSymbol);
    closeButton.appendChild(closeButtonValue);

    var alertParagraph = document.createElement("span");
    var alertValue = document.createTextNode(errorMesage);
    alertParagraph.appendChild(alertValue);

    alert.appendChild(closeButton);
    alert.appendChild(alertParagraph);

    var showAlert = document.getElementById("errorAlert");
    if (showAlert != null || showAlert != undefined){
        showAlert.appendChild(alert);
    } else {
    	alertMessage(alertValue);
    }

    $("#noConnectionAlert").slideDown("slow");
}


/**
 * @param code  //event, jqXHR, ajaxSettings, thrownError
 */
function getAjaxErrorMsg(event, jqXHR, settings, thrownError) {
    var message;
    //the most common HTTP errors (approximately 95% of cases)
    var statusErrorMap = {
        '400': localizeStringForKey("statErr400"),
        '401': localizeStringForKey("statErr401"),
        '403': localizeStringForKey("statErr403"),
        '404': localizeStringForKey("statErr404"),
        '500': localizeStringForKey("statErr500"),
        '501': localizeStringForKey("statErr501"),
        '502': localizeStringForKey("statErr502"),
        '503': localizeStringForKey("statErr503"),
    };
    if (jqXHR.status) {
        message = statusErrorMap[jqXHR.status];
        // if the http error code is not listed above
        if ( !message) {
            message = localizeStringForKey("unknownErr");
        }
    } else if (thrownError == 'parsererror') {
        message = localizeStringForKey("parserErr");
    } else if (thrownError == 'timeout') {
        message = localizeStringForKey("timeoutErr");
    } else if (thrownError == 'abort') {
        message = localizeStringForKey("abortErr");
    } else {
        message = localizeStringForKey("unknownErr");
    }
    return message;
}