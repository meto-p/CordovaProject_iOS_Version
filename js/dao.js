/**
 * @param Create Database
 */
var db;

function openDatabase(){
    db = window.sqlitePlugin.openDatabase({
        name: "Mobile.db",
        location: 2
    });
}

// fix bug in cordova
function enableForeignKeys() {
    db.executeSql('PRAGMA foreign_keys=ON;', [], function(res) {
        console.log('foreign_keys PRAGMA res: ' + JSON.stringify(res));
        // hack to make it work on Android - https://github.com/litehelpers/Cordova-sqlite-storage/issues/45
        db.executeSql('PRAGMA foreign_keys;', [], function(res) {
            console.log('foreign_keys PRAGMA res: ' + JSON.stringify(res));
        });
    });
}

function createDatabase() {
    var deferred = $.Deferred();
    openDatabase();

    db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS UserLogin (\
                       userId text primary key, \
                       userName  text, \
                       dateCreated  text, \
                       dateUpdated text)');
        db.executeSql("pragma table_info (UserLogin);");

        tx.executeSql('CREATE TABLE IF NOT EXISTS AccountDetails ( \
                       id integer primary key, \
                       userId text, \
                       type TEXT, \
                       availability real, \
                       maxAvailability real, \
                       code text, \
                       currency text, \
                       curFIU real, \
                       totalFIU real, \
                       label text, \
                       selected INTEGER, \
                       blockedAmount real, \
                       pendingCosts real, \
                       pendingPayments real, \
                       cashReserves real, \
                       cashInTransfer real, \
                       dateCreated  text, \
                       dateUpdated text, \
                       UNIQUE (userId, code, type), \
                       FOREIGN KEY(userId) REFERENCES UserLogin(userId) ON DELETE CASCADE )');
        
        db.executeSql("pragma table_info (AccountDetails);");

        // enable PRAGMA to use foreign keys constraint: it is OFF by default
        db.executeSql('PRAGMA foreign_keys=ON;', [], function(res) {
            console.log('foreign_keys PRAGMA res: ' + JSON.stringify(res));
            // hack to make it work on Android - https://github.com/litehelpers/Cordova-sqlite-storage/issues/45
            db.executeSql('PRAGMA foreign_keys;', [], function(res) {
                console.log('foreign_keys PRAGMA res: ' + JSON.stringify(res));
            });
        });

        tx.executeSql('CREATE TABLE IF NOT EXISTS BankAccount (\
                        id integer primary key, \
                        accDetailsId  integer, \
                        accountNumber text, \
                        bankName text, \
                        bankAccountCode text, \
                        selected integer, \
                        dateCreated text, \
                        dateUpdated text, \
                        FOREIGN KEY(accDetailsId) REFERENCES AccountDetails(id) ON DELETE CASCADE)');
        db.executeSql("pragma table_info (BankAccount);");
        
        tx.executeSql('CREATE TABLE IF NOT EXISTS PaymentRequest (\
                        id integer primary key, \
                        amount real, \
                        bankAccount text, \
                        accDetCode text, \
        				currency text, \
                        userId text, \
        				serverId text, \
                        status text, \
                        dateCreated text, \
                        dateUpdated text, \
                        FOREIGN KEY(userId) REFERENCES UserLogin(userId) ON DELETE CASCADE )');

        db.executeSql("pragma table_info (PaymentRequest);", [], function(res) {
            console.log("PRAGMA res: " + JSON.stringify(res));
        }); 
        
        // create table Mails
        tx.executeSql('CREATE TABLE IF NOT EXISTS Mails ( \
                        id integer primary key, \
                        mailId text, \
                        sender text,\
                        senderId text, \
                        sentDate text, \
                        subject text, \
                        body text, \
                        contractId text, \
                        read integer, \
                        type text, \
                        userId text, \
                        status text, \
                        dateCreated  text, \
                        dateUpdated text, \
                        UNIQUE (mailId), \
                        FOREIGN KEY(userId) REFERENCES UserLogin(userId) ON DELETE CASCADE )');

        db.executeSql("pragma table_info (Mails);", [], function(res) {
            console.log("PRAGMA res: " + JSON.stringify(res));
        });
 
        // create table CallMeRequest
        tx.executeSql('CREATE TABLE IF NOT EXISTS CallMeRequest ( \
                        id integer primary key, \
                        code text,\
                        label text, \
                        motiveKey text, \
                        motiveValue text, \
                        phone text, \
                        subject text, \
                        body text, \
                        userId text, \
                        status text, \
                        dateCreated  text, \
                        dateUpdated text, \
                        FOREIGN KEY(userId) REFERENCES UserLogin(userId) ON DELETE CASCADE )');    

        tx.executeSql('CREATE TABLE IF NOT EXISTS OfflineRequests (\
                       offlineReqId integer primary key, \
                       paymentReqId INTEGER, \
                       mailId INTEGER, \
                       callMeReqId INTEGER, \
                       userId TEXT, \
                       dateCreated TEXT, \
                       dateUpdated TEXT, \
                       FOREIGN KEY(paymentReqId) REFERENCES PaymentRequest(id) ON DELETE CASCADE,\
                       FOREIGN KEY(mailId) REFERENCES Mails(id) ON DELETE CASCADE,\
                       FOREIGN KEY(callMeReqId) REFERENCES CallMeRequest(id) ON DELETE CASCADE)');

        db.executeSql("pragma table_info (OfflineRequests);", [], function(res) {
            console.log("PRAGMA res: " + JSON.stringify(res));
        });
        
        // create table DataMap
        tx.executeSql('CREATE TABLE IF NOT EXISTS DataMap (\
                       id integer primary key, \
                       key TEXT, \
                       value TEXT, \
                       type TEXT, \
                       dateCreated TEXT, \
                       dateUpdated TEXT)');
        
        // create table LastAssignment
        tx.executeSql('CREATE TABLE IF NOT EXISTS LastAssignment (\
                        accDetailsCode  TEXT, \
                        userId TEXT, \
                        afReference TEXT, \
                        refTo TEXT, \
                        amount INTEGER, \
                        currency TEXT, \
                        dateReceived  TEXT, \
                        status  TEXT, \
                        result  INTEGER, \
                        dateCreated TEXT, \
                        dateUpdated TEXT, \
                        primary key (userId, accDetailsCode),\
                        FOREIGN KEY(userId) REFERENCES UserLogin(userId) ON DELETE CASCADE)');
        
        db.executeSql("pragma table_info (LastAssignment);", [], function(res) {
            console.log("PRAGMA res: " + JSON.stringify(res));
        });
        
     // create table UserSettings
        tx.executeSql('CREATE TABLE IF NOT EXISTS UserSettings (\
                        selectedLanguage  TEXT )');
        
        db.executeSql("pragma table_info (UserSettings);", [], function(res) {
            console.log("PRAGMA res: " + JSON.stringify(res));
        });
        

    }, onError, onReadyTransaction);

    function onReadyTransaction() {
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * prepare AccountDetails to records data
 * @param accountDetails, type
 */
function populateAccountDetails(accountDetails, type){
    var deferred = $.Deferred();
    // delete accountDetails where: type == "screen"  AND call createAllAccountDetails(...)
    deleteAccountDetailsByType(type)
    .then(function (){
        createAllAccountDetails(accountDetails, type)
        .then(function(accountDetails){
            createAllBankAccounts(accountDetails)
            .then(function(accountDetails){
                deferred.resolve(accountDetails);
            })
        })
    });
    return deferred.promise();
}

/**
 * Creates accountDetails record
 * @param accountDetails, type
 */
function createAllAccountDetails(accountDetails, type) {
    var deferred = $.Deferred();
    var count = 0;
    var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    var accDetLength = accountDetails.length;
    var id;

    db.transaction(function(tx) {
        for (var i = 0; i < accDetLength; i+=1) {
            var curDate = currentDate();
            tx.executeSql('INSERT INTO AccountDetails \
                (userId , type, availability, maxAvailability, code, currency, curFIU, totalFIU, label, selected, \
                blockedAmount, pendingCosts, pendingPayments, cashReserves, cashInTransfer, dateCreated, dateUpdated) \
                VALUES  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',     
                [userId, type,  accountDetails[i].avail, accountDetails[i].maxAvail, 
                 accountDetails[i].code, accountDetails[i].currency, accountDetails[i].curFiU, accountDetails[i].totalFiU, 
                 accountDetails[i].label, accountDetails[i].selected, accountDetails[i].blckAmnt, accountDetails[i].pendCsts, 
                 accountDetails[i].pendPaym, accountDetails[i].cashRsrv, accountDetails[i].cashTrns, curDate, curDate], 
                 function(tx, res) {
                     id = res.insertId;
                     
                     accountDetails[count].id = id;  
                     accountDetails[count].type = type;
                     count++;
                });
        }
    },onError ,onReadyTransaction);
    
    function onReadyTransaction(){
        console.log("createAllAccountDetails stored in DB: " + currentDate());
        deferred.resolve(accountDetails);
    }
    
    
    return deferred.promise();    
}

function createAccountDetails(userId, type, availability, maxAvail, code, currency, curFIU, totalFIU, label, selected, 
                              blockedAmount, pendingCosts, pendingPayments, cashReserves,cashInTransfer) {
    
    var deferred = $.Deferred();
    var id;
    db.transaction(function(tx) {
        var curDate = currentDate();
        tx.executeSql('INSERT INTO AccountDetails \
            (userId , type, availability, maxAvailability, code, currency, curFIU, totalFIU, label, selected, \
            blockedAmount, pendingCosts, pendingPayments, cashReserves, cashInTransfer, dateCreated, dateUpdated) \
            VALUES  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',     
            [userId, type, availability, maxAvail, code, currency, curFIU, totalFIU, label, selected, 
                blockedAmount, pendingCosts, pendingPayments, cashReserves, cashInTransfer, curDate, curDate], 
             function(tx, res) {
                 id = res.insertId;
            });
    },onError ,onReadyTransaction);
    function onReadyTransaction(){
        deferred.resolve(id);
    }
    return deferred.promise();
}

function getAllAccountDetailsByType(type) {
    var deferred = $.Deferred();
    var accountDetailsArr = [];
    var selectedAccount = new Object();
    var countOfRows;

    // get data from DB
    db.transaction(function(tx) {
        tx.executeSql("select * from AccountDetails where userId = ?  and type = ? order by id;", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), type], function(tx, res) {
            countOfRows = res.rows.length;
            for (var i = 0; i < countOfRows; i++) {
                selectedAccount = {
                    id: res.rows.item(i).id,
                    userId: res.rows.item(i).userId,
                    type: res.rows.item(i).type,
                    availability: res.rows.item(i).availability,
                    maxAvailability: res.rows.item(i).maxAvailability,
                    code: res.rows.item(i).code,
                    currency: res.rows.item(i).currency,
                    curFIU: res.rows.item(i).curFIU,
                    totalFIU: res.rows.item(i).totalFIU,
                    label: res.rows.item(i).label,
                    selected: res.rows.item(i).selected,
                    blockedAmount: res.rows.item(i).blockedAmount,
                    pendingCosts: res.rows.item(i).pendingCosts,
                    pendingPayments: res.rows.item(i).pendingPayments,
                    cashReserves: res.rows.item(i).cashReserves,
                    cashInTransfer: res.rows.item(i).cashInTransfer,
                    dateCreated: res.rows.item(i).dateCreated,
                    dateUpdated: res.rows.item(i).dateUpdated,
               };  
               accountDetailsArr.push(selectedAccount);
            }
        });
    }, onError, success);

    function success() {
        console.log(accountDetailsArr);
        deferred.resolve(accountDetailsArr);
    }
    return deferred.promise();
}

function getAccountDetail(userId, code, callback){  // not in used at the moment
    var selectedAccount;
    db.transaction(function(tx) {
        tx.executeSql("select * from AccountDetails where userId = ? AND code = ? ;", [userId, code], function(tx, res) {
            selectedAccount = {
                               id: res.rows.item(0).id,
                               userId: res.rows.item(0).userId,
                               type: res.rows.item(0).type,
                               availability: res.rows.item(0).availability,
                               maxAvailability: res.rows.item(0).maxAvailability,
                               code: res.rows.item(0).code,
                               currency: res.rows.item(0).currency,
                               curFIU: res.rows.item(0).curFIU,
                               totalFIU: res.rows.item(0).totalFIU,
                               label: res.rows.item(0).label,
                               selected: res.rows.item(0).selected,
                               dateCreated: res.rows.item(0).dateCreated,
            };                              
        });
    }, onError, onReadyTransaction);

    function onReadyTransaction() {
        console.log(selectedAccount);
        callback(selectedAccount);
    }    
}

function deleteAccountDetailsByType(type) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from AccountDetails where type = ?", [type], function(tx, res) {
            console.log("deleteAccountDetails by type: " + type + " - successfully: " + currentDate());          
        }, function(e) {
            console.log("deleteAccountDetails - ERROR: " + e.message);
        });
    }, onError, onReadyTransaction);

    function onReadyTransaction() {
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * Update AccountDetails
 */
function updateStatusOfAccountDetails(selectedCode) {

    db.transaction(function(tx) {
        tx.executeSql("UPDATE AccountDetails SET selected = 0, dateUpdated = ? ", [currentDate()]);
        tx.executeSql("UPDATE AccountDetails SET selected = ?, dateUpdated = ?  WHERE code = ? AND userId = ? AND type = ?" , 
            [1, currentDate(), selectedCode, window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), "screen"]);
    });
}

/**
 *  create BankAccount records
 */
function createAllBankAccounts(accountDetails){
    var deferred = $.Deferred();
    var accDetLength = accountDetails.length;
    
    db.transaction(function(tx) {
        for (var i = 0; i < accDetLength; i+=1){
            for (var n = 0; n < accountDetails[i].bankAccs.length; n++) {
                var curDate = currentDate();
                tx.executeSql('INSERT INTO BankAccount (\
                    accDetailsId, accountNumber, bankName, bankAccountCode, selected, dateCreated, dateUpdated) \
                    VALUES (?, ?, ?, ?, ?, ?, ?)', 
                    [accountDetails[i].id, accountDetails[i].bankAccs[n].accountNumber, 
                     accountDetails[i].bankAccs[n].bankName, accountDetails[i].bankAccs[n].bankAccountCode, 0, curDate, curDate]);
            }
        }
    }, onError ,onReadyTransaction);    
    function onReadyTransaction() {
        console.log("createAllBankAccounts stored in DB: " + currentDate());
        deferred.resolve(accountDetails);
    }
    return deferred.promise();
}

/**
 *  create single BankAccount record
 */
function createBankAccount(accDetailId, accountNumber, bankName, bankAccountCode, selected) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        var curDate = currentDate();
        tx.executeSql('INSERT INTO BankAccount (\
                       accDetailsId, accountNumber, bankName, bankAccountCode, selected, dateCreated, dateUpdated) \
                       VALUES (?, ?, ?, ?, ?, ?, ?)', 
                       [accDetailId, accountNumber, bankName, bankAccountCode, selected, curDate, curDate]);
    }, onError, onReadyTransaction);    
    function onReadyTransaction(){
        deferred.resolve();
    }
    return deferred.promise();
}

function getBankAccounts() {
    var deferred = $.Deferred();
    var bankAccountArr = [];
    var selectedBankAccount = new Object();

    db.transaction(function(tx) {
        tx.executeSql("select * from BankAccount  order by id;", [], function(tx, res) {
            var countOfRows = res.rows.length;
            for (var i = 0; i < countOfRows; i++) {
                selectedBankAccount = {
                    id: res.rows.item(i).id,                  
                    accDetailsId: res.rows.item(i).accDetailsId,
                    accountNumber: res.rows.item(i).accountNumber,
                    bankName: res.rows.item(i).bankName,
                    bankAccountCode: res.rows.item(i).bankAccountCode,
                    selected: res.rows.item(i).selected,
                    dateCreated: res.rows.item(i).dateCreated,
                };  
                bankAccountArr.push(selectedBankAccount);
            }
        });
    }, onError, success);

    function success() {
        console.log(bankAccountArr);
        deferred.resolve(bankAccountArr);
    }
    return deferred.promise();
}

/**
 *  get count of rows in BankAccount table
 */
function getCountOfBankAccounts() {
    var deferred = $.Deferred();
    var countOfRows;
    
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from BankAccount;", [], function(tx, res) {
            console.log("res.rows.length: " + res.rows.item(0).cnt);
            countOfRows = res.rows.item(0).cnt;
        });
    }, onError, 
    function onSuccess() {
        deferred.resolve(countOfRows);
    });
    return deferred.promise();
}

function getBankAccountCode(callback){ // not in used at the moment
    var selectedBankAccount;
    db.transaction(function(tx) {
        tx.executeSql("select bankAccountCode from BankAccount where selected = 1 ;", [], function(tx, res) {
            selectedBankAccount = res.rows.item(0).bankAccountCode;
        });
    },onError ,onReadyTransaction);
    
    function onReadyTransaction() {
        callback(selectedBankAccount);
    } 
}

function updateBankAccountSelectedField(accountDetailsCode, bankAccCode) {
    db.transaction(function(tx) {
        tx.executeSql("SELECT id FROM AccountDetails WHERE code = ? AND userId = ? AND type = ?", 
                [accountDetailsCode, window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), "screen"], function(tx, res) {
            tx.executeSql("UPDATE BankAccount SET selected = 0 ");
            tx.executeSql("UPDATE BankAccount SET selected = 1, dateUpdated = ? WHERE bankAccountCode = ? AND accDetailsId = ?", 
                [currentDate(),  bankAccCode, res.rows.item(0).id])
        });
    }, onError);
}

function deselectBankAccounts() {
    db.transaction(function(tx) {
        tx.executeSql("UPDATE BankAccount SET selected = 0, dateUpdated = ?", [currentDate()]);
    });
}

function deleteBankAccount(bankAccountId) {
    db.transaction(function(tx) {
        tx.executeSql("delete from BankAccount where id = ?", [bankAccountId]);
    });
}


/**
 *  create PaymentRequest
 */
function createPaymentRequest(amount, bankAccount, accDetCode, currency, userId, status) {
    db.transaction(function(tx) {
        var curDate = currentDate();
        tx.executeSql('INSERT INTO PaymentRequest (\
            amount, bankAccount, accDetCode, currency, userId, serverId, status, dateCreated, dateUpdated) \
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [amount, bankAccount, accDetCode, currency, userId, null, status, curDate, curDate], 
        function(tx, res) {
            createOfflinePmntReq(res.insertId);            
        }, 
        function(e) {
            console.log("ERROR _ PaymentRequest: " + e.message);
        });
    });
}

function getAllPaymentRequests() {
    var deferred = $.Deferred();
    var paymentRequestArr = [];
    var countOfRows;
    var request = new Object();

    // get count of rows in PaymentRequest table
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from PaymentRequest where userId = ?;", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
            console.log("res.rows.length: " + res.rows.item(0).cnt);
            countOfRows = res.rows.item(0).cnt;
        });
    }, onError, function onSuccess() {
        getData();
    });

    function getData() {
        db.transaction(function(tx) {
            tx.executeSql("select * from PaymentRequest where userId = ? order by id;", 
                    [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
                for (var i = 0; i < countOfRows; i++) {
                    request = {
                        id: res.rows.item(i).id,
                        amount: res.rows.item(i).amount,
                        bankAccount: res.rows.item(i).bankAccount,
                        accDetCode: res.rows.item(i).accDetCode,
                        currency: res.rows.item(i).currency,
                        userId: res.rows.item(i).userId,
                        serverId: res.rows.item(i).serverId,
                        status: res.rows.item(i).status,
                        dateCreated: res.rows.item(i).dateCreated,
                    };
                    paymentRequestArr.push(request);
                };
            });
        }, onError, onReadyTransaction);

        function onReadyTransaction() {
            console.log("getPaymentRequest: " + request);
            console.log("bankAccount: " + request.bankAccount);
            deferred.resolve(paymentRequestArr); 
        }
    }
    return deferred.promise();
}

/**
 *  prepare pending payments to send to server
 */

function getAllPendingPayments() {
    var deferred = $.Deferred();
    var paymentRequestArr = [];
    var countOfRows;
    var request = new Object();

    // get count of rows in PaymentRequest table
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from PaymentRequest where userId = ?;", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
            console.log("res.rows.length: " + res.rows.item(0).cnt);
            countOfRows = res.rows.item(0).cnt;
        });
    }, onError, function onSuccess() {
        getData();
    });

    function getData() {
        db.transaction(function(tx) {
            tx.executeSql("select * from PaymentRequest where userId = ? order by id;", 
                    [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
                for (var i = 0; i < countOfRows; i++) {
                    request = {
                    	account: res.rows.item(i).accDetCode,
                        amount: res.rows.item(i).amount,
                        bankAccount: res.rows.item(i).bankAccount,
                    };
                    paymentRequestArr.push(request);
                };
            });
        }, onError, onReadyTransaction);

        function onReadyTransaction() {
            console.log("getPaymentRequest: " + request);
            console.log("bankAccount: " + request.bankAccount);
            deferred.resolve(paymentRequestArr); 
        }
    }
    return deferred.promise();
}


function getAllPendingPaymentsWithServerId() {
    var deferred = $.Deferred();
    var paymentRequestArr = [];
    var countOfRows;
    var request = new Object();

    // get count of rows in PaymentRequest table
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from PaymentRequest where userId = ?;", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
            console.log("res.rows.length: " + res.rows.item(0).cnt);
            countOfRows = res.rows.item(0).cnt;
        });
    }, onError, function onSuccess() {
        getData();
    });

    function getData() {
        db.transaction(function(tx) {
            tx.executeSql("select * from PaymentRequest where userId = ? AND status = ? order by id;", 
                    [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), "in progress"], function(tx, res) {
                for (var i = 0; i < countOfRows; i++) {
                    request = {
                    	account: res.rows.item(i).accDetCode,
                        amount: res.rows.item(i).amount,
                        bankAccount: res.rows.item(i).bankAccount,
                        paymentId: res.rows.item(i).serverId,
                    };
                    paymentRequestArr.push(request);
                };
            });
        }, onError, onReadyTransaction);

        function onReadyTransaction() {
            console.log("getPaymentRequest: " + request);
            console.log("bankAccount: " + request.bankAccount);
            deferred.resolve(paymentRequestArr); 
        }
    }
    return deferred.promise();
}


function updatePmntReqStatusById(id, status){
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("UPDATE PaymentRequest SET status = ?, dateUpdated = ?  WHERE id = ? AND userId = ?", 
                [status, currentDate(), id, window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
            console.log(currentDate() + " - Status updated to " + status + " " + id);
            
            deferred.resolve();
        }, function(e) {
            console.log("ERROR _ updateStatusOfPaymentRequest: " + id + e.message);
            deferred.reject(e.message);
        });
    },onError);
    return deferred.promise();
}

function updatePmntReqStatus(status, serverId, account, bankAccount, amount){
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("UPDATE PaymentRequest SET status = ?, serverId = ?, dateUpdated = ?  WHERE accDetCode = ? AND bankAccount = ? AND amount = ? AND userId = ?" ,
                [status, serverId, currentDate(), account, bankAccount, amount, window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
            console.log(currentDate() + " - Status updated to " + status);
            
            deferred.resolve();
        }, function(e) {
            console.log("ERROR _ updateStatusOfPaymentRequest: "+ e.message);
            deferred.reject(e.message);
        });
    },onError);
    return deferred.promise();
}


function deletePaymentRequest(id) {
    db.transaction(function(tx) {
        tx.executeSql("delete from PaymentRequest where id = ?", [id], function(tx, res) {
            console.log(currentDate() + " - request is deleted ", id);            
        }, function(e) {
            console.log("ERROR: " + e.message);
        });
        
    },onError);    
}

function deletePaymentRequestwithPaymentId(paymentId) {
    db.transaction(function(tx) {
        tx.executeSql("delete from PaymentRequest where serverId = ?", [paymentId], function(tx, res) {
            console.log(currentDate() + " - request is deleted ", paymentId);            
        }, function(e) {
            console.log("ERROR: " + e.message);
        });
        
    },onError);    
}

function deleteAllPaymentRequests(){
    db.transaction(function(tx) {
        tx.executeSql("delete from PaymentRequest where userId = ?", 
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)]);
    }, onError); 
}

/**
 * insert Mail 
 */
function createMail(mailId, sender, senderId, sentDate, subject, body, contractId, read, type, userId, status, dateCreated, dateUpdated) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        var curDate  = currentDate();
        tx.executeSql('INSERT INTO Mails (\
            mailId, sender , senderId, sentDate, subject, body, contractId, read, type, userId, status, dateCreated, dateUpdated) \
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [mailId, sender, senderId, sentDate, subject, body, contractId, read, type, userId, status, curDate, curDate], function(tx, res) {
                var id;
                id = res.insertId;
                deferred.resolve(id, tx);                   
            });
    }, onError);
    return deferred.promise();
}

/**
 * insert ReceivedMails
 */
function createReceivedMails(mailsData) {
    var deferred = $.Deferred();
    var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    var status = "status";
    var type = "received";
    var i;
    var count = mailsData.length;
    db.transaction(function(tx) {
        for (i = count-1; i >= 0; i-= 1) {
            var curDate  = currentDate();
            var mailId = mailsData[i].mailId, 
            sender = mailsData[i].sender, 
            senderId = mailsData[i].senderId, 
            sentDate = mailsData[i].sentDate, 
            subject = mailsData[i].subject, 
            body = mailsData[i].body, 
            contractId = mailsData[i].contractId, 
            read = mailsData[i].read;
            
        tx.executeSql('INSERT INTO Mails (\
            mailId, sender , senderId, sentDate, subject, body, contractId, read, type, userId, status, dateCreated, dateUpdated) \
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [mailId, sender, senderId, sentDate, subject, body, contractId, read, type, userId, status, curDate, curDate], function(tx, res) {
              
            });
        }
    }, onError, success);

    function success() {
        deferred.resolve();
    }
    return deferred.promise();
}

/**
 * extract all mails by type = "type"
 * @returns mailsArr - object containing all emails 
 */
function getMailsByType(type) { // this function deosn't use
    var deferred = $.Deferred();
    var mailsArr = [];
    var mail = new Object();

    db.transaction(function(tx) {
        tx.executeSql("select * from Mails where userId = ? AND type = ? order by id;", 
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), type], function(tx, res) {
            var countOfMails = res.rows.length;
            for (var i = countOfMails-1; i >= 0; i-=1) {
                mail = {
                    id: res.rows.item(i).id,
                    mailId: res.rows.item(i).mailId,
                    sender: res.rows.item(i).sender,
                    senderId: res.rows.item(i).senderId,
                    sentDate: res.rows.item(i).sentDate,
                    subject: res.rows.item(i).subject,
                    body: res.rows.item(i).body,
                    contractId: res.rows.item(i).contractId,
                    read: res.rows.item(i).read,
                    type: res.rows.item(i).type,
                    userId: res.rows.item(i).userId,
                    status: res.rows.item(i).status,
                    dateCreated: res.rows.item(i).dateCreated,
                    dateUpdated: res.rows.item(i).dateUpdated,
                };  
                mailsArr.push(mail);
            }
        });
    }, onError, success);

    function success() {
        deferred.resolve(mailsArr);
    }
    return deferred.promise();    
}

/**
 * get count of mails by type = "type"
 * @returns countOfMails
 */
function getCountOfMailsByType(type) {
    var deferred = $.Deferred();
    var countOfMails;
    
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from Mails where userId = ? AND type = ?;", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), type], function(tx, res) {
            console.log("count of mails: " + res.rows.item(0).cnt);
            countOfMails = res.rows.item(0).cnt;
        });
    }, onError, function onSuccess() {
        deferred.resolve(countOfMails);
       }
    );
    return deferred.promise();  
}


/**
 * extract all mails by types = "type" OR type2
 * @returns mailsArr - object containing all emails 
 */
function getMailsByTypes(type1, type2) {
    var deferred = $.Deferred();
    var mailsArr = [];

    db.transaction(function(tx) {
        tx.executeSql("select * from Mails where userId = ? AND (type = ? OR type = ?) order by id;", 
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), type1, type2], function(tx, res) {
            var countOfMails = res.rows.length;
            for (var i = countOfMails-1; i >= 0; i-=1) {
                var mail = new Object();
                mail = {
                    id: res.rows.item(i).id,
                    mailId: res.rows.item(i).mailId,
                    sender: res.rows.item(i).sender,
                    senderId: res.rows.item(i).senderId,
                    sentDate: res.rows.item(i).sentDate,
                    subject: res.rows.item(i).subject,
                    body: res.rows.item(i).body,
                    contractId: res.rows.item(i).contractId,
                    read: res.rows.item(i).read,
                    type: res.rows.item(i).type,
                    userId: res.rows.item(i).userId,
                    status: res.rows.item(i).status,
                    dateCreated: res.rows.item(i).dateCreated,
                    dateUpdated: res.rows.item(i).dateUpdated,
                };  
                mailsArr.push(mail);
            }
        });
    }, onError, success);

    function success() {
        deferred.resolve(mailsArr);
    }
    return deferred.promise();    
}

/**
 * get count of mails by types - type1, type2
 * @returns countOfMails
 */
function getCountOfMailsByTypes(type1, type2) {
    var deferred = $.Deferred();
    var countOfMails;
    
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from Mails where userId = ? AND (type = ? OR type = ?);", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), type1, type2], function(tx, res) {
            console.log("count of mails: " + res.rows.item(0).cnt);
            countOfMails = res.rows.item(0).cnt;
        });
    }, onError, function onSuccess() {
        deferred.resolve(countOfMails);
       }
    );
    return deferred.promise();  
}

/**
 * @param read - if read == true - return count of read mails; 
 *               if read == false - return count of unread mails
 * @returns count of read / unread mails
 */
function getCountOfReadMails(read) {
    var deferred = $.Deferred();
    var countOfMails;
    
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from Mails where userId = ? AND read = ?;", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), read], function(tx, res) {
            console.log("count of mails: " + res.rows.item(0).cnt);
            countOfMails = res.rows.item(0).cnt;
        });
    }, onError, function onSuccess() {
        deferred.resolve(countOfMails);
       }
    );
    return deferred.promise();  
}


/**
 * get last mail by type received
 * @returns countOfMails
 */
function getLastMail(type1, type2) {

    var deferred = $.Deferred();
    
    db.transaction(function(tx) {
        tx.executeSql("SELECT * FROM Mails where userId = ? AND (type = ? OR type = ?) ORDER BY mailId DESC LIMIT 1;", 
                [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), type1, type2], function(tx, res) {
            var lastMail = new Object();
            lastMail = res.rows.item(0);
            deferred.resolve(lastMail);
        });
    }, onError);
    return deferred.promise();  
}

/**
 *  update "read" & "type" & "status" fields;
 */ 
function updateMailFields(mailId, read, type, status){
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("UPDATE Mails SET read = ?, type = ?, status = ? , dateUpdated = ?  WHERE mailId = ? AND userId = ?" , 
            [read, type, status, currentDate(), mailId, window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
            var id;
            // get id of mail from DB
            tx.executeSql("SELECT id from Mails where mailId = ? ", [mailId], function(tx, res) {
                id = res.rows.item(0).id;
                deferred.resolve(id, tx);
            });              
        });
    }, onError);
    return deferred.promise(); 
}

/**
 *  update Mail "status" fields by id;
 */ 
function updateMailStatusField(id, status){
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("UPDATE Mails SET status = ? , dateUpdated = ?  WHERE id = ? AND userId = ?" , 
            [status, currentDate(), id, window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)], function(tx, res) {
            console.log("statusyt e promenen id: " + id + " " + currentDate());
            deferred.resolve();
        });
    }, onError);
    return deferred.promise(); 
}

/**
 * delete single mail by id
 * @param id
 */
function deleteMailById(id) {
    console.log("Start deleting... " + currentDate());
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from Mails where id = ?", [id], function(tx, res) {
        //  console.log(currentDate() + " - mail is deleted ", id);   
            deferred.resolve(id, tx);
            console.log("Finished deleting... " + currentDate());
        });        
    },onError); 
    return deferred.promise(); 
}

/**
 * delete all emails by type = "type" from DB
 */
function deleteMailsByType(type){
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from Mails where userId = ? AND  type = ?", 
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), type ]);
        deferred.resolve();
    }, onError); 
    return deferred.promise(); 
}

/**
 * delete all emails by date = "date" from DB
 */
function deleteMailsByDate(sentDate){
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from Mails where userId = ? AND  sentDate = ?", 
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), sentDate ], function(tx, res) {
            console.log("deleteMailsByDate completed... " + currentDate());
            deferred.resolve();
        });
    }, onError); 
    return deferred.promise(); 
}

/**
 * delete all mails from DB
 */
function deleteAllMails(){
    db.transaction(function(tx) {
        tx.executeSql("delete from Mails where userId = ?", 
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)]);
    }, onError); 
}

/**
 *create CallMeRequest
 */
function createCallMeRequest(code, label, motiveKey, motiveValue, phone, subject, body, userId, status, dateCreated, dateUpdated) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql('INSERT INTO CallMeRequest (\
            code , label, motiveKey, motiveValue, phone, subject, body , userId, status, dateCreated, dateUpdated) \
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [code, label, motiveKey, motiveValue, phone, subject, body , userId, status, dateCreated, dateUpdated], function(tx, res) {
                var id;
                id = res.insertId;
                deferred.resolve(id, tx);                
            });
    }, onError);
    return deferred.promise();
}

/**
 * delete callMeRequest by id
 * @param id
 */
function deleteCallMeRequestById(id) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from CallMeRequest where id = ?", [id], function(tx, res) {
            deferred.resolve();                
        });        
    },onError);  
    return deferred.promise();
}

/**
 * delete all CallMeRequests
 */
function deleteAllCallMeRequests() {
    db.transaction(function(tx) {
        tx.executeSql("delete from CallMeRequest where userId = ?", 
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM)]);        
    },onError);  
}

/**
 *create offline payment request
 */
function createOfflinePmntReq(paymentReqId) {
    var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    db.transaction(function(tx) {
        var curDate = currentDate();
        tx.executeSql('INSERT INTO OfflineRequests (paymentReqId, userId,  dateCreated, dateUpdated) \
                        VALUES (?, ?, ?, ?)', [paymentReqId, userId, curDate, curDate]);
    },onError);
}

/**
 * createOfflineMailReq without a new transaction
 */
function createOfflineMailReqNoTx(mailReqId, tx) {
    var deferred = $.Deferred();
    var curDate = currentDate();
    var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    tx.executeSql('INSERT INTO OfflineRequests (mailId, userId, dateCreated, dateUpdated) \
        VALUES (?, ?, ?, ?)', [mailReqId, userId, curDate, curDate], function(tx, res) {
            deferred.resolve(); 
        }, function(e) {
            console.log("ERROR _ createOfflineMailReqNoTx: " + e);
            deferred.reject(); 
        });
    return deferred.promise();
}

/**
 * createOfflineMailReq with a new transaction
 */
function createOfflineMailReq(mailReqId) {
    var deferred = $.Deferred();
    var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    db.transaction(function(tx) {
        var curDate = currentDate();
        tx.executeSql('INSERT INTO OfflineRequests (mailId, userId, dateCreated, dateUpdated) \
            VALUES (?, ?, ?, ?)', [mailReqId, userId, curDate, curDate], function(tx, res) {
                deferred.resolve(); 
            }, function(e) {
                console.log("ERROR _ createOfflineMailReq: " + e);
                deferred.reject(); 
            });
    });
    return deferred.promise();
}

/**
 * create offline callMe request without a new transaction
 */
function createOfflineCallMeReqNoTx(callMeReqId, tx) {
    var deferred = $.Deferred();
    var curDate = currentDate();
    var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    tx.executeSql('INSERT INTO OfflineRequests (callMeReqId, userId, dateCreated, dateUpdated) \
        VALUES (?, ?, ?, ?)', [callMeReqId, userId, curDate, curDate], function(tx, res) {
            deferred.resolve(); 
        }, function(err) {
            console.log("ERROR _ createOfflineCallMeReqNoTx: " + err);
            deferred.reject(); 
        });
    return deferred.promise();    
}

function getOfflineRequestById(offlineReqId, callback){ // not in use
    var request;
    db.transaction(function(tx) {
        tx.executeSql("select * from OfflineRequests where offlineReqId = ? ;", [offlineReqId], function(tx, res) {
            request = {
                id: res.rows.item(0).offlineReqId,
                paymentReqId: res.rows.item(0).paymentReqId,
                mailId: res.rows.item(0).mailId,
                callMeReqId: res.rows.item(0).callMeReqId,
                dateCreated: res.rows.item(0).dateCreated,
            };
        });
    },onError ,onReadyTransaction);
    
    function onReadyTransaction() {
        console.log("getOfflineRequest: " + request);
        callback(request);
    }
}

/**
 * get count of all rec from OfflineRequests
 * @returns
 */
function getCountOfAllPendingReq() { // not in used
    var deferred = $.Deferred();  
    var countOfRows;
    
    // get count of rows in PaymentRequest table
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from OfflineRequests", [], function(tx, res) {
            console.log("res.rows.length: " + res.rows.item(0).cnt);
            countOfRows = res.rows.item(0).cnt;
            deferred.resolve(countOfRows); 
        }, function(e) {
            console.log("getCountOfPendingReq - ERROR: " + e.message);
        });
    });
    return deferred.promise();
}



/**
 * get count of pending payments 
 * 
 */
function getCountOfPendingPayments() {
    var deferred = $.Deferred();
    var countOfRows;
    
    // get count of rows in PaymentRequest table
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from OfflineRequests where userId = ? AND paymentReqId IS NOT ? ", [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), null], function(tx, res) {
            countOfRows = res.rows.item(0).cnt;
            console.log("count of pending payment order: " +  countOfRows);
            deferred.resolve(countOfRows); 
        }, function(e) {
            console.log("getCountOfPendingPayments - ERROR: " + e.message);
        });
    });
    return deferred.promise();
}

/**
 * get count of pending Messages 
 * 
 */
function getCountOfPendingMsg() { // not in used
    var deferred = $.Deferred();
    var countOfRows;
    
    // get count of rows in PaymentRequest table
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from OfflineRequests where userId = ? AND (mailId IS NOT ? OR callMeReqId  IS NOT ?) ",
            [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), null, null], function(tx, res) {
            
            countOfRows = res.rows.item(0).cnt;
            console.log("count of pending payment order: " +  countOfRows);
            deferred.resolve(countOfRows); 
        }, function(e) {
            console.log("getCountOfPendingMsg - ERROR: " + e.message);
        });
    });
    return deferred.promise();
}

/**
 * @returns count of pending callMe reqs
 */
function getCountOfCallMeReq() {
    var deferred = $.Deferred();
    var countOfRows;
    
    // get count of rows in PaymentRequest table
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from OfflineRequests where userId = ? AND callMeReqId IS NOT ? ", [window.localStorage.getItem(CONSTANTS.USERNAME_PARAM), null], function(tx, res) {
            countOfRows = res.rows.item(0).cnt;
            console.log("count of pending call me order: " +  countOfRows);
            deferred.resolve(countOfRows); 
        }, function(e) {
            console.log("getCountOfCallMeReq - ERROR: " + e.message);
        });
    });
    return deferred.promise();
}


function deleteOfflineRequest(offlineReqId) {
    db.transaction(function(tx) {
        tx.executeSql("delete from OfflineRequests where offlineReqId = ?", [offlineReqId], function(tx, res) {
            console.log("request has been deleted successfully");
        });
    });    
}

function deleteOfflineRequestByPaymentReqId(reqId) {
    db.transaction(function(tx) {
        tx.executeSql("delete from OfflineRequests where paymentReqId = ?", [reqId], function(tx, res) {
            console.log("request has been deleted successfully");
        });
    });    
}

function deleteOfflineRequestByMailId(mailId) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from OfflineRequests where mailId = ?", [mailId], function(tx, res) {
            console.log("request has been deleted successfully: " + mailId);
            deferred.resolve(); 
        });
    });
    return deferred.promise();   
}

/**
 *  create DataMap
 *  return promise with param (id)
 */
function createDataMap(key, value, type, dateCreated, dateUpdated) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql('INSERT INTO DataMap (\
            key, value, type, dateCreated, dateUpdated) \
            VALUES (?, ?, ?, ?, ?)', 
            [key, value, type, dateCreated, dateUpdated], function(tx, res) {
                var id = res.insertId;
                deferred.resolve(id); 
        });
    },onError);
    return deferred.promise(); 
}

/**
 *  create AllDataMap
 */
function createAllDataMap(motives) {
    var deferred = $.Deferred();
    var motivesLength = motives.length;

    db.transaction(function(tx) {
        for(var i = 0; i < motivesLength; i++){
            var curDate = currentDate();
            tx.executeSql('INSERT INTO DataMap (\
                key, value, type, dateCreated, dateUpdated) \
                VALUES (?, ?, ?, ?, ?)', 
                [motives[i].key, motives[i].value, motives[i].type, curDate, curDate]);
        }
    },onError, onReadyTransaction);

    function onReadyTransaction() {
        deferred.resolve();
    }
    return deferred.promise(); 
}

/**
 * @param id
 *  get DataMap record by id = id
 *  return promise with param (single) dataMap
 */
function getDataMapById(id) {
    var deferred = $.Deferred();
    var dataMap;
    db.transaction(function(tx) {
        tx.executeSql("select * from DataMap where id = ?;", [id], function(tx, res) {
            dataMap = {
                   id: res.rows.item(0).id,
                   key: res.rows.item(0).key,
                   value: res.rows.item(0).value,
                   type: res.rows.item(0).type,
                   dateCreated: res.rows.item(0).dateCreated,
                   dateUpdated: res.rows.item(0).dateUpdated, 
            };
            console.log(dataMap);
            deferred.resolve(dataMap); 
        });
    });
    return deferred.promise();
}

/**
 * @param type
 * fetches all data maps of a given type
 * return promose with param dataMapsArr
 */
function getDataMapsByType(type) {
    var deferred = $.Deferred();
    var dataMapsArr = [];
    var dataMap = new Object();

    db.transaction(function(tx) {
        tx.executeSql("select * from DataMap where type = ? order by id;", [type], function(tx, res) {
            var countOfDataMaps = res.rows.length;

            for (var i = 0; i < countOfDataMaps; i++) {
                dataMap = {
                     id: res.rows.item(i).id,
                     key: res.rows.item(i).key,
                     value: res.rows.item(i).value,
                     type: res.rows.item(i).type,
                     dateCreated: res.rows.item(i).dateCreated,
                     dateUpdated: res.rows.item(i).dateUpdated,                        
                };  
                dataMapsArr.push(dataMap);
            }

            console.log(dataMapsArr);
            deferred.resolve(dataMapsArr);
        });            
    }, onError);
    return deferred.promise();        
}

/**
 * @param type
 * get count of DataMaps by type = type
 * return promise with param - count of DataMaps
 */
function getCountOfDataMapsByType(type) {
    var deferred = $.Deferred();    
    db.transaction(function(tx) {
        tx.executeSql("select count(*) as cnt from DataMap where type = ?;", [type], function(tx, res) {
            console.log("count of DataMaps: " + res.rows.item(0).cnt);
            deferred.resolve(res.rows.item(0).cnt);
        });
    }, onError );
    return deferred.promise();
}

/**
 * @param id
 * delete DataMap by id = id
 */
function deleteDataMapById(id) {
    db.transaction(function(tx) {
        tx.executeSql("delete from DataMap where id = ?", [id], function(tx, res) {
            console.log("request has been deleted successfully");
        });
    }, onError);  
}

/**
 * @param id
 * delete DataMap by type = type
 */
function deleteDataMapById(type) {
    db.transaction(function(tx) {
        tx.executeSql("delete from DataMap where type = ?", [type], function(tx, res) {
        });
    }, onError);  
}

/**
 * delete all records from table DataMap
 */
function deleteDataMaps() {
    db.transaction(function(tx) {
        tx.executeSql("delete from DataMap");
    }, onError);     
}

/**
 * create UserLogin record
 */
function createUserLogin(userId, userName) {
    var deferred = $.Deferred();
    // check user if exist
    db.transaction(function(tx) {
        tx.executeSql("select * from UserLogin where userId = ?", [userId], function(tx, res) {
            if (res.rows.length == 0) {
                createUser();
            } else {
                console.log("user exists");
                deferred.resolve();
            }
        });
    });

    function createUser() {
        db.transaction(function(tx) {
            var curDate = currentDate();
            tx.executeSql('INSERT INTO UserLogin (userId, userName, dateCreated, dateupdated) \
                        VALUES (?, ?, ?, ?)', [userId, userName, curDate, curDate]);
        }, onError, onReadyTransaction);
    }
    function onReadyTransaction() {
        deferred.resolve();
    }
    return deferred.promise();
}

function updateUserLogin(userId, newPersonName) { // not in used
    db.transaction(function(tx) {
        tx.executeSql("UPDATE UserLogin SET userName = ?, dateUpdated = ? WHERE userId = ? ", 
            [newPersonName, currentDate(), userId], function(tx, res) {
            console.log("person name was changed successfully");
        }, function(e) {
            console.log("ERROR: " + e.message);
        });
    });
}

function getUserLogin(userId) {
    var selectedUser;
    db.transaction(function(tx) {
        tx.executeSql("select * from UserLogin where userId = ?;", [userId], function(tx, res) {
            selectedUser = {
                selectedUserID: res.rows.item(0).userId,
                selectedPersonName: res.rows.item(0).userName,
                date: res.rows.item(0).dateCreated
            };
        });
    }, onError, success);

    function success() {
        console.log(selectedUser);
        return selectedUser;
    }
}

function deleteUserLogin(userId) {
    db.transaction(function(tx) {
        tx.executeSql("delete from UserLogin where userId = ?", [userId], function(tx, res) {
            console.log("user has been deleted successfully");
        });
    });
}

function deleteAllUsers() {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from UserLogin", [], function(tx, res) {
            console.log("user has been deleted successfully");
            deferred.resolve();
        });
    });
    return deferred.promise();
}

/**
 * 
 *  Creates LastAssignment record
 * 
 * @param accDetailsCode
 * @param userId
 * @param accDetailsId
 * @param afReference
 * @param refTo
 * @param amount
 * @param currency
 * @param status
 * @param result
 * @param dateReceived
 * @param tx
 */
function createLastAssignmentNoTx(accDetailsCode, userId, afReference, refTo, amount, currency, dateReceived, status, result, tx) {
    var curDate = currentDate();
    tx.executeSql('INSERT INTO LastAssignment (accDetailsCode, userId, afReference, \
        refTo, amount, currency, dateReceived, status, result, dateCreated, dateUpdated) \
        VALUES  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        [accDetailsCode, userId, afReference, refTo, amount, currency, dateReceived, status, result, curDate, curDate]);
}


/**
 * 
 *  Creates LastAssignment record by using a new transaction
 * 
 * @param accDetailsCode
 * @param userId
 * @param accDetailsId
 * @param afReference
 * @param refTo
 * @param amount
 * @param currency
 * @param status
 * @param result
 * @param dateReceived
 */
function createLastAssignment(accDetailsCode, userId, afReference, refTo, amount, currency, dateReceived, status, result) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        var curDate = currentDate();
        tx.executeSql('INSERT INTO LastAssignment (accDetailsCode, userId, afReference, refTo, amount, currency, \
            dateReceived, status, result, dateCreated, dateUpdated)\
            VALUES  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [accDetailsCode, userId, afReference, refTo, amount, currency, dateReceived, status, result, curDate, curDate],
            function(){}, onError);
    }, onError, function() {
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * 
 *  Creates AllLastAssignment records
 */
function createAllLastAssignments(lastAFData) {
    var deferred = $.Deferred();
    var count = lastAFData.length;
    var userId = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);

    db.transaction(function(tx) {
        for (i = 0; i < count; i+= 1) {
            var accDetailsCode = lastAFData[i].account,
                afRef = lastAFData[i].afRef,
                refTo = lastAFData[i].refTo,
                amount = lastAFData[i].amount,
                currency = lastAFData[i].currency,
                receivedDate = lastAFData[i].receivedDate,
                status = lastAFData[i].status,
                result = lastAFData[i].result;

            var curDate = currentDate();
            tx.executeSql('INSERT INTO LastAssignment (accDetailsCode, userId, afReference, refTo, amount, currency, \
                dateReceived, status, result, dateCreated, dateUpdated)\
                VALUES  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [accDetailsCode, userId, afRef, refTo, amount, currency, receivedDate, status, result, curDate, curDate],
                function(){}, onError);
        }
    }, onError, function() {
        console.log("Last af stored successfully");
        deferred.resolve();
    });
    return deferred.promise();
}

/**
 * 
 * Deletes all LastAssignments records that do not have a match in AccountDetails table(not the opposite)
 * 
 * @param userId
 * @param accDetailsCode
 */
function deleteUnreferencedLARows(userId, accDetailsCode) {
    var rowsCount;

    db.transaction(function(tx) {
        tx.executeSql('select count(*) as cnt from LastAssignment', [], function(tx, res) {
            rowsCount = res.rows.item(0).cnt;

            //Get all garbage records
            if (rowsCount > 0) {
                tx.executeSql('\
                    SELECT userId, accDetailsCode, adCode, adUserId \
                    FROM(\
                    SELECT t1.userId, t1.accDetailsCode, t2.code as adCode, t2.userId as adUserId \
                    FROM LastAssignment t1 \
                    LEFT OUTER JOIN AccountDetails t2 ON t2.userId = t1.userId AND t2.code=t1.accDetailsCode) \
                    WHERE adCode IS NULL AND adUserId IS NULL', [],
                    function(tx, res) {
                        var nrOfRows = res.rows.length;
                        var count = 0;
                        while (count < nrOfRows) {
                            deleteLastAssignment(res.rows.item(count).userId, res.rows.item(count).accDetailsCode, tx);
                            count = count +1;
                        }
                    }, onError);
            }
        }, onError);
    });
}

/**
 * 
 * Deletes a single LastAssignment record
 * 
 * @param userId
 * @param accDetailsCode
 * @param tx
 */
function deleteLastAssignment(userId, accDetailsCode, tx) {
    tx.executeSql('delete from LastAssignment where accDetailsCode = ? and userId = ?', [accDetailsCode, userId],
        function(){
        console.log("Deleted userId " + userId +" and code : " + accDetailsCode);
    }, onError);
}

function deleteSingleLastAssignment(userId, accDetailsCode) {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql('delete from LastAssignment where accDetailsCode = ? and userId = ?', [accDetailsCode, userId],
            function(){
            console.log("Deleted userId " + userId +" and code : " + accDetailsCode);
            deferred.resolve();
        }, onError);
    });
    return deferred.promise();
}

/**
 * delete all records from table LastAssignment
 */
function deleteAllLARows() {
    var deferred = $.Deferred();
    db.transaction(function(tx) {
        tx.executeSql("delete from LastAssignment",[] , function(tx, res) {
            console.log("delete All from LastAssignment successfully");
            deferred.resolve();
        });
    }, onError);
    return deferred.promise();
}


/**
 * 
 * Gets a single LastAssignment record
 *
 * @param accDetailsCode
 * @param userId
 * @param callback
 */
function getLastAssignment(accDetailsCode, userId, callback) {
    var laRow;

    db.transaction(function(tx) {
        tx.executeSql('select * from LastAssignment  where userId = ? and accDetailsCode = ?', [userId, accDetailsCode],
            function(tx, res) {  
                laRow = res.rows.item(0);
        }, onError);
    }, onError, function() {
        callback(laRow);
    });
}

/**
 * 
 * Gets LastAssingment without a new transaction
 * 
 * @param accDetailsCode
 * @param userId
 */
function getLastAssignmentSameTx(accDetailsCode, userId, callback, tx) {
    var laRow;

    tx.executeSql('select * from LastAssignment  where userId = ? and accDetailsCode = ?', [userId, accDetailsCode],
        function(tx, res) {  
            laRow = res.rows.item(0);
    }, callback, onError);
}











/********************************************************************************************************************/
 // not used yet
 
/**
 * create UserSettings record
 */
function createUserSettings() {
    var deferred = $.Deferred();
    // check user if exist
    db.transaction(function(tx) {
        tx.executeSql("select * from UserSettings", [], function(tx, res) {
            if (res.rows.length == 0) {
                setSetings();
            } else {
                console.log("user exists");
                deferred.resolve();
            }
        });
    });

    function setSetings() {
        db.transaction(function(tx) {
            tx.executeSql('INSERT INTO UserSettings  (selectedLanguage) \
                        VALUES (?)', ["en-US"]); // default language is en-US !
         }, onError, onReadyTransaction);
    }
    function onReadyTransaction() {
        deferred.resolve();
    }
    return deferred.promise();
}

function updateUserSettings(selectedLanguage) {
    db.transaction(function(tx) {
        tx.executeSql("UPDATE UserSettings SET selectedLanguage = ?", 
            [selectedLanguage], function(tx, res) {
            console.log("selectedLanguage was changed successfully");
        }, function(e) {
            console.log("ERROR: " + e.message);
        });
    });
}

function getUserSettings() {
	var deferred = $.Deferred();
    var userSettings;
    db.transaction(function(tx) {
        tx.executeSql("select * from UserSettings;", [], function(tx, res) {
        	userSettings = {
                selectedLanguage: res.rows.item(0).selectedLanguage,
            };
        });
    }, onError, success);

    function success() {
        console.log(userSettings);
        deferred.resolve(userSettings);
    }
    return deferred.promise();
}

function deleteUserSettings() {
    db.transaction(function(tx) {
        tx.executeSql("delete from UserSettings", [], function(tx, res) {
            console.log("user settings has been deleted successfully");
        });
    });
}

 /**********************************************************************************************/



/**
 * This function should join both tables by callMeReqtId
 */
function getJoinOfCallMeAndOfflReqs() {
    var deferred = $.Deferred();
    var callMeArr = [];
    var currUSer = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    
    db.transaction(function(tx) {
        tx.executeSql('SELECT OfflineRequests.offlineReqId, CallMeRequest.id, CallMeRequest.userId, CallMeRequest.code, \
            CallMeRequest.phone, CallMeRequest.subject, CallMeRequest.body, CallMeRequest.motiveKey, CallMeRequest.motiveValue \
            FROM OfflineRequests INNER JOIN CallMeRequest ON OfflineRequests.callMeReqId = CallMeRequest.id \
            WHERE  OfflineRequests.userId = ? AND CallMeRequest.userId = ? ;', [currUSer, currUSer], function(tx, res) {
                var count = res.rows.length;
                
                for (var i = 0; i < count; i++) {
                    var callMe = new Object(); 
                    callMe = {
                        offlineReqId: res.rows.item(i).offlineReqId,
                        idOfCallMeReq: res.rows.item(i).id,
                        type: "callMe",
                        userId: res.rows.item(i).userId,
                        code: res.rows.item(i).code,
                        phone: res.rows.item(i).phone,
                        subject: res.rows.item(i).subject,
                        body: res.rows.item(i).body,
                        motiveKey: res.rows.item(i).motiveKey,
                        motiveValue: res.rows.item(i).motiveValue,                        
                   };
                    callMeArr.push(callMe);
                }
        });
    }, onError, function() {
        deferred.resolve(callMeArr);
    });
    return deferred.promise();
}

function getJoinOfMailsAndOfflReqs() {
    var deferred = $.Deferred();
    var mailsArr = [];
    var currUSer = window.localStorage.getItem(CONSTANTS.USERNAME_PARAM);
    
    db.transaction(function(tx) {
        tx.executeSql('SELECT OfflineRequests.offlineReqId, Mails.id, Mails.type, Mails.userId, Mails.contractId, \
            Mails.subject, Mails.body, Mails.senderId, Mails.mailId \
            FROM OfflineRequests INNER JOIN Mails ON OfflineRequests.mailId = Mails.id \
            WHERE  OfflineRequests.userId = ? AND Mails.userId = ? ;', [currUSer, currUSer], function(tx, res) {
                var count = res.rows.length;
                
                for (var i = 0; i < count; i++) {
                    var mail = new Object(); 
                    mail = {
                        offlineReqId: res.rows.item(i).offlineReqId,  
                        idOfMail: res.rows.item(i).id,
                        type: res.rows.item(i).type,
                        userId: res.rows.item(i).userId,
                        contractId: res.rows.item(i).contractId,
                        subject: res.rows.item(i).subject,
                        body: res.rows.item(i).body,
                        senderId: res.rows.item(i).senderId,
                        mailId: res.rows.item(i).mailId,
                   };
                    mailsArr.push(mail);
                }
        });
    }, onError, function() {
        deferred.resolve(mailsArr);
    });
    return deferred.promise();
}

/**
 * error message db.transaction
 */
function onError(tx, err) {
    console.log("SQL Error: " + err + "; Description: " + tx);
}
