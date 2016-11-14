// Test commit
//second Commit


// тук имам още 1 промяна от проекта


var allAccounts;

function execAvailOnDevReady() {
    setLanguage().then(function(){
        $("#pageTitle").html(getPageTitle('AccountsSummary'));
        $(".loggedUser").html(getLoggedUser());
        setPositionOfSearchField();
        
        if (!isOnline() || !isInternetEnabled()) {
            initAvailOfflineData();
        } else {
            initAvailScreen();
        } 
    });
}

function initAvailScreen() {
    
    callGetAccountInfoWS()
    .then(function(result, accountData){
        console.log("result " + result);
        allAccounts = accountData;
        updateDropdownMenu(accountData);
        // Submit button rules                
        $("#submitReq").click(function() {
            validateReqAmmountValue(accountData);
        });

        $("#lastAFButton").click(function() {
            window.location = "lastAF.html?" + encodeContract($("#account option:selected").val(), "",
                $("#account option:selected").text());
        }); 
    })
    .fail(function error(err) {
        if(err == "timeout"){
            initAvailOfflineData();
        } else if (err == 6) {
            alertMessage(localizeStringForKey("AM.noStatement"), localizeStringForKey("AT.noStatement"));
        } else {
            alertMessage("error code: " + err);
        }
    })
}

/**
 * @param accountData
 * @param index
 */
function accountChanged(accountData, index) {
    var count = accountData.length;
    if (index < count) {
        console.log("Selected account: " + JSON.stringify(accountData[index]));
        $("#reqAmount").val("");

        //define variables
        FIU = parseFloat(accountData[index].curFiU);
        totalFundableAmount = parseFloat(accountData[index].totalFiU);
        maxAllowedAvailability = parseFloat(accountData[index].maxAvail);
        accDetCode = accountData[index].code;

        blockedAmount = parseFloat(accountData[index].blckAmnt);
        pendingCosts = parseFloat(accountData[index].pendCsts);
        pendingPayments = parseFloat(accountData[index].pendPaym);
        CashReserves = parseFloat(accountData[index].cashRsrv);
        cashInTransfer = parseFloat(accountData[index].cashTrns);

        updateStatusOfAccountDetails(accountData[index].code);
        if(accountData[index].bankAccs[0] != undefined){
            updateBankAccountSelectedField(accountData[index].code, accountData[index].bankAccs[0].bankAccountCode);
            bankAccountCode = accountData[index].bankAccs[0].bankAccountCode;
            bankAccountNumber = accountData[index].bankAccs[0].accountNumber;
        } else{
            bankAccountCode = null;
            bankAccountNumber = null;
            deselectBankAccounts();
        }

        //plug in values
        $("#amountAvail").html(formatAmmount(formatNbr(maxAllowedAvailability), accountData[index].currency));
        $("#currentFIUSpan").html(formatAmmount(formatNbr(FIU), accountData[index].currency));

        //Define class positive or negative
        if ((maxAllowedAvailability <= 0) || (maxAllowedAvailability < FIU || totalFundableAmount <= 0)) {
            $("#availabilityZone").removeClass('positiveAvail').addClass('negativeAvail');
            $("#FIUleftBar").removeClass('positiveBar').addClass('negativeBar');

            $('#submitReq').prop('disabled', true);
            $('#submitReq').prop('refresh');

            $("#bankAcc").attr("disabled", "disabled");
            $("#reqAmount").attr("disabled", "disabled");
        } else {
            $("#availabilityZone").removeClass('negativeAvail').addClass('positiveAvail');
            $("#FIUleftBar").removeClass('negativeBar').addClass('positiveBar');

            $('#submitReq').prop('disabled', false);
            $('#submitReq').prop('refresh');

            $("#bankAcc").removeAttr("disabled");
            $("#reqAmount").removeAttr("disabled");
        }

        //Generate the bar
        $("#FIUtitle").html(localizeStringForKey("FiU/FA"));

        widthWindow = $(window).width();
        var FIUleft;
        var FIURatio;

        if (totalFundableAmount <= 0 || maxAllowedAvailability <= 0) {
            FIURatio = 1.0;
        } else if (FIU <= 0) {
            FIURatio = 0;
        } else {
            var min = Math.min(totalFundableAmount, maxAllowedAvailability);
            FIURatio = ((FIU + cashInTransfer + CashReserves + pendingPayments + pendingCosts + blockedAmount) / min);
        }
        FIUleft = FIURatio * widthWindow;
        if (FIUleft == 0)
            // if FIUleft == 0 - there is a problem with visualization
            FIUleft = 1; 

        $("#FIUleftBar").css('width', FIUleft);
        if (FIURatio < 1.0) {
            $("#availBar").css('display', 'table-row');
            $("#noAvailBar").css('display', 'none');
        } else {
            $("#availBar").css('display', 'none');
            $("#noAvailBar").css('display', 'table-row');
        }

        console.log("FIUleft: " + FIUleft);

        bankAccs = accountData.length > index ? accountData[index].bankAccs : null;

        $("#bankAcc").empty();
        for (var i = 0, l = (bankAccs != null ? bankAccs.length : 0); i < l; i++) {
            $("#bankAcc").append('<option value="' + bankAccs[i].accountNumber + '">' + bankAccs[i].bankName + '</option>');
        }
        $("#bankAcc").selectmenu('refresh', true);
    }
}
    
function updateDropdownMenu(accountData) {
    $("#account").empty();
    var length = accountData.length;
    for (var i = 0; i < length; i+=1) {
        $("#account").append('<option value="' + accountData[i].code + '">' + accountData[i].label + '</option>');
        // $("#accList").append('<li>' + accountData[i].label + '</li>');
        
        
    }
    $("#account").selectmenu('refresh', true);

    var selectedAccound;
    $("#account").change(function() {
        selectedAccound = this.selectedIndex;
        accountChanged(accountData, selectedAccound);
        if (this.selectedIndex >= 0 && (this.selectedIndex < (accountData != null ? accountData.length : 0))) {
            sessionStorage.setItem("caseSelected", accountData[this.selectedIndex].code);
        } else {
            sessionStorage.setItem("caseSelected", null);
        }
    })

    $("#bankAcc").change(function() {
        console.log("selected index: " + this.selectedIndex);
        bankAccountCode = accountData[selectedAccound].bankAccs[this.selectedIndex].bankAccountCode;
        updateBankAccountSelectedField(accountData[selectedAccound].code, bankAccountCode);
        bankAccountNumber = accountData[selectedAccound].bankAccs[this.selectedIndex].accountNumber;
    })

    // restore former selection if possible
    var caseSelected = sessionStorage.getItem("caseSelected");
    if (caseSelected != null) {
        var accountIdx = getAccountIndex(accountData, caseSelected);
        if (accountIdx >= 0) {
            $("#account")[0].selectedIndex = accountIdx;
        } else {
            if (accountData != null && accountData.length > 0) {
                $("#account")[0].selectedIndex = 0;
                sessionStorage.setItem("caseSelected", accountData[0].code);
            } else {
                sessionStorage.setItem("caseSelected", null);
            }
        }
    } else {
        sessionStorage.setItem("caseSelected", (accountData != null && accountData.length > 0) ? accountData[0].code : null);
    }

    $("#account").change();
}

/**
 * @param accountData
 * @param account
 * @returns {Number}
 */
function getAccountIndex(accountData, account) {
    var count = accountData.length;
    for (i = 0; i < count; i += 1) {
        if (accountData[i].code == account) {
            return i;
        }
    }
    return -1;
}

/**
 * @param bankAccountData
 * @param bankAccaount
 * @returns {Number}
 */
function getBankAccountIndex(bankAccountData, bankAccaount) {
    var count = bankAccountData.length;
    for (i = 0; i < count; i += 1) {
        if (bankAccountData[i].bankName == bankAccaount) {
            return i;
        }
    }
    return -1;
}

function validateReqAmmountValue(accountData) {
    reqAmmountValue = $("#reqAmount").val();
    console.log("Requested amount : " + reqAmmountValue);
    var username = getUsername();

    if ( !isNumber(reqAmmountValue)) {
        console.log("Requested amount NaN: " + reqAmmountValue);
        alertMessage(localizeStringForKey("AM.invalidValue"), localizeStringForKey("AT.invalidValue"));
        $("#reqAmount").val("");
        $("#reqAmount").focus();
        return;
    }

    var reqValue = parseFloat(reqAmmountValue);
    accountId = $("#account").val();
    accountLabel = $("#account option:selected").text();

    var account = null;
    index = getAccountIndex(accountData, accountId);
    if (index >= 0) {
        account = accountData[index];
    }

    bankLabel = $("#bankAcc option:selected").text();
    var bankAccCode = null;
    bankAccIndex = getBankAccountIndex(account.bankAccs, bankLabel)
    if (bankAccIndex >= 0) {
        bankAccCode = account.bankAccs[bankAccIndex].bankAccountCode;
    }

    maxAvail = account != null ? account.maxAvail : 0;
    currency = account != null ? account.currency : "";

    bankAcc = $("#bankAcc").val();

    if (reqValue > maxAvail) {
        console.log("Not enough availability");
        alertMessage(localizeStringForKey("AM.notEnoughAvail") + formatAmmount(formatNbr(maxAvail), currency), 
            localizeStringForKey("AT.notEnoughAvail"));
        $("#reqAmount").val("");
        $("#reqAmount").focus();
        return;
    } else if (reqValue <= 0) {
        console.log("Requested amount should be positive");
        alertMessage(localizeStringForKey("AM.negativeReqAmount"), localizeStringForKey("AT.negativeReqAmount"));
        $("#reqAmount").focus();
        return;
    } else {
        // confirm payment
        var data = {
            login: trimParameter(username),
            account: accountId,
            amount: reqValue,
            bankAccount: bankAcc,
            currency: currency
            
        }

        navigator.notification.confirm(String.format(localizeStringForKey("AM.confirmPmnt"), reqValue, currency, bankAccCode),
            executePaymentRequest, 
            localizeStringForKey("AT.confirmPmnt"), [localizeStringForKey("no"), localizeStringForKey("yes")]);

        function executePaymentRequest(button) {
            if (button == 2) {
                if (!isOnline() || !isInternetEnabled()) {
                    createDBPayment(reqValue, currency);
                } else {
                    requestPayment(data);
                }
            } else {
                $("#reqAmount").val("");
                $("#reqAmount").focus();
            }
        }
        return;
    }
}

function requestPayment(data) {
    // request payment
    serverUrl = getMethodEndpoint("requestPayment");
        
    $.ajax({
        async: true,
        type: "post",
        url: serverUrl,
        data: {
            login: data.login,
            account: data.account,
            amount: data.amount,
            bankAccount: data.bankAccount
        },
        dataType: "xml",
        cache: false,
        timeout: ajaxTimeout,

        beforeSend: function(XMLHttpRequest) {
            console.log(currentDate() + " - start  requst: ", data.id);
        },
        complete: function(XMLHttpRequest, textStatus) {            
            console.log(currentDate() + " - requst  completed: ", data.id);
        },

        success: function(xml) {
            console.log(currentDate() + " - success requst: ", data.id);
            alertMessage(processMessage(xml, data));
            window.location = "Availability.html";

        },
        error: function(xhr, textStatus, thrownError) {
            console.log(currentDate() + " - Do processMessage.error: " + textStatus);
            
            if (thrownError == "timeout"){
                createDBPayment(data.amount, data.currency);                   
            } 
        }
    })
}

function processMessage(xml, data) {
    var result;
    var requestId;
    var message;
    
    $(xml).find('StringResult').each(function() {
        result = parseInt($(this).find('result').text());
        requestId = $(this).find('value').text();
    })
    console.log("requestId: " + requestId);

    switch (result) {
    case 1:
        message = localizeStringForKey("AM.reqSaved") + requestId + ".", localizeStringForKey("AT.reqSaved");            
        console.log(currentDate() +  " - our request for payment was saved and is now pending approval ", data.id);
        break;
    case 6:
        console.log("Your global availability now seems to be negative ", data.id);
        message = localizeStringForKey("AM.noAvail"), localizeStringForKey("AT.noAvail");
        break;
    case 9:
        console.log("our account is currently locked. ", data.id);
        message = localizeStringForKey("AM.blockedAcc"), localizeStringForKey("AT.blockedAcc");
        break;
    default:
        console.log("Undefined error ", data.id);
        message = localizeStringForKey("AM.undefErr");
    }
    return message;
}

function createDBPayment(reqValue, currency) {
    if(bankAccountCode != null){
        var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
        createPaymentRequest(reqValue, bankAccountNumber, accDetCode, currency, userId, "not sent");
        alertMessage(localizeStringForKey("AM.reqSavedOfflMode"), localizeStringForKey("AM.offlineMode"));
    } else {
        alertMessage(localizeStringForKey("AM.invalidBankAcc"));
    }  
    $("#noConnectionAlert").slideDown("slow");
    $("#reqAmount").val("");
    $("#reqAmount").focus();
    $('#submitReq').prop('disabled', false);
    reloadMenu(true);
}

function initAvailOfflineData() {
    var downloadedAccDetails;
    var downloadedBankAcc;
    var accountData = [];
    var index;
    
    // we must call fetchData() after execution of getAllAccountDetailsByType & getBankAccounts
    $.when(getAllAccountDetailsByType("screen"), getBankAccounts()).then(function (accData, bankData) {
        downloadedAccDetails = accData;
        console.log("AccountDetails code: " + downloadedAccDetails[0].code);
        
        downloadedBankAcc = bankData;
        fetchData();
    })

    function fetchData() {
        var length = downloadedAccDetails.length;
        for (var i = 0; i < length; i+=1) {
            var accountDetails = new Object();
            if (downloadedAccDetails[i].selected == 1) {
                index = i;
            }
            accountDetails.id = downloadedAccDetails[i].id;
            accountDetails.userId = downloadedAccDetails[i].userId;

            accountDetails.avail = downloadedAccDetails[i].availability;
            accountDetails.maxAvail = downloadedAccDetails[i].maxAvailability;
            accountDetails.code = downloadedAccDetails[i].code;
            accountDetails.currency = downloadedAccDetails[i].currency;
            accountDetails.curFiU = downloadedAccDetails[i].curFIU;
            accountDetails.totalFiU = downloadedAccDetails[i].totalFIU;
            accountDetails.label = downloadedAccDetails[i].label;

            accountDetails.cashTrns = downloadedAccDetails[i].cashInTransfer;
            accountDetails.cashRsrv = downloadedAccDetails[i].cashReserves;
            accountDetails.pendPaym = downloadedAccDetails[i].pendingPayments;
            accountDetails.pendCsts = downloadedAccDetails[i].pendingCosts;
            accountDetails.blckAmnt = downloadedAccDetails[i].blockedAmount;

            var bankAccs = [];

            for (var j = 0; j < downloadedBankAcc.length; j++) {
                if (downloadedBankAcc[j].accDetailsId == downloadedAccDetails[i].id) {
                    var bankAcc = new Object();
                    bankAcc.id = downloadedBankAcc[j].id;
                    bankAcc.accDetailsId = downloadedBankAcc[j].accDetailsId;

                    bankAcc.accountNumber = downloadedBankAcc[j].accountNumber;
                    bankAcc.bankName = downloadedBankAcc[j].bankName;
                    bankAcc.bankAccountCode = downloadedBankAcc[j].bankAccountCode;
                    bankAcc.selected = downloadedBankAcc[j].selected;
                    bankAcc.dateCreated = downloadedBankAcc[j].dateCreated;

                    bankAccs.push(bankAcc);
                }
            }
            accountDetails.bankAccs = bankAccs;
            accountData.push(accountDetails);
        }
        accountChanged(accountData, index);
        updateDropdownMenu(accountData);
        allAccounts = accountData;
    }

    $("#submitReq").click(function() {
        validateReqAmmountValue(accountData);
    });

    $("#lastAFButton").click(function() {
        window.location = "lastAF.html?" + encodeContract($("#account option:selected").val(), "", 
            $("#account option:selected").text());
    });
}

/**
 * search string in Array of objects
 * @returns new array  
 */
function searchInAccounts(accArr, searchExpression) {
	var deferred = $.Deferred();
	var count = accArr.length;
	
	var result;
	var filteredArr = [];
	
	//regex expression	
	var regex = new RegExp(searchExpression,"igm");
	
	for (var i = 0; i < count; i++) {			
			result = accArr[i].label.search(regex);			
			if(result > -1){
				filteredArr.push(accArr[i]);
			}
	}
	
	console.log("count of new arr: " + filteredArr.length);
	
	deferred.resolve(filteredArr); 
	return deferred.promise();
}

function prepareAccountsSearch(searchValue) {
	var splitSearchVal = [];
	var searchExprArr = [];
	var searchExpression = "";
	
	// split search value in new arr
	splitSearchVal = searchValue.split(" ");
	for(var i = 0; i <splitSearchVal.length; i+=1){
		// remove all empty strings
		if(splitSearchVal[i] !=""){
			searchExprArr.push(splitSearchVal[i]); // save all words in array
		}
	}
	
	//prepare regular expression	
	for(var i=0; i<searchExprArr.length; i+=1){
		searchExpression = searchExpression + "(.*" + searchExprArr[i] + ")";		
	}

	if(trimParameter(searchExpression) == ""){
		clearSearchField();
	} else {
		searchInAccounts(allAccounts, searchExpression).then(function(filteredArr){
			if(filteredArr.length > 0){
				updateDropdownMenu(filteredArr);
			} else {
				alertMessage("nonexistent account");
				$('#searchBox').val("");
				updateDropdownMenu(allAccounts);
			}
		})
	}
}

function clearSearchField() {
	$('#searchBox').val("");
	updateDropdownMenu(allAccounts);
}

//clear search box in jquery-mobile
$(document).on('click', '.ui-input-clear', function () {
	clearSearchField();
});

//TEST
function setPositionOfSearchField() {
	var searchBoxWith = $("#searchPlaceholder").width() - $("#searchButton").outerWidth(true) - 1;
	$("#searchField").css({"width":searchBoxWith});
}

$(window).on("orientationchange",function(){
    setTimeout(function(){ 
        var searchBoxWith = $("#searchPlaceholder").width() - $("#searchButton").outerWidth(true);
	    $("#searchField").css({"width":searchBoxWith});
    }, 200);
  });

//hide keyboard by pressing "go" button
$(document).ready(function() {
    $('#reqAmount').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if ((code == 13) || (code == 10)) {
            $(this).blur();
            $('#submitReq').trigger('click');
        }
    });
    
    $('#searchBox').keypress(function(e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if ((code == 13) || (code == 10)) {
            $(this).blur();
            $('#searchButton').trigger('click');
        }
    });
});