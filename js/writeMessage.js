function execWriteMsgOnDevReady() {
    setMenuBackground();
    setLanguage().then(function(){
        $("#pageTitle").html(getPageTitle('writeMsg')); 
        $(".loggedUser").html(getLoggedUser());
        initWriteMsgScreen();
    })
}

function initWriteMsgScreen() {
    // Build contract list
    var contracts = [];
    var sender;

    // Check if this is reply
    if (document.URL.split("?")[1]) {
        contractNo = document.URL.split("?")[1].split("=")[1].split("&")[0];
        $("#contractNo").append("<option id='" + contractNo + "' value='" + contractNo + "'>" + contractNo + "</option>");
        $('#contractNo').selectmenu('refresh', true);
        $('#contractNo').selectmenu('disable');
        subjectMess = decodeURIComponent(document.URL.split("?")[1].split("=")[2].split("&")[0]);
        $('#messageSubject').val(subjectMess);
        messageRef = document.URL.split("?")[1].split("=")[3].split("&")[0];
        senderId = document.URL.split("?")[1].split("=")[4];

        $("#backButton").click(function() {
	      window.location = "readMessage.html?messageRef=" + messageRef;
        });

        // log data
        console.log('contractNo: ' + contractNo + "messageRef: " + messageRef + "senderId " + senderId );

    } else {
        $("#backButton").click(function() {
            window.location = "communication.html";
        });

        if ( !isOnline() || !isInternetEnabled()) {
            fetchContracts();

        } else {
            callGetContractsMsgWS()
            .then(function(contracts) {
                for (i = 0; i < contracts.length; i++) {
                    $("#contractNo").append("<option id='" + contracts[i].code + "' value='" + contracts[i].code + "'>" + contracts[i].label + "</option>");
                }
                $('#contractNo').selectmenu('refresh', true);
            })
            .fail(function(err) {
                if(err == "timeout"){
                    fetchContracts();
                } else {
                    console.log("error code: " + err);
                }                
            })
        }
    }
    sendMail();
}

function fetchContracts() {
    var contracts = [];

    // get Contracts from AccountDetails table by type == "newMail" 
    getAllAccountDetailsByType("newMail").then(function(accData) {
        callback(accData);
    });

    function callback(accData) {
        for (var i = 0; i < accData.length; i++) {
            var contractDetails = new Object();
            
            contractDetails.id = accData[i].id;
            contractDetails.userId = accData[i].userId;

            contractDetails.code = accData[i].code;
            contractDetails.currency = accData[i].currency;
            contractDetails.label = accData[i].label;
            
            contracts.push(contractDetails);
        }
        $("#contractNo").empty();       
        for (i = 0; i < contracts.length; i++) {
            $("#contractNo").append("<option id='" + contracts[i].code + "' value='" + contracts[i].code + "'>" + contracts[i].label + "</option>");
        }
        $('#contractNo').selectmenu('refresh', true);
        console.log(contracts);        
    }
}

function sendMail() {
    $("#sendButton").click(function() {
        contractNo = $('#contractNo').val();
        subject = $('#messageSubject').val();
        body = $('#messageBody').val();
        username = getUsername();
        
        if(trimParameter(subject) == "" ){
            alertMessage(localizeStringForKey("AM.subjectMissing"),localizeStringForKey("AT.subjectMissing"));
            return;
        } else if (trimParameter(body) == "" ){
            alertMessage(localizeStringForKey("AM.noBody"),localizeStringForKey("AT.noBody"));
            return;
        }
        
        
        if (isOnline() && isInternetEnabled()) {
            // Check if this is reply
            if (document.URL.split("?")[1]) {
                //if reply
                serverUrl = getMethodEndpoint("replyMessage");
                
                $.ajax({
                    async: true,
                    url: serverUrl,
                    type: "post",
                    data: {
                        login: trimParameter(username),
                        contract: trimParameter(contractNo),
                        subject: trimParameter(subject),
                        body: trimParameter(body),
                        torefIndividu: trimParameter(senderId)
                    },
                    dataType: "text",
                    cache: false,
                    timeout: ajaxTimeout,
                    success: function(text) {
                        processMessage(text);
                    },
                    beforeSend: function(XMLHttpRequest) {
                    },
                    complete: function(XMLHttpRequest, textStatus) {
                    },
                    error: function(xhr, textStatus, thrownError) {
                        if (thrownError == "timeout"){
                            //save to DB
                            var curDate = currentDate();
                            // Create new mail; when completed - make record in OfflineRequests and after that show alert
                            createMail(undefined, undefined, trimParameter(senderId), undefined, subject, body, contractNo, undefined, "reply", 
                                trimParameter(username), "not sent", curDate, curDate).then(function(id, tx){
                                    createOfflineMailReqNoTx(id, tx);
                                }).then(function(){
                                    alertMessageCallback(localizeStringForKey("AM.msgSent"),localizeStringForKey("AM.offlineMode"), closeMessage);
                                });  
                        }
                    }
                })
            } else {
                // new mail
                serverUrl = getMethodEndpoint("sendMessage");
                $.ajax({
                    async: true,
                    type: "post",
                    url: serverUrl,
                    timeout: ajaxTimeout,
                    data: {
                        login: trimParameter(username),
                        contract: trimParameter(contractNo),
                        subject: trimParameter(subject),
                        body: trimParameter(body)
                    },
                    dataType: "text",
                    cache: false,
                    beforeSend: function(XMLHttpRequest) {
                    },
                    complete: function(XMLHttpRequest, textStatus) {
                    },
                    success: function(text) {
                        processMessage(text);
                    },
                    error: function(xhr, textStatus, thrownError) {
                        if (thrownError == "timeout"){
                            //save to DB
                            var curDate = currentDate();
                           // Create new mail; when completed - make record in OfflineRequests and after that show alert
                            createMail(undefined, undefined, undefined, undefined, subject, body, contractNo, undefined, "new", 
                                trimParameter(username), "not sent", curDate, curDate).then(function(id, tx){
                                    createOfflineMailReqNoTx(id, tx);
                                }).then(function(){
                                    alertMessageCallback(localizeStringForKey("AM.msgSent"),localizeStringForKey("AM.offlineMode"), closeMessage);
                                });  
                        }
                    }
                })
            }
        } else {
            // offline mode
            //Check if this is reply
            if (document.URL.split("?")[1]) {
                // reply msg
                var curDate = currentDate();
                // Create new mail; when completed - make record in OfflineRequests and after that show alert
                createMail(undefined, undefined, trimParameter(senderId), undefined, subject, body, contractNo, undefined, "reply", 
                    trimParameter(username), "not sent", curDate, curDate).then(function(id, tx){
                        createOfflineMailReqNoTx(id, tx);
                    }).then(function(){
                        alertMessageCallback(localizeStringForKey("AM.msgSent"),localizeStringForKey("AM.offlineMode"), closeMessage);
                    });                
            } else {
                // new msg
                var curDate = currentDate();
                // Create new mail; when completed - make record in OfflineRequests and after that show alert
                createMail(undefined, undefined, undefined, undefined, subject, body, contractNo, undefined, "new", 
                    trimParameter(username), "not sent", curDate, curDate).then(function(id, tx){
                        createOfflineMailReqNoTx(id, tx);
                    }).then(function(){
                        alertMessageCallback(localizeStringForKey("AM.msgSent"),localizeStringForKey("AM.offlineMode"), closeMessage);
                    }); 
            }
        }

        function processMessage(text) {
            result = parseInt(text);
            console.log('result: ' + result);

            switch (result) {
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

        function loginAgain() {
            window.location = "index.html";
        }

        function closeMessage() {
            $("#backButton").click();
        }
    })
}


// change focus to messageBody
$(document).ready(function() {
    $('input').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if ((code == 13) || (code == 10)) {
            $('#messageBody').focus();
            $('#messageBody').select();
            event.preventDefault();
        }
    });
});
