/**
 * submitAutomaticOfflineReqs
 */
function submitAutomaticOfflineReqs() {
    var deferred = $.Deferred();
       
    var sortedOfflineReqsArr = [];
    
    sortOfflineRequests().then(function(sortedOfflineReqsArr) {
        var count = sortedOfflineReqsArr.length;
        if (count == 0){
            deferred.resolve();

        } else {
            $.blockUI("Please wait...");
            var i = 0;
            execReqs();
            
            function execReqs(){
                if (!isOnline() || !isInternetEnabled()) {
                    $.unblockUI();
                    deferred.resolve();
                } else if (i < count) {

                    /** New mail */
                    if (sortedOfflineReqsArr[i].type == "new" ) {
                        console.log(sortedOfflineReqsArr[i]);

                        updateMailStatusField(sortedOfflineReqsArr[i].idOfMail, "in progress")
                        .then(function(){
                            submitNewMail(sortedOfflineReqsArr[i].idOfMail, sortedOfflineReqsArr[i].userId,
                                sortedOfflineReqsArr[i].contractId, sortedOfflineReqsArr[i].subject, sortedOfflineReqsArr[i].body)
                                .then(function() {
                                    deleteMailById(sortedOfflineReqsArr[i].idOfMail)
                                    .then(function() {
                                        i++;
                                        execReqs();
                                    })
                                }, function err() {
                                    i++;
                                    execReqs();
                                });
                        });

                    /** reply mail */
                    } else if (sortedOfflineReqsArr[i].type == "reply"){
                        console.log(sortedOfflineReqsArr[i]);
                        updateMailStatusField(sortedOfflineReqsArr[i].idOfMail, "in progress")
                        .then(function(){
                            submitReplyMail(sortedOfflineReqsArr[i].idOfMail, sortedOfflineReqsArr[i].userId, sortedOfflineReqsArr[i].contractId,
                                sortedOfflineReqsArr[i].subject, sortedOfflineReqsArr[i].body, sortedOfflineReqsArr[i].senderId)
                                .then(function() {
                                    deleteMailById(sortedOfflineReqsArr[i].idOfMail)
                                    .then(function() {
                                        i++;
                                        execReqs();
                                    })
                                }, function err() {
                                    i++;
                                    execReqs();
                                });
                        });

                    /** read mail */        
                    } else if (sortedOfflineReqsArr[i].type == "read"){
                        console.log(sortedOfflineReqsArr[i]);                        
                        submitReadMail(sortedOfflineReqsArr[i].idOfMail, sortedOfflineReqsArr[i].mailId)
                        .then(function() {
                            // mailId - id returned from server ;  idOfMail - id from local DB
                            $.when(updateMailFields(sortedOfflineReqsArr[i].mailId, "true", "received", "status"), deleteOfflineRequestByMailId(sortedOfflineReqsArr[i].idOfMail))
                            .then(function() {
                                i++;
                                execReqs();
                            })
                        }, function err() {
                            i++;
                            execReqs();
                        });

                    /** call me */
                    } else if (sortedOfflineReqsArr[i].type == "callMe"){
                        console.log(sortedOfflineReqsArr[i]);
                        submitCallMeReq(sortedOfflineReqsArr[i].idOfCallMeReq, sortedOfflineReqsArr[i].userId, sortedOfflineReqsArr[i].code, 
                            sortedOfflineReqsArr[i].subject, sortedOfflineReqsArr[i].body)
                            .then(function() {
                                deleteCallMeRequestById(sortedOfflineReqsArr[i].idOfCallMeReq)
                                .then(function() {
                                    i++;
                                    execReqs();
                                })
                            }, function err() {
                                i++;
                                execReqs();
                            });
                    }
                } else {
                    $.unblockUI();
                    deferred.resolve();
                }
            }
        }
    });
    return deferred.promise();


//    deferred.resolve();
//    return deferred.promise();
}

/**
 * get all offline mails & call me reqs and sort them by offlineReqId
 *  return sortedOfflineReqsArr
 */
function sortOfflineRequests() {
    var deferred = $.Deferred();
    var allOfflineRequests;
    var sortedOfflineReqsArr;
    
    $.when(getJoinOfCallMeAndOfflReqs(), getJoinOfMailsAndOfflReqs()).then(function (offlReqAndCallMe, offlReqAndMails) {
        allOfflineRequests = offlReqAndCallMe.concat(offlReqAndMails);
        console.log(allOfflineRequests);
        
        function sortArray(a,b) {
            if (a.offlineReqId< b.offlineReqId){
              return -1;
            }
            else if (a.offlineReqId> b.offlineReqId){
              return 1;
            }
            else {
              return 0;
            }
          }
        sortedOfflineReqsArr = allOfflineRequests.sort(sortArray);
        deferred.resolve(sortedOfflineReqsArr);
    });
    return deferred.promise();
}

/**
 * submit mail with type "new"
 */
function submitNewMail(idOfMail,  username, contractNo, subject, body) {
    var deferred = $.Deferred();
    var serverUrl = getMethodEndpoint("sendMessage");
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
        suppressGlCompleted: true,
        cache: false,
        success: function(text) {
            console.log("code: " + text);
            if(text == 1) {
                deferred.resolve(text);
            } else {
                deferred.reject(text);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            deferred.reject();
        }
    })
    return deferred.promise();
}

/**
 * submit mail with type "reply"
 */
function submitReplyMail(idOfMail, username, contractNo, subject, body, senderId) {
    var deferred = $.Deferred();
    var serverUrl = getMethodEndpoint("replyMessage");
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
        suppressGlCompleted: true,
        timeout: ajaxTimeout,
        success: function(text) {
            console.log("code: " + text);
            if(text == 1) {
                deferred.resolve(text);
            } else {
                deferred.reject(text);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            deferred.reject();
        }
    })
    return deferred.promise();  
}

/**
 * submit mail with type "read"
 */
function submitReadMail(idOfMail, mailId) {
    var deferred = $.Deferred();
    var serverUrl = getMethodEndpoint("updateMailStatus");
    var username = getUsername();
    var status = true;
    $.ajax({
        async: true,
        type: "post",
        url: serverUrl ,
        data: {
            login: username, 
            mailID: mailId, 
            isRead: status
        },
        dataType: "text",
        cache: false,
        suppressGlCompleted: true,
        timeout: ajaxTimeout,
        success:function(text) {
            console.log("code: " + text);
            if(text == 1) {
                deferred.resolve(text);
            } else {
                deferred.reject(text);
            }
        },
        error: function (xhr, textStatus, thrownError) {
            deferred.reject();
        }
    });
    return deferred.promise();  
}

/**
 * submit callMe req
 */
function submitCallMeReq(idOfCallMeReq, username, contractNo, subject, body) {
    var serverUrl = getMethodEndpoint("sendMessage");
    var deferred = $.Deferred();
    $.ajax({
        async : true,
        type : "post",
        url: serverUrl,
        data: {
            login: trimParameter(username), 
            contract: trimParameter(contractNo), 
            subject: trimParameter(subject), 
            body: trimParameter(body)
        },
        dataType: "text",
        cache: false,
        suppressGlCompleted: true,
        timeout: ajaxTimeout,
        success:function(text) {
            console.log("code: " + text);
            if(text == 1) {
                deferred.resolve(text);
            } else {
                deferred.reject(text);
            }
        },
        error: function (xhr, textStatus, thrownError) {
            deferred.reject();
        }
    })
    return deferred.promise();
}