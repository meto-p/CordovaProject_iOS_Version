
/**
 * Selects all fields from account_details
 */
function selectAccountDetailsTable() {
	var db = window.sqlitePlugin.openDatabase({name: "Mobile.db"});

	db.transaction(function(tx) {
		tx.executeSql("select * from account_details;", [], function(tx, res) {
			for(var i = 0; i < res.rows.length; i++){
				console.log("From db.transaction -  selectDB()");
				console.log("res.rows.length: " + res.rows.length);
				console.log("res.rows.item(i).code: " + res.rows.item(i).code );
				console.log("STATUS :" + res.rows.item(i).selected );
				console.log("TYPE :" + res.rows.item(i).type );
				console.log("*************** ");
				console.log(" ");
			}
		});
	});
}

/**
 * Selects all fields from bank_account table
 */
function selectBackAccTable() {
	var db = window.sqlitePlugin.openDatabase({name: "Mobile.db"});

	db.transaction(function(tx) {
		tx.executeSql("select * from bank_account", [], function(tx, res) {
			for(var i = 0; i < res.rows.length; i++) {
				console.log("db.transaction -  BackAccDB()");
				console.log("res.rows.length: " + res.rows.length);
				console.log("res.rows.item(i).bankAccountCode: " + res.rows.item(i).bankAccountCode );
				console.log("item(i).accDetailsId: " + res.rows.item(i).accDetailsId );
				console.log("STATUS :" + res.rows.item(i).selected );
				console.log("*************** ");
				console.log(" ");
			}
		});
	});
}

/**
 * Selects all fields from offline_requests table
 */
function selectOfflineRequestsTabele() {
	var db = window.sqlitePlugin.openDatabase({name: "Mobile.db"});

	db.transaction(function(tx) {
		tx.executeSql("select * from offline_requests;", [], function(tx, res) {
			for(var i = 0; i < res.rows.length; i++){
				console.log("From db.transaction -  selectDB()");
				console.log("res.rows.length: " + res.rows.length);
				console.log("accDetailsId " + res.rows.item(i).accDetailsId );
				console.log("STATUS :" + res.rows.item(i).status );
				console.log("*************** ");
				console.log(" ");
			}
		});
	});
}


