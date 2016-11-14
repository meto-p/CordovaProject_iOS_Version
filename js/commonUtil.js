var suppressGlCompleted; // if suppressGlCompleted == true  - execute setGlobalCompleteHandler in main.js 

// initAvailScreen
function callGetAccountInfoWS() {
    
    var deferred = $.Deferred();
    var serverUrl = getMethodEndpoint("getAccountInfo");
    var username = getUsername();
    $.ajax({
        async: true,
        type: "post",
        url: serverUrl,
        suppressGlCompleted: suppressGlCompleted,
        data: {
            login: trimParameter(username),
        },
        dataType: "xml",
        cache: false,
        timeout: ajaxTimeout,

        // handler onSuccess
        success: function(xml) {
            console.log("Execute getAccountInfo data: " + xml);
            callback(xml);
        },
        beforeSend: function(XMLHttpRequest) {
            console.log("getAccountInfo beforeSend " + currentDate());
        },
        complete: function(XMLHttpRequest, textStatus) {
            console.log("getAccountInfo complete " + currentDate());
        },

        // handler onError
        error: function(xhr, textStatus, thrownError) {
            console.log("Error on getAccountInfo data " );
            deferred.reject(thrownError);
        }
    })

    // onSuccess response handler function
    // main execution flow
    function callback(xml) {
        var result;
        var accountData = [];

        // parse xml
        $(xml).find('AccountInfo').each(function() {
            $(this).find('account').each(function() {
                var accountDetails = new Object();
                accountDetails.avail = $(this).find('avail').text();
                accountDetails.maxAvail = $(this).find('maxAllowedAvail').text();
                accountDetails.code = $(this).find('code').text();
                accountDetails.currency = $(this).find('currency').text();
                accountDetails.curFiU = $(this).find('curFiU').text();
                accountDetails.totalFiU = $(this).find('totalFiU').text();
                accountDetails.label = $(this).find('label').text();

                accountDetails.id;
                accountDetails.type;
                accountDetails.selected = 0;

                accountDetails.cashTrns = $(this).find('cashTrns').text();
                accountDetails.cashRsrv = $(this).find('cashRsrv').text();
                accountDetails.pendPaym = $(this).find('pendPaym').text();
                accountDetails.pendCsts = $(this).find('pendCsts').text();
                accountDetails.blckAmnt = $(this).find('blckAmnt').text();

                var bankAccs = [];

                $(this).find('bankAccountInternal').each(function() {
                    var bankAcc = new Object();
                    bankAcc.id;
                    bankAcc.selected;

                    bankAcc.accountNumber = $(this).find('accountNumber').text();
                    bankAcc.bankName = $(this).find('bankName').text();
                    bankAcc.bankAccountCode = $(this).find('bankAccountCode').text();
                    bankAccs.push(bankAcc);
                })
                accountDetails.bankAccs = bankAccs;
                accountData.push(accountDetails);
            })
            result = $(this).find('result').text();
        });
        
        if (result == 1){
            // Save to DB
            if(accountData.length > 0) {
                populateAccountDetails(accountData, "screen").then(function(){
                    deferred.resolve(result, accountData);
                })
            }
        } else {
            deferred.reject(result);
        }
    }// main execution flow end
    return deferred.promise();
}

function refreshMailBox() {
    var deferredMB = $.Deferred();
    var sinceDate;
    var lastDBMail;
    console.log("starting refreshMailBox: " + currentDate());

    getLastMail("received", "read") // get last mail from DB 
    .then(function(lastMail){
        lastDBMail = lastMail
        if(lastMail != undefined){ // if there is mail(s) in DB
            sinceDate = lastMail.sentDate

            callRefreshMailBoxSince(sinceDate) // fetch all mails after 'sinceDate'.
            .then(function(mailsData) {
                if(lastDBMail.mailId == mailsData[0].mailId){ // check if there is new mail(s) ; if there isn't any new mails -> completed the function
                    deferredMB.resolve(); // function refreshMailBox completed successfully
                    console.log("refreshMailBox completed: " + currentDate());
                    return;
                }
                deleteMailsByDate(sinceDate) // if there is new mail(s) - delete all mails by current day  (this is a disadvantage of the Web service)
                .then(function() {
                    createReceivedMails(mailsData)  // stored new mails in DB 
                    .then(function(){
                        console.log("refreshMailBox completed: " + currentDate());
                        deferredMB.resolve(mailsData); // function refreshMailBox completed successfully
                    })
                    .fail(function(){
                        deferredMB.reject("callRefreshMailBoxWS fail");
                    })
                })
            })
            .fail(function(err){
                deferredMB.reject(err);
            })

        }  else {
            callRefreshMailBoxSince(sinceDate) // fetch all mails after 'sinceDate'. if sinceDate == undefined - get all mails
            .then(function(mailsData) {

                createReceivedMails(mailsData)  // stored all mails in DB 
                .then(function(){
                    console.log("refreshMailBox completed: " + currentDate());
                    deferredMB.resolve(mailsData); // function refreshMailBox completed successfully
                })
                .fail(function(){
                    deferredMB.reject("callRefreshMailBoxWS fail");
                })
            })
            .fail(function(err){
                deferredMB.reject(err);
            })
        }
    })
    return deferredMB.promise();
}

function callRefreshMailBoxSince(sinceDate) {
    var deferred = $.Deferred();

    //Call web service to refresh mail box
    var serverUrl = getMethodEndpoint("refreshMailBoxSince");
    var username = getUsername();
    $.ajax({
        async: true,
        type: "post",
        url: serverUrl,
        data: {login: username, sinceDate:sinceDate},
        dataType: "xml",
        cache: false,
        suppressGlCompleted: suppressGlCompleted,
        timeout: ajaxTimeout,
        success:function(xml) {
            callback(xml);
        },
        error: function (xhr, textStatus, thrownError) {
            deferred.reject(thrownError);
        }
    });

    function callback(xml){
        //Define variable
        var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
        var mailsData = [];
        var result = $(xml).find('result').text();

        if (result == 1){
            //parse xml
            $(xml).find('MailBoxInfo').each(function() {
                $(this).find('mail').each(function() {
                    if($(this).find('mailId').text()){
                        var mail = new Object();
                        mail.mailId = $(this).find('mailId').text();
                        mail.sender = $(this).find('sender').text();
                        mail.senderId = $(this).find('senderId').text();
                        mail.sentDate = $(this).find('sentDate').text();
                        mail.subject = $(this).find('title').text();
                        mail.body = $(this).find('body').text();
                        mail.contractId = $(this).find('contractId').text();
                        mail.read = $(this).find('read').text();

                        mailsData.push(mail);                    
                    }
                });                
                deferred.resolve(mailsData);
            });
        } else {
            deferred.reject(result);
        }
    }
    return deferred.promise();
}

function callRefreshMailBoxWS() { // doesn't use, there is new WS 
    var deferred = $.Deferred();

    //Call web service to refresh mail box
    var serverUrl = getMethodEndpoint("refreshMailBox");
    var username = getUsername();
    $.ajax({
        async: true,
        type: "post",
        url: serverUrl,
        data: {login: username},
        dataType: "xml",
        cache: false,
        suppressGlCompleted: suppressGlCompleted,
        timeout: ajaxTimeout,
        success:function(xml) {
            callback(xml);
        },
        error: function (xhr, textStatus, thrownError) {
            deferred.reject(thrownError);
        }
    });

    function callback(xml){
        //Define variable
        var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
        var mailsData = [];
        var result = $(xml).find('result').text();

        if (result == 1){
            //parse xml
            $(xml).find('MailBoxInfo').each(function() {
                $(this).find('mail').each(function() {
                    if($(this).find('mailId').text()){
                        var mail = new Object();
                        mail.mailId = $(this).find('mailId').text();
                        mail.sender = $(this).find('sender').text();
                        mail.senderId = $(this).find('senderId').text();
                        mail.sentDate = $(this).find('sentDate').text();
                        mail.subject = $(this).find('title').text();
                        mail.body = $(this).find('body').text();
                        mail.contractId = $(this).find('contractId').text();
                        mail.read = $(this).find('read').text();

                        mailsData.push(mail);                    
                    }
                });
                
                deferred.resolve(mailsData);

            });
        } else {
            deferred.reject(result);
        }
    }
    return deferred.promise();
}

function callGetCallMeContractsWS() {
    var deferred = $.Deferred();
    var contracts = [];
    var serverUrl = getMethodEndpoint("getContracts");
    var username = getUsername();

    $.ajax({
        async : true,
        type : "post",
        url: serverUrl,
        data: {login: trimParameter(username)},
        dataType: "xml",
        timeout: ajaxTimeout,
        cache: false,
        suppressGlCompleted: suppressGlCompleted,
        success:function(xml) {
            callback(xml);
        },
        beforeSend: function(XMLHttpRequest) {
        },
        complete: function (XMLHttpRequest, textStatus) {
        },
        error: function (xhr, textStatus, thrownError) {
            deferred.reject(thrownError);
        }
    })

    function callback(xml) {
        var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
        var result;
        
        result =  $(xml).find('result').text();
        if (result == 1){
            deleteAccountDetailsByType("callMe");
            //parse xml
            $(xml).find('ContractInfo').each(function() {
                $(this).find('contract').each(function() {
                    var contractDetails = new Object();
                    contractDetails.code = $(this).find('code').text();
                    contractDetails.currency = $(this).find('currency').text();
                    contractDetails.label = $(this).find('label').text();
                    contractDetails.type = "callMe";
                    
                    contracts.push(contractDetails);
                })
                createAllAccountDetails(contracts, "callMe")
                .then(function(){
                    deferred.resolve(contracts);
                })
                .fail(function(){
                    deferred.reject("callGetCallMeContractsWS fail");
                })
                
            })                
        } else {
            deferred.reject(result);
        }
    }
    
    return deferred.promise();
}

//call me - MOBILE_CALLME_REASON
function callGetLovWS() {
    var deferred = $.Deferred();
    var serverUrl = getMethodEndpoint("getLov");
    var username = getUsername();
    var result;
    console.log("Get lov: " + serverUrl);

    $.ajax({
        async : true,
        type : "post",
        url: serverUrl,
        data: {login: trimParameter(username), type: 'MOBILE_CALLME_REASON'},
        dataType: "xml",
        cache: false,
        timeout: ajaxTimeout,
        suppressGlCompleted: suppressGlCompleted,
        success:function(xml) {
            processMotive(xml);
        },
        beforeSend: function(XMLHttpRequest) {
            console.log("callGetLovWS beforeSend: " + currentDate());
        },
        complete: function(XMLHttpRequest, textStatus) {
            console.log("callGetLovWS complete: " + currentDate());
        },
        error: function (xhr, textStatus, thrownError) {
            deferred.reject();
        }
    })

    //parse xml
    function processMotive(xml){
        result =  $(xml).find('result').text();

        if (result == 1){
            deleteDataMapById("motive");  
            var motives = [];
            $(xml).find('Lov').each(function() {
                $(xml).find('elements').each(function() {
                    var motive = new Object();
                    motive.key = $(this).find('key').text();
                    motive.value = $(this).find('value').text();
                    motive.type = "motive";
                    motives.push(motive);
                })
                createAllDataMap(motives)
                .then(function(){
                    console.log("createAllDataMap stored in DB: " + currentDate());
                    deferred.resolve(motives);
                })
                .fail(function(){
                    deferred.reject("callGetLovWS fails");
                });
            })
        } else {
            deferred.reject(result);
        }
    }
    return deferred.promise();
}

function callGetContractsMsgWS() {
    var deferred = $.Deferred();
    serverUrl = getMethodEndpoint("getContracts");
    var username = getUsername();
    var contracts = [];

    $.ajax({
        async: true,
        type: "post",
        url: serverUrl,
        data: {
            login: trimParameter(username)
        },
        dataType: "xml",
        cache: false,
        timeout: ajaxTimeout,
        suppressGlCompleted: suppressGlCompleted,
        success: function(xml) {
            callback(xml);
        },
        beforeSend: function(XMLHttpRequest) {
            console.log("createAllAccountDetails beforeSend: " + currentDate());
        },
        complete: function(XMLHttpRequest, textStatus) {
            console.log("createAllAccountDetails complete: " + currentDate());
        },
        error: function(xhr, textStatus, thrownError) {
            deferred.reject(thrownError);
        }
    })

    function callback(xml) {
        var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
        result =  $(xml).find('result').text();
        
        if (result == 1){
            deleteAccountDetailsByType("newMail");        
            // parse xml
            $(xml).find('ContractInfo').each(function() {
                $(this).find('contract').each(function() {
                    var contractDetails = new Object();
                    contractDetails.code = $(this).find('code').text();
                    contractDetails.currency = $(this).find('currency').text();
                    contractDetails.label = $(this).find('label').text();
                    contracts.push(contractDetails);
                })
                createAllAccountDetails(contracts, "newMail")
                .then(function(){
                    console.log("createAllAccountDetails stored in DB: " + currentDate());
                    deferred.resolve(contracts);
                })
                .fail(function(){
                    deferred.reject("callGetContractsMsgWS fail");
                })
                
            })
        } else {
            deferred.reject(result);
        }
    }
    return deferred.promise();
}



function callGetLastAssignmentInfo() {

    var deferred = $.Deferred();
    serverUrl = getMethodEndpoint("getLastAssignmentInfo");
    username = getUsername();
    $.ajax({
        async : true,
        type : "post",
        url: serverUrl,
        data: {login: trimParameter(username)},
        dataType: "xml",
        cache: false,
        suppressGlCompleted: suppressGlCompleted,
        beforeSend: function(XMLHttpRequest){
            console.log("callGetLastAssignmentInfo beforeSend: " + currentDate());
        },
        complete: function (XMLHttpRequest, textStatus) {
            console.log("callGetLastAssignmentInfo completed: " + currentDate());
        },
        success:function(xml) {
            callback(xml);
        },
        error: function (xhr, textStatus, thrownError) {
            deferred.reject();
        }
    })

    function callback(xml) {
        var lastAFData = [];
        var result;

        deleteAllLARows();
        //parse xml
        $(xml).find('LastAssignmentInfo').each(function() {
            $(xml).find('lastAssignment').each(function() {
                lastAF = new Object();

                lastAF.afRef = $(this).find('afReference').text();
                lastAF.account = $(this).find('account').text();
                lastAF.refTo = $(this).find('to').text();
                lastAF.amount = $(this).find('amount').text();
                lastAF.currency = $(this).find('currency').text();
                lastAF.receivedDate = $(this).find('receivedDate').text();
                lastAF.status = $(this).find('status').text();
                lastAF.result = parseInt($(this).find('result').text());

                lastAFData.push(lastAF);  
            })

            console.log(lastAFData);
            createAllLastAssignments(lastAFData)
                .then(function(){
                    console.log("createAllLastAssignments stored in DB: " + currentDate());
                    deferred.resolve();
                })
                .fail(function(){
                    deferred.reject();
                })
        })
        //  deleteUnreferencedLARows(trimParameter(username), trimParameter(contractNo))
    }
    return deferred.promise();
}
