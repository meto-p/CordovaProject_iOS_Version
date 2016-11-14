function execDashboardOnDevReady() {
    setLanguage().then(function(){
        $("#pageTitle").html(getPageTitle('dashboardScreen'));
        $(".loggedUser").html(getLoggedUser());
        $("#welcomeMsg").html(localizeStringForKey("welcomeMsg") + window.localStorage.getItem(CONSTANTS.USERNAME_PARAM));
        
        if (!isOnline() || !isInternetEnabled()) {
            initDashboardScreen();
            // you are offline...
        } else {
            submitAutomaticOfflineReqs().then(function(){
                initDashboardScreen();
                
                // you are online - v lentata 
            })
        } 
    });
}

function initDashboardScreen() {
    getBasicInfo();

    getCountOfPendingPayments().then(function(countOfPendingPmnt) {
        console.log("broqt na chakashtite plashtaniq e: " + countOfPendingPmnt);
        if(countOfPendingPmnt > 0) {
            createOfflineStatLbl(countOfPendingPmnt);
        }
    });

    // get count of 'not sent' messages & count of 'call me' requests 
    $.when(getJoinOfMailsAndOfflReqs(), getCountOfCallMeReq()).then(function(mailsArr, countOfCallMeReqs) {
        // get count of 'not sent' mails with type reply || new 
        var countOfMsg = 0;
        if(mailsArr.length >0){
            for(var i in mailsArr){
                if(mailsArr[i].type == "reply" || mailsArr[i].type == "new"){
                    countOfMsg += 1;
                }
            }
        }
        console.log("count of mails " + countOfMsg);

        countOfMsg += countOfCallMeReqs;
        if(countOfMsg > 0) {
            createOfflineMsgLbl(countOfMsg)
        }
    })

    // get count of unread mails
    getCountOfReadMails(false).then(function(countOfUnreadMails) {
        if(countOfUnreadMails > 0){
            createUnreadMailsLbl(countOfUnreadMails);
        }
    })
}

/**
 *  create labels that shows expire password date & when was last active session 
 */
function getBasicInfo() {
	var dashboardImg = "css/third_party/images/icons-png/dashboard.png";
    var passExpImg = "css/third_party/images/icons-png/settings.png";
	
	var dashInfo = document.getElementById("dashPlaceholder");
    
    var passExp = document.createElement("div");
    passExp.setAttribute("class", "dashbLbl");
    
    
    
    var passExpLbl = document.createElement("span");
    passExpLbl.setAttribute("class", "dashbLbl");
    var passExpLblTxt = document.createTextNode(localizeStringForKey("passwordExpire"));
    passExpLbl.appendChild(passExpLblTxt);

    var passExpVal = document.createElement("span");
    passExpVal.setAttribute("class", "dashbLbl");
    var passExpValTxt = document.createTextNode("N/A"); // TODO get date from the server
    passExpVal.appendChild(passExpValTxt); 
    
    createMsgImage(passExp, passExpImg);
    
    passExp.appendChild(passExpLbl);
    passExp.appendChild(passExpVal); 
    
    dashInfo.appendChild(passExp); 

    
    var lastSession = document.createElement("div");
    lastSession.setAttribute("class", "dashbLbl");
    
    var lastSessionLbl = document.createElement("span");
    lastSessionLbl.setAttribute("class", "dashbLbl");
    var lastSessionLblTxt = document.createTextNode(localizeStringForKey("activeSession"));
    lastSessionLbl.appendChild(lastSessionLblTxt);

    var lastSessVal = document.createElement("span");
    lastSessVal.setAttribute("class", "dashbLbl");
    var lastSessValTxt = document.createTextNode("N/A"); // TODO  get date from the server 
    lastSessVal.appendChild(lastSessValTxt);
    
    createMsgImage(lastSession, dashboardImg);
    
    lastSession.appendChild(lastSessionLbl);
    lastSession.appendChild(lastSessVal); 
    
    dashInfo.appendChild(lastSession); 
}

/**
 * create label that show how many not confirmed payments there are
 */
function createOfflineStatLbl(count) {	
	var offleStatImg = "css/third_party/images/icons-png/oflStatment.png";
    var dashInfo = document.getElementById("dashPlaceholder");
    
    var offlineStatment = document.createElement("div");
    offlineStatment.setAttribute("class", "dashbLbl");
    
    var countOfOfflStatLbl = document.createElement("span");
    countOfOfflStatLbl.setAttribute("class", "dashbLbl");
    var countOfOfflStatVal = document.createTextNode(count);
    countOfOfflStatLbl.appendChild(countOfOfflStatVal);

    var OfflStatementLbl = document.createElement("span");
    OfflStatementLbl.setAttribute("class", "dashbLbl");
    var OfflStatementTxt = document.createTextNode(localizeStringForKey("offlStatementTxt"));
    OfflStatementLbl.appendChild(OfflStatementTxt);
    
    createMsgImage(offlineStatment, offleStatImg);
    
    offlineStatment.appendChild(countOfOfflStatLbl);
    offlineStatment.appendChild(OfflStatementLbl); 
    
    dashInfo.appendChild(offlineStatment); 
}

/**
 * create label that show how many not sent mails there are
 */
function createOfflineMsgLbl(count) {
	var offlineMsgImg = "css/third_party/images/icons-png/oflMsg.png";
    var dashInfo = document.getElementById("dashPlaceholder");
    
    var offlineMsg = document.createElement("div");
    offlineMsg.setAttribute("class", "dashbLbl");
    
    var countOfOfflMsgLbl = document.createElement("span");
    countOfOfflMsgLbl.setAttribute("class", "dashbLbl");
    var countOfOfflStatVal = document.createTextNode(count);
    countOfOfflMsgLbl.appendChild(countOfOfflStatVal);

    var OfflMsgtLbl = document.createElement("span");
    OfflMsgtLbl.setAttribute("class", "dashbLbl");
    var OfflStatementTxt = document.createTextNode(localizeStringForKey("offlMsgTxt"));
    OfflMsgtLbl.appendChild(OfflStatementTxt);
    
    createMsgImage(offlineMsg, offlineMsgImg);
    
    offlineMsg.appendChild(countOfOfflMsgLbl);
    offlineMsg.appendChild(OfflMsgtLbl); 
    
    dashInfo.appendChild(offlineMsg); 
}

/**
 * create label that show how many unread mails there are
 */
function createUnreadMailsLbl(count) {
	var offlineMsgImg = "css/third_party/images/icons-png/message.png";
    var dashInfo = document.getElementById("dashPlaceholder");
    
    var unreadMsg = document.createElement("div");
    unreadMsg.setAttribute("class", "dashbLbl");

    var countOfUnreadMsgLbl = document.createElement("span");
    countOfUnreadMsgLbl.setAttribute("class", "dashbLbl");
    var infoTxt = document.createTextNode(String.format(localizeStringForKey("unsentMsg"), count));
    countOfUnreadMsgLbl.appendChild(infoTxt);
    
    createMsgImage(unreadMsg, offlineMsgImg);
    
    unreadMsg.appendChild(countOfUnreadMsgLbl);
    
    dashInfo.appendChild(unreadMsg); 
}

function createMsgImage(placeholder, msgImageSrc) {
    var img = document.createElement("img");
    img.src = msgImageSrc;
    img.setAttribute("class", "dashboardImage");
    img.alt = "icon";
    img.width = 14;
    img.height = 14;
    placeholder.appendChild(img); 
}

