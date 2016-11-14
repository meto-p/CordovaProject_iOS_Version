function execLastAFOnDevReady() {
    setLanguage().then(function(){
        $("#pageTitle").html(getPageTitle('lastAF'));
        $(".loggedUser").html(getLoggedUser());
        setMenuBackground();
        loadLAPage();
    })
}

/**
 * Loads the LastAssignment page
 */
function loadLAPage() {

    //Put button links
    $("#backButton").click(function(){
        window.location="Availability.html";
    })


    //Get data - plug in webservice
    contract = decodeContract(document.URL);
    contractNo = contract.code;
    contractLabel = contract.label;

    $("#callMeButton").click(function(){
        window.location = "callMe.html?" +
        encodeContract(contractNo, "", contractLabel);
    })


    if (isOnline() && isInternetEnabled()) {
        callGetLastAssignmentWS(contractNo)
    } else {
        //if offline init the interface from the mobile db
        getLastAssignment(contractNo, getUsername(), initLAOfflineData);
    }
}

/**
 * 
 * Calls the getLastAssignment web service
 * 
 * @param contractNo
 */
function callGetLastAssignmentWS(contractNo) {
    if (contractNo == undefined) {
        contract = decodeContract(document.URL);
        contractNo = contract.code;
    }
    
    serverUrl = getMethodEndpoint("getLastAssignment");
    username = getUsername();
    $.ajax({
        async : true,
        type : "post",
        url: serverUrl,
        data: {login: trimParameter(username), refDoss: trimParameter(contractNo)},
        dataType: "xml",
        cache: false,
        beforeSend: function(XMLHttpRequest){
        },
        complete: function (XMLHttpRequest, textStatus) {
        },
        success:function(xml) {
            callback(xml);
        },
        error: function (xhr, textStatus, thrownError) {                   		
        }
    })

    function callback(xml) {
        AFRef="";
        AFTo="";
        AFAmount="";
        AFCurrency="";
        AFDate="";
        AFStatus="";
        var result;

        //parse xml
        $(xml).find('LastAssignment').each(function() {
            AFRef = $(this).find('afReference').text();
            AFTo = $(this).find('to').text();
            AFAmount = $(this).find('amount').text();
            AFCurrency = $(this).find('currency').text();
            AFDate = $(this).find('receivedDate').text();
            AFStatus = $(this).find('status').text();
            result = parseInt($(this).find('result').text());
        })

        //insert the latest LastAssignment data and remove garbage records if any
        deleteSingleLastAssignment(trimParameter(username), trimParameter(contractNo)).then(function(){
            createLastAssignment(trimParameter(contractNo), trimParameter(username), AFRef, AFTo, AFAmount, AFCurrency, AFDate, AFStatus, result);
        })
        deleteUnreferencedLARows(trimParameter(username), trimParameter(contractNo))
        initLAUI(AFRef, AFTo, AFAmount, AFCurrency, AFDate, AFStatus, result);
    }
}

/**
 * 
 * Populates the LastAssignment screen in offline mode
 * 
 * @param lastAssignment
 */
function initLAOfflineData(lastAssignment) {
    AFRef = lastAssignment.afReference;
    AFTo = lastAssignment.refTo;
    AFAmount = lastAssignment.amount;
    AFCurrency = lastAssignment.currency;
    AFDate = lastAssignment.dateReceived;
    AFStatus = lastAssignment.status;
    result = lastAssignment.result;

    //init the interface
    initLAUI(AFRef, AFTo, AFAmount, AFCurrency, AFDate, AFStatus, result);
}

/**
 * 
 * Inits the LastAssignment itnerface
 * 
 * @param result
 */
function initLAUI(AFRef, AFTo, AFAmount, AFCurrency, AFDate, AFStatus, result) {
    switch (result) {
    case 1:
        //Plug-in values
        $("#AFref").html(AFRef);
        $("#AFto").html(AFTo);
        $("#AFamount").html(formatAmmount(formatNbr(AFAmount), AFCurrency));
        $("#AFdate").html(AFDate);

        //Put status
        if(AFStatus!="OK"){
            $("#AFstatus").addClass("notOkStatus");
        }

        $("#AFstatus").html(AFStatus);
        break;
    case 7:
        $("#AFstatus").html(localizeStringForKey("noLastAssig"));
        break;
    default:
        $("#AFstatus").html(localizeStringForKey("accTempBlocked"));
    $("#AFstatus").addClass("notOkStatus");
    }
}

