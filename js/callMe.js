var mobileCallMeReasons = null;

function execCallMeOnDevReady() {
    setLanguage().then(function(){
        $("#pageTitle").html(getPageTitle('callMeLbl'));
        $(".loggedUser").html(getLoggedUser());
        setMenuBackground();
        getContracts().then(function(contracts){
            initContractsDropDawn(contracts); 
        })
        getMobileCallMeReasons().then(function(motives){
            initMotivesDropDown(motives);
        });
        sendCallmeReq();
    });
}

function getContracts() {
    var deferred = $.Deferred();    
    var contracts = [];
    
    //Check if this is reply
    if(document.URL.split("?")[1]){
        var contract = decodeContract(document.URL);
        var contractNo = contract.code;
        var contractLabel = contract.label;

        $("#contractNo").append("<option id='"+contractNo+"' value='"+contractNo+"'>"+contractLabel+"</option>");
        $('#contractNo').selectmenu('refresh', true);
        $('#contractNo').selectmenu('disable');
    } else {
        if (!isOnline()  || !isInternetEnabled()) {
            getAllAccountDetailsByType("callMe").then(function(contracts) {
                deferred.resolve(contracts);
            });            
        } else {
            callGetCallMeContractsWS()
            .then(function(contracts){
                deferred.resolve(contracts)
            })
            .fail(function(err){
                if(err == "timeout"){
                    getAllAccountDetailsByType("callMe").then(function(contracts) {
                        deferred.resolve(contracts);
                    }); 
                } else {
                    console.log("error code: " + err);
                }
                deferred.reject(err);
            })
        }
    }
    return deferred.promise();
}

function initContractsDropDawn(contracts) {
    count = contracts.length;
    for(var i=0; i<count; i += 1){
        $("#contractNo").append("<option id='" + contracts[i] .code+ "' value='" + contracts[i].code + "'>" + contracts[i].label + "</option>");
    }
    $('#contractNo').selectmenu('refresh', true);
}

function getMobileCallMeReasons() {
    var deferred = $.Deferred();
    
    if (!isOnline() || !isInternetEnabled()) {
        getDataMapsByType("motive").then(function(motives) {
            deferred.resolve(motives);
        });

    } else {
        callGetLovWS()
        .then(function(motives){
            deferred.resolve(motives);
        })
        .fail(function(err){
            if(err == "timeout"){
                getDataMapsByType("motive").then(function(motives) {
                    deferred.resolve(motives);
                }); 
            } else {
                console.log("error code: " + err);
            }
            deferred.reject(err)
        })
    }
    return deferred.promise();
}

function initMotivesDropDown(motives) {
    var count = motives.length;
    
    if (count > 0) {
        mobileCallMeReasons = motives;
        for(var i=0; i < count; i+=1){
            if (localizeStringForKey(mobileCallMeReasons[i].key) == undefined){
                $("#motiveCall").append("<option id='"+mobileCallMeReasons[i].key+"' value='"+mobileCallMeReasons[i].key+"'>"+mobileCallMeReasons[i].value+"</option>");
            } else {
                $("#motiveCall").append("<option id='"+mobileCallMeReasons[i].key+"' value='"+mobileCallMeReasons[i].key+"'>"+localizeStringForKey(mobileCallMeReasons[i].key)+"</option>");
            }
        }
        $('#motiveCall').selectmenu('refresh', true);

    } else {
        mobileCallMeReasons = null;
    }
}

function sendCallmeReq() {
    var contractNo,
        motiveKey,
        motiveValue,
        label,
        callBody,
        phoneNo,
        username,
        name,    
        subject,
        body;
    
    $("#sendButton").click(function(){
        contractNo = $('#contractNo').val();
        motiveKey = $('#motiveCall').val();
        motiveValue = $( "#motiveCall option:selected" ).text();
        label = $( "#contractNo-button option:selected" ).text();
        callBody = $('#messageBody').val();
        phoneNo = $('#phoneNo').val();
        username = getUsername();
        name = window.localStorage.getItem(CONSTANTS.PERSON_NAME_PARAM);           
        subject = "Request for call";
        body = name + " has requested that you called him/her. The reason is " + motiveKey + ": " + callBody;

        //To be used only for clients with telephony installed
        /*
        $.ajax({
            async : false,
            type : "post",
            url: serverUrl + "createCall",
            //url: "http://nhluong.codixfr.private:8080/axis2/services/SupplierAccessWs.SupplierAccessWsHttpSoap11Endpoint/createCall",
            data: {login: trimParameter(username), password: trimParameter(password), contract: trimParameter(contractNo), motive: trimParameter(motive), subject: trimParameter(callBody), phoneNumber: trimParameter(phoneNo)},
            dataType: "text",
            cache: false,
            success:function(text) {
                $.mobile.hidePageLoadingMsg();
                processMessage(text);
            },
            error: function (xhr, textStatus, thrownError) {
                    reportConnectionError () ;
            }
        })

        function processMessage(text){
            result = parseInt(text);
            console.log(result);
            switch(result){
            case 1:
                navigator.notification.alert("We have received your request for a phone call and will contact you as soon as possible. Thank you.","","Request created","OK");
                break;
            case 2:
                navigator.notification.alert("Your session appears to have expired. Please login again.",okConfirm,"Request created","OK");
                break;
            case 6:
                navigator.notification.alert("The contract was not found or you are not authorized to access it. Please contact the bank�s IT support for more information.","","Invalid contract","OK");
                break;
            case 7:
                navigator.notification.alert("You have to insert a subject to describe the reason for the call request.","","Subject is empty","OK");
                break;
            case 8:
                navigator.notification.alert("Please input your phone number.","","Phone number is empty","OK");
                break;
            case 9:
                navigator.notification.alert("Create call fail","","Fail","OK");
                break;
            default:
                navigator.notification.alert("Undefined error","","Undefine","OK");
            }
        }
        function okConfirm(){
            window.location = "index.html";
        }
         */

        
        executeProcessMessageRequest();

        function executeProcessMessageRequest(){
            if (!isOnline() || !isInternetEnabled()) {
                saveCallMeReq().then(function(){
                    alertMessageCallback(localizeStringForKey("AM.msgSent"),localizeStringForKey("AM.offlineMode"),closeMessage);
                });
            } else {
                var serverUrl = getMethodEndpoint("sendMessage");

                $.ajax({
                    async : true,
                    type : "post",
                    url: serverUrl,
                    data: {login: trimParameter(username), contract: trimParameter(contractNo), subject: trimParameter(subject), body: trimParameter(body)},
                    dataType: "text",
                    cache: false,
                    timeout: ajaxTimeout,
                    success:function(text) {
                        processMessage(text);
                    },
                    beforeSend: function(XMLHttpRequest){
                    },
                    complete: function (XMLHttpRequest, textStatus) {
                    },
                    error: function (xhr, textStatus, thrownError) {
                        if (thrownError == "timeout"){
                            saveCallMeReq().then(function(){
                                alertMessageCallback(localizeStringForKey("AM.msgSent"),localizeStringForKey("AM.offlineMode"),closeMessage);
                            });
                        }
                    }
                })
            }
        }

        function processMessage(text){
            var result = parseInt(text);
            console.log('result: ' + result);

            switch(result){
            case 1:
                alertMessageCallback(localizeStringForKey("AM.msgSent"),localizeStringForKey("AT.msgSent"),closeMessage);
                break;
            case 2:
                alertMessageCallback(localizeStringForKey("AM.reqCreated"),localizeStringForKey("AT.reqCreated"),loginAgain);
                break;
            case 6:
                alertMessage(localizeStringForKey("AM.subjectMissing"),localizeStringForKey("AT.subjectMissing"));
                break;
            case 7:
                alertMessage(localizeStringForKey("AM.noBody"),localizeStringForKey("AT.noBody"));
                break;
            default:
                errorMessage(localizeStringForKey("AM.undefErr"));
            }
        }
    });
    
    function saveCallMeReq() {
        var deferred = $.Deferred();
        var curDate = currentDate();
        
     // Create record in  CallMeRequest; when completed - make record in OfflineRequests
        createCallMeRequest(contractNo, label, motiveKey, motiveValue, phoneNo, subject, body, username, "not sent", 
            curDate, curDate).then(function(callMeReqId, tx){
                createOfflineCallMeReqNoTx(callMeReqId, tx).then(function(){                        
                    deferred.resolve();
                })
            }); 
        return deferred.promise();
    }

    function loginAgain(){
        window.location = "index.html";
    }

    function closeMessage(){
        $("#backButton").click();
    }
    
    $("#backButton").click(function(){
        if(document.URL.split("?")[1]){
            var contract = decodeContract(document.URL);
            window.location="lastAF.html?" +
            encodeContract(contract.code, "", contract.label);
        }
        else{
            window.location="communication.html";
        }
    });
}

//change focus to bodyMail
$(document).ready(function() {
    $('input').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if ( (code==13) || (code==10)) {
            $('#messageBody').focus();
            $('#messageBody').select();
            event.preventDefault();
        }
    });
});    

