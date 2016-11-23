var paymentRequests;

function execOfflineReqOnDevReady() {
    setLanguage().then(function(){
        $("#pageTitle").html(getPageTitle('offlineReqs'));
        $(".loggedUser").html(getLoggedUser());
        // get Data from DB  
        getAllPaymentRequests().then(function(requests){
            paymentRequests = requests;
            loadOfflineReqScreen();
            
          //прави се проверка дали има плащания, които докато са се извършвали програмата е крашнала
            checkMultiplePayments()
            .then(function(xml){
                if(xml){
                    processPayment(xml);
                    
                    $('.submitButton').remove();
                    $('.deleteAllButton').remove();
                    $(".progressBar").remove();
                    $.unblockUI();
                }
            });
        });
    });
}

/**
 *  if there are pending requests - create and fill-in table 
 */
function loadOfflineReqScreen() {
    if (paymentRequests.length == 0) {
        alertMessage(localizeStringForKey("AM.noPendingOrder"));
        return;
    }
    
    // create Table (actually this is a list)
    for (var i = 0; i < paymentRequests.length; i++) {
        createTableRow (paymentRequests[i].id, paymentRequests[i].accDetCode, paymentRequests[i].bankAccount, 
            paymentRequests[i].status, paymentRequests[i].amount, paymentRequests[i].currency, paymentRequests[i].dateCreated)
    }
    
    // "Delete All" & "Submit All" buttons
    createFormsButtons();
    onDeletePmntBtnPressed();
    onSubmitAllBtnPressed();
    onDeleteAllBtnPressed();
}

/** 
 * fill-in the table
 * @param id, accoundCode, backAccCode, status, amount, date
 */
function createTableRow (id, accoundCode, backAccCode, status, amount, currency, date) {
    
    // create new row of list
    var newRow = document.createElement("li");
    newRow.setAttribute("data-icon", "false");
    newRow.setAttribute("class", "newRow");
    newRow.setAttribute("id", id);
    
    createAccElements(newRow, accoundCode);    
    createStatusLabel(newRow, id, status);
    addEmptyRow(newRow);  
    createBankElements(newRow, backAccCode);
    addEmptyRow(newRow);  
    createAmountElements(newRow, amount, currency);
    createDeleteBtn(newRow, id);
    addEmptyRow(newRow);
    createDateElements(newRow, date); 

    var newPendingOrder = document.getElementById("listview-pending");
    newPendingOrder.appendChild(newRow);
}

function createAccElements(newRow, accoundCode) {
    var accountLabel = document.createElement("span");
    accountLabel.setAttribute("class", "accountCodeElement");
    var accountLabelTxt = document.createTextNode(localizeStringForKey("accountLbl"));
    accountLabel.appendChild(accountLabelTxt);

    var accountCode = document.createElement("span");
    accountCode.setAttribute("class", "accountCodeElement");
    var accountCodeValue = document.createTextNode(accoundCode); 
    accountCode.appendChild(accountCodeValue);
    
    newRow.appendChild(accountLabel);
    newRow.appendChild(accountCode);   
}

function createStatusLabel(newRow, id, status) {
    var statusLabel = document.createElement("span");
    statusLabel.setAttribute("class", "statusElement");
    statusLabel.setAttribute("id", id);

    if(status == localizeStringForKey("statLblInPr")){ // TODO  what to do in this situation; in the moment just set status label to "fail"
//        status = localizeStringForKey("statLblFail");
    	status = localizeStringForKey("statLblInPr");
    }

    var statusValue = document.createTextNode(status);
    statusLabel.appendChild(statusValue);
    
    newRow.appendChild(statusLabel);
}

function createBankElements(newRow, backAccCode) {
    var bankAccountLabel = document.createElement("span");
    bankAccountLabel.setAttribute("class", "bankAccountCodeElement");
    var bankAccountTxt = document.createTextNode(localizeStringForKey("bankAccLbl"));
    bankAccountLabel.appendChild(bankAccountTxt);

    var bankAccountCode = document.createElement("span");
    bankAccountCode.setAttribute("class", "bankAccountCodeValue");
    var bankAccountCodeTxt = document.createTextNode(backAccCode);
    bankAccountCode.appendChild(bankAccountCodeTxt);
    
    newRow.appendChild(bankAccountLabel);
    newRow.appendChild(bankAccountCode);
}

function createAmountElements(newRow, amount, currency) {
    var amountLabel = document.createElement("span");
    amountLabel.setAttribute("class", "amountElement");
    var amountTxt = document.createTextNode(localizeStringForKey("amountLbl"));
    amountLabel.appendChild(amountTxt);     

    var amountValue = document.createElement("span");
    amountValue.setAttribute("class", "amountValue");
    var amountValueText =  document.createTextNode(amount + " " + currency);
    amountValue.appendChild(amountValueText);
    
    newRow.appendChild(amountLabel);
    newRow.appendChild(amountValue);
}

// separator (delimiter) between the rows 
function addEmptyRow(newRow) {
    var emptyRow;
    emptyRow = document.createElement("div");
    emptyRow.setAttribute("class", "clearfix");
    newRow.appendChild(emptyRow);
}

function createDateElements(newRow, date) {
    var dateLabel = document.createElement("span");
    dateLabel.setAttribute("class", "dateElement");
    var dateElementText = document.createTextNode(localizeStringForKey("dateLbl"));
    dateLabel.appendChild(dateElementText);

    var dateValue =  document.createElement("span");
    dateValue.setAttribute("class", "dateValue");
    var dateValueTxt = document.createTextNode(date);
    dateValue.appendChild(dateValueTxt);
    
    newRow.appendChild(dateLabel);
    newRow.appendChild(dateValue);
}

function createDeleteBtn(newRow, id) {
    var deleteButton = document.createElement("button");
    deleteButton.setAttribute("id", id);
    deleteButton.setAttribute("class", "deleteBtn");
    var btnName = document.createTextNode(localizeStringForKey("deleteBtn"));
    deleteButton.appendChild(btnName);
    
    newRow.appendChild(deleteButton);
}

function deleteAllPendingRequests() {
    // delete from DB
    deleteAllPaymentRequests(); 

    // delete from UI
    $("#listview-pending").remove()
    $("#noConnectionAlert").hide();
    $(".submitButton").remove();
    $(".deleteAllButton").remove();    
//    reloadMenu();
}

function deletePendingReqById(id) {
    deletePaymentRequest(id);
    document.getElementById(id).remove();                
    reloadData();
}

function updateStatusLabel(id, status){
    // update UI
    var currElement = 'ul.offlinePaymentListview li #' + id + '.statusElement';
    $(currElement).html(status);
    if(status == localizeStringForKey("statLblNotSent")) {
        $(currElement).css({"background":"red"});
    }
    else if (status == localizeStringForKey("statLblInPr")) {
        $(currElement).css({"background":"orange"});
    }
}

function createFormsButtons() {
    // create "Submit All" button     
    var submitButton = document.createElement("button");
    submitButton.setAttribute("class", "submitButton");
    var btnName = document.createTextNode(localizeStringForKey("submitAllBtn"));
    submitButton.appendChild(btnName); 

    var formButtons = document.getElementById("formButtons");
    formButtons.appendChild(submitButton);

    var winWidth = $(window).width();
    var winHeight = $(window).height();

    // set position
    $(".submitButton").parent().css({position: 'relative'});
    $(".submitButton").css({
        "width": winWidth/2,
        "height": "45px",
        "position": "fixed",

        // screen.width - submitButton.height
        "top": winHeight - 45, 

        "left": winWidth/2,
        "background": "limegreen",
        "border": "solid grey 2px"
    });
    // submitButton.height = 45px
    $("#listview-pending").css({"margin-bottom" : "45px"}); 

    // create "Delete All" Button     
    var deleteAllButton = document.createElement("button");
    deleteAllButton.setAttribute("class", "deleteAllButton");
    var deleteAllbtnName = document.createTextNode(localizeStringForKey("deleteAllBtn"));
    deleteAllButton.appendChild(deleteAllbtnName); 

    formButtons.appendChild(deleteAllButton);

    $(".deleteAllButton").parent().css({position: 'relative'});
    $(".deleteAllButton").css({
        "width": winWidth/2,
        "height": "45px",
        "position": "fixed",
        "top": winHeight - 45, 
        "background": "rgb(208, 20, 20)",
        "border": "solid grey 2px"
    });
}

/**
 * delete item from the list
 */
function onDeletePmntBtnPressed(){
    $('ul.offlinePaymentListview li button').bind('click', function(event, ui) {
        var id = parseInt($(this).attr('id'));
        navigator.notification.confirm(localizeStringForKey("AM.deleteSingleReq"), 
            function(button){
            if (button == 2)
                deletePendingReqById(id)
        }, localizeStringForKey("AT.deleteSingleReq"), [localizeStringForKey("no"), localizeStringForKey("yes")]); 

    });
}

/**
 * submit all 
 */
function onSubmitAllBtnPressed() {
    $(".submitButton").click(function() {
        if (!isOnline() || !isInternetEnabled()) {
            alertMessage(localizeStringForKey("AM.noIntConn"), localizeStringForKey("AM.offlineMode"));
        } else {
            navigator.notification.confirm(localizeStringForKey("AM.submitAllReq"),
                function(button) {
                if (button == 2) {
                    createProgressBar();
                    requestMultiplePayments()
                    .then(function(xml){
                        updatePaymentRequests(xml);
                        checkMultiplePayments()
                        .then(function(xml){
                            processMultiplePayments(xml);
                        })
                        .fail(function error(err) {
                            alertMessage("ERROR");
                        });
                    })
                    .fail(function error(err) {
                        alertMessage("there is an Error");
                    });
                }
            }, localizeStringForKey("AT.submitAllReq"), [localizeStringForKey("no"), localizeStringForKey("yes")]);
        }          
    });
}

/**
 * delete all
 */
function onDeleteAllBtnPressed() {
    $(".deleteAllButton").click(function() {
        navigator.notification.confirm(localizeStringForKey("AM.deleteAllReq"), 
            function (button) {
            if (button == 2)
                deleteAllPendingRequests();
        }, localizeStringForKey("AT.deleteAllReq"), [localizeStringForKey("no"), localizeStringForKey("yes")]);
    });
}

function disableFormButtons() {
    $('.submitButton').prop('disabled', true);
    $('.deleteAllButton').prop('disabled', true);
    $('.deleteBtn').prop('disabled', true);
}

function createProgressBar() {
    var progressBarContainer = document.createElement("div");
    progressBarContainer.setAttribute("class", "progressBar");
    progressBarContainer.setAttribute("id", "progressBarContainer");

    var progressContainer = document.createElement("div");
    progressContainer.setAttribute("class", "progress");

    var progress = document.createElement("div");
    progress.setAttribute("class", "progress-bar progress-bar-striped active progress-bar-success");

    var progressPercent = document.createTextNode("");
    progress.appendChild(progressPercent);

    progressContainer.appendChild(progress);
    progressBarContainer.appendChild(progressContainer);

    document.getElementById("prBar").appendChild(progressBarContainer);

    progress.setAttribute("data-role","progressbar");
    $(".progress-bar").css({"width" : 1});    
}

function updateProgressBar() {
    var addend = $(".progress").width()/paymentRequests.length;
    var currentPercent = $(".progress-bar").width();
    var newPercent = currentPercent + addend;
    $(".progress-bar").css({"width" : newPercent});    
}

/**
 *  This function is equivalent to location.reload(), but is faster
 */
function reloadOfflineReqScreen() {
    $('.submitButton').remove();
    $('.deleteAllButton').remove();
    $(".progressBar").remove();
    $.unblockUI();

    //reload screen  
    $("#listview-pending").empty();  
    execOfflineReqOnDevReady(); 
}

/**
 * reload screen information
 */
function reloadData() {
    // get Data from DB
    getAllPaymentRequests().then(function(requests) {
        loadRequests(requests)
    });
    function loadRequests(requests) {
        paymentRequests = requests;

        if(requests.length == 0){
            $(".submitButton").remove();
            $(".deleteAllButton").remove();
            $("#noConnectionAlert").hide();
        }
    }
}

function requestMultiplePayments() {
    var deferred = $.Deferred();
    var stringOfPendingPayments;
    var serverUrl = getMethodEndpoint("requestMultiplePayments");
    var username = getUsername();
    var result;

    getAllPendingPayments().then(function(requests){
        stringOfPendingPayments = JSON.stringify(requests);
        
        $.ajax({
            async: true,
            type: "post",
            dataType: "xml",
            cache: false,
            timeout: ajaxTimeout,
            suppressGlCompleted: true,
            url: serverUrl,
            data: {
                login: trimParameter(username),
                paymentRequests: stringOfPendingPayments
            },
            beforeSend: function(XMLHttpRequest) {
                console.log(currentDate() + " - start  requst: ");
            },
            complete: function(XMLHttpRequest, textStatus) {            
                console.log(currentDate() + " - requst  completed: ");
            },
            success: function(xml) {
                var result;
                console.log(currentDate() + " - success requst: ");
                $(xml).find('PaymentResponseInfo').each(function() {
                    result = parseInt($(this).find('result').text());
                    console.log("rezultatyt e : " + result)
                });
                if(result == -1) {
                    deferred.resolve(xml);
                } else {
                    reloadOfflineReqScreen();
                    // alert("ERROR");
                    deferred.reject();
                }
            },
            error: function(xhr, textStatus, thrownError) {
                console.log(currentDate() + " - Pending Payment Error: " + textStatus);
                deferred.reject();	            
            }
        })	
    });
    return deferred.promise();
}



function updatePaymentRequests(xml) {
    var extId;
    var account;
    var bankAccount;
    var amount;
    
    $(xml).find('PaymentResponseInfo').each(function() {
        $(this).find('paymentResponse').each(function() {
            extId = $(this).find('extId').text();
            account =  $(this).find('account').text();
            bankAccount = $(this).find('bankAccount').text();
            amount = $(this).find('amount').text();
            paymentId = $(this).find('paymentId').text();

            updatePayment(extId, paymentId, "in progress");
        });
    });
}

function updateStatus(extId, status){
    updatePmntReqStatusById(extId, status);
    updateStatusLabel(extId, status)
}

function updatePayment(extId, paymentId, status){
    updatePmntReqStatus(extId, paymentId, status);
    updateStatusLabel(extId, status)
}

function checkMultiplePayments() {
    var deferred = $.Deferred();
    var stringOfPendingPayments;
    
    getAllPendingPaymentsWithServerId().then(function(requests){
        if(requests.length == 0){
            deferred.resolve();
            return;
        }
        
        stringOfPendingPayments = JSON.stringify(requests);
        serverUrl = getMethodEndpoint("checkMultiplePayments");
        username = getUsername();
        var result;

        $.ajax({
            async: true,
            type: "post",
            dataType: "xml",
            cache: false,
            timeout: ajaxTimeout,
            suppressGlCompleted: true,
            url: serverUrl,
            data: {
                login: trimParameter(username),
                paymentRequests: stringOfPendingPayments
            },

            beforeSend: function(XMLHttpRequest) {
                console.log(currentDate() + " - start  requst: ");
            },
            complete: function(XMLHttpRequest, textStatus) {            
                console.log(currentDate() + " - requst  completed: ");
            },

            success: function(xml) {
                deferred.resolve(xml);	
            },

            error: function(xhr, textStatus, thrownError) {
                console.log(currentDate() + " - Pending Payment Error: " + textStatus);
                $.unblockUI();
                deferred.reject();	            
            }
        })

    });
    return deferred.promise();
}

function processMultiplePayments(xml){
    if(xml){    
        var result;
        console.log(currentDate() + " - success requst: ");
        result = parseInt(xml.getElementsByTagName('result')[0].childNodes[0].nodeValue);
    
        if(result == 1) {
            deleteAllPendingRequests();
            alertMessage("All pending orders are sent successfully", "Request completed")
            reloadOfflineReqScreen();
        } else if (result == -1) {
            // payment is still in process    	
            processPayment(xml);    	
            setTimeout(function(){
                checkMultiplePayments()
                .then(function(xml){
                    processMultiplePayments(xml);
                });
            }, 3000);
    
            console.log("payment is still in process");
        } else if (result == -2) {
            // alert("ERROR");
            reloadOfflineReqScreen();
        } else if (result == 0) {
            // пращането е завършило със грешка за някои от рикуестите, но е завършило        
            //  обиколи всички записи които са останали, изтрии готовите, промени статуса на феилналите!    
            processPayment(xml);      
            reloadOfflineReqScreen();
    
        } else {
            alertMessage("error code: " + result, "ERROR");
            reloadOfflineReqScreen();
        }
    }
}

function processPayment(xml) {
    var paymentId;
    var extId; // local Id
    $(xml).find('PaymentResponseInfo').each(function() {
        $(this).find('paymentResponse').each(function() {
            result = parseInt($(this).find('result').text());
            paymentId = $(this).find('paymentId').text();
            extId = $(this).find('extId').text();
            console.log("result : " + result + " the paymentId is : " + paymentId + " the local is : " + extId );

            if (result == 1) {
                // delete record with current id, from local storage
                deletePaymentRequest(extId);
                document.getElementById(extId).remove();
                updateProgressBar();
            } else if (result == -2 ) {
                // change payment status of payment request to FAIL 
                updateStatus(extId, "Fail");
                updateProgressBar();
            } else if (result == -1) {
                // in this case - do nothing
            } else if (result == 0) {
                updateStatus("not sent", extId);
                updateStatus(extId, "not sent");
                updateProgressBar();
            } else {
                updateStatus(extId, "Fail");
                updateProgressBar();
            }
        })
    });
}
