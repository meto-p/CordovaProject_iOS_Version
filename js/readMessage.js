function execReadMsgOnDReveady() {
    setLanguage().then(function(){
        initReadMsgScreen();
    })
};

function initReadMsgScreen() {
    $("#pageTitle").html(getPageTitle('readMsg'));
    $(".loggedUser").html(getLoggedUser());
    
    $("#readMessage #backButton").click(function(){
    	window.sessionStorage.setItem("backToMail", mailId);
        window.location="communication.html";
    });

    mailId = window.sessionStorage.getItem("mailId");
    sender = window.sessionStorage.getItem("sender");
    senderId = window.sessionStorage.getItem("senderId");
    date = window.sessionStorage.getItem("sentDate");
    subject = window.sessionStorage.getItem("subject");
    body = window.sessionStorage.getItem("body");
    contractNo = window.sessionStorage.getItem("contractNo");
    isRead = window.sessionStorage.getItem("read");

    $("#readMessage #from").html(sender + ", " + date);
    if(contractNo){
        $("#readMessage #subjectMail").html(contractNo+": "+subject);
    }
    else{
        $("#readMessage #subjectMail").html(subject);
    }
    $("#readMessage #bodyMail").html(body);

    //get data from URL
    // var mailId=document.URL.split("?")[1].split("=")[1];

    $("#readMessage #replyButton").on('vclick', function(){
        window.location="writeMessage.html?contractNo="+contractNo+"&subjectMess="+encodeURIComponent(subject)+
        "&messageRef="+mailId+"&senderId="+senderId;
    });

    if(isRead == "false"){
        updateMailStatus(mailId);
    }
}

function updateMailStatus(mailId) {
    var deferred = $.Deferred();
    if (isOnline() && isInternetEnabled()) {
        //update mail status
        serverUrl = getMethodEndpoint("updateMailStatus");
        username = getUsername();
        var status = true;
        $.ajax({
            async: true,
            type: "post",
            url: serverUrl ,
            data: {login: username, mailID: mailId, isRead: status},
            dataType: "text",
            cache: false,
            timeout: ajaxTimeout,
            success:function(text) {
                updateMailFields(mailId, "true", "received", "status");
                result = parseInt(text);
                console.log(result);
                deferred.resolve();  
            },
            error: function (xhr, textStatus, thrownError) {
                if (thrownError == "timeout"){
                    updateMailFields(mailId, "true", "read", "not sent").then( function (id, tx){
                        createOfflineMailReqNoTx(id, tx); 
                    });
                }
                deferred.reject();     
            }
        });
    } else {
        updateMailFields(mailId, "true", "read", "not sent").then( function createOfflineMail(id, tx){
            createOfflineMailReqNoTx(id, tx); 
        });
    }
    return deferred.promise();
}