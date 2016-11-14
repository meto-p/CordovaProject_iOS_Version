function execCommOnDevReady(){
    setLanguage().then(function(){
        $("#pageTitle").html(getPageTitle('messagesScreen'));
        $(".loggedUser").html(getLoggedUser());
        setPositionOfSearchField();

        $("#communication #inbox").on('vclick', function(){
            window.location="communication.html";
        });
        $("#communication #new").on('vclick', function(){
            window.location="writeMessage.html";
        });
        $("#communication #callMe").on('vclick', function(){
            window.location="callMe.html";
        });
        $(document).css("opacity","100%");

        loadMails();
    });
}

/**
 * load mails from server
 * @returns mailsData
 */
function loadMails() {	
	$("#messageListView").empty(); // clear list
	
    if (isOnline() && isInternetEnabled()) {
        refreshMailBox()
        .then(function(){
            getMailsByTypes("received", "read")
            .then(function(mailsArr){
                initMailList(mailsArr);
                showMailDetails(mailsArr);
                allMails = mailsArr;
            })
        })
        .fail(function error(err){
//            if(err == "timeout"){
                getMailsByTypes("received", "read")
                .then(function(mailsArr){
                    initMailList(mailsArr);
                    showMailDetails(mailsArr);
                    allMails = mailsArr;
                })
//            } else {
//                console.log("error code: " + err);
//            }
        })
    } else {
        getMailsByTypes("received", "read")
        .then(function(mailsArr){
            console.log(mailsArr);
            initMailList(mailsArr);
            showMailDetails(mailsArr);
            allMails = mailsArr;
        });
    }
}

/**
 * load list of mails
 * @param mailsData
 */
function initMailList(mailsData) {
    var countOfUnreadMails = 0;
    var count = mailsData.length;
    var openMsgImageScr = "css/third_party/images/icons-png/mail-open.png";
    var closeMsgImageSrc = "css/third_party/images/icons-png/mail-black.png";
    
    for (var i = 0; i < count; i+= 1) {
        if(mailsData[i].read == 'false'){
        	createTableRow (mailsData[i].mailId, mailsData[i].subject, mailsData[i].sender,closeMsgImageSrc, mailsData[i].sentDate, mailsData[i].read);
            countOfUnreadMails += 1;
        }
        else{
        	createTableRow (mailsData[i].mailId, mailsData[i].subject, mailsData[i].sender,openMsgImageScr, mailsData[i].sentDate, mailsData[i].read);
        }
    }
    
    $("#communication #messageListView").listview("refresh");
    
    
    // go to last open mail
    mailId = window.sessionStorage.getItem("backToMail");
    if(mailId == null) { // init mailId to null in session storage
    	window.sessionStorage.setItem("backToMail", 'null');
    	mailId = 'null';
    }
    if (mailId != 'null') {
        var currentMail = $(document.getElementById(mailId));  // get mail      
        var sucker = parseInt(currentMail.position().top) - 50; // get position
        $("body").scrollTop(sucker);
        currentMail.css("background-color", "#d9d9d9"); // mark last open mail
        window.sessionStorage.setItem("backToMail", 'null');
    }
}

function showMailDetails(mailsData) {
    //Link each buttons as well as the mails
    $("#communication .messageLink").on('vclick', function(){
        var index = $(this).index();

        window.sessionStorage.setItem("mailId", mailsData[index].mailId);
        window.sessionStorage.setItem("sender", mailsData[index].sender);
        window.sessionStorage.setItem("senderId", mailsData[index].senderId);
        window.sessionStorage.setItem("sentDate", mailsData[index].sentDate);
        window.sessionStorage.setItem("subject", mailsData[index].subject);
        window.sessionStorage.setItem("body", mailsData[index].body);
        window.sessionStorage.setItem("contractNo", mailsData[index].contractId);
        window.sessionStorage.setItem("read", mailsData[index].read);

        $(this).children('img').css('visibility', 'hidden');
        window.location = "readMessage.html?messageRef=" + $(this)[0].id;
    });
}


/** 
 * fill-in the table
 * @param id, accoundCode, backAccCode, status, amount, date
 */
function createTableRow (id, title, sender, msgImage, sentDate, read) {
    
    // create new row of list
    var newRow = document.createElement("li");
    newRow.setAttribute("data-icon", "false");
    newRow.setAttribute("class", "messageLink");
    newRow.setAttribute("id", id);    
    
    createTitlePlaceholder(newRow, title, msgImage, sentDate, read);
    createSenderLbl(newRow, sender)

    var newMessage = document.getElementById("messageListView");
    newMessage.appendChild(newRow);

}

function createTitlePlaceholder(newRow, title, msgImageSrc, sentDate, read) {
	var titleMsgPlaceholder = document.createElement("div");
	titleMsgPlaceholder.setAttribute("class", "titleMsgPlaceholder");	
	
	createMsgdImage(titleMsgPlaceholder, msgImageSrc); 
    createMsgTitleLbl(titleMsgPlaceholder, title, read); 
    createDateElements(titleMsgPlaceholder, sentDate) ;
    
    newRow.appendChild(titleMsgPlaceholder);
}

function createMsgTitleLbl(titleMsgPlaceholder, title, read) {
    var titleMessage = document.createElement("span");
    
    if(read == 'false') {
    	titleMessage.setAttribute("class", "titleMessage unreadMsg");
    } else {
    	titleMessage.setAttribute("class", "titleMessage");
    }
    var titleMessageTxt = document.createTextNode(title); 
    titleMessage.appendChild(titleMessageTxt);
    
    titleMsgPlaceholder.appendChild(titleMessage);   
}

function createMsgdImage(titleMsgPlaceholder, msgImageSrc) {
    var img = document.createElement("img");
    img.src = msgImageSrc;
    img.setAttribute("class", "msgImage");
    img.alt = "msg icon";
    img.width = 14;
    img.height = 14;
    titleMsgPlaceholder.appendChild(img); 
}

//separator (delimiter) between the rows 
function addEmptyRow(newRow) {
    var emptyRow;
    emptyRow = document.createElement("p");
    newRow.appendChild(emptyRow);
}

function createDateElements(titleMsgPlaceholder, date) {
    var sentDate =  document.createElement("span");
    sentDate.setAttribute("class", "dateValue");
    var dateValueTxt = document.createTextNode(date);
    sentDate.appendChild(dateValueTxt);

    titleMsgPlaceholder.appendChild(sentDate);
}


function createSenderLbl(newRow, sender) {
    var senderLabel = document.createElement("span");
    senderLabel.setAttribute("class", "senderElement");
    var senderLabelTxt= document.createTextNode("sender: ");
    senderLabel.appendChild(senderLabelTxt);

    var senderName = document.createElement("span");
    senderName.setAttribute("class", "senderElement");
    var senderNameTxt = document.createTextNode(sender); 
    senderName.appendChild(senderNameTxt);
    
    newRow.appendChild(senderLabel);
    newRow.appendChild(senderName);   
}


/**
 * search string in Array of objects
 */
function prepareMailSearch(searchValue) {
	var splitSearchVal = [];
	var searchExprArr = [];
	var searchExpression = "";	

	// prepare search expression
	splitSearchVal = searchValue.split(" ");
	for(var i = 0; i <splitSearchVal.length; i+=1){
		// remove all empty strings
		if(splitSearchVal[i] !=""){
			searchExprArr.push(splitSearchVal[i]); // save all words in array
		}
	}

	//prepare regular expression value	
	for(var i=0; i<searchExprArr.length; i+=1){
		searchExpression = searchExpression + "(.*" + searchExprArr[i] + ")";		
	}

	if(trimParameter(searchExpression) == ""){
		loadMails();
	} else {
		// searchInMails
		
		//regex expression	
		var regex = new RegExp(searchExpression,"igm");

		var count = allMails.length;
		var currMail;

		var result;
		var filteredArr = [];

		for (var i = 0; i < count; i++) {
			if(allMails[i].userId == window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)){
				currMail = allMails[i];
				mailStr = currMail.sentDate + " " + currMail.sender + " " + currMail.subject + " " + currMail.body + " " + currMail.contractId + " " + currMail.senderId;	

				// result of search (if result != -1 - there is a match)
				result = mailStr.search(regex);

				if(result > -1){
					filteredArr.push(currMail);
				}
			}
		}
		
		$("#messageListView").empty();
		initMailList(filteredArr);
		showMailDetails(filteredArr);
	}
}


// clear event of search box in jquery-mobile
$(document).on('click', '.ui-input-clear', function () {
	clearSearchField();
});

//TEST
function setPositionOfSearchField() {
	var searchBoxWith = $("#searchPlaceholder").width() - $("#searchButton").outerWidth(true);
	$("#searchField").css({"width":searchBoxWith});
}

$(window).on("orientationchange",function(){
    setTimeout(function(){ 
        var searchBoxWith = $("#searchPlaceholder").width() - $("#searchButton").outerWidth(true) - 1;
	    $("#searchField").css({"width":searchBoxWith});
    }, 200);
  });

function clearSearchField() {
	$("#messageListView").empty();
	$('#searchBox').val("");
	initMailList(allMails);
    showMailDetails(allMails);
}

//hide keyboard by pressing "go" button
$(document).ready(function() {
    $('#searchBox').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if ((code == 13) || (code == 10)) {
            $(this).blur();
            $('#searchButton').trigger('click');
        }
    });
});