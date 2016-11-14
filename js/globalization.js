var langObject = null;
var selectedLangUrl = "";
var frenchURL = "i18n/fr/strings_FR.json";
var englishURL = "i18n/en/strings.json";

/**
 * 
 * Translates all ui labels
 * 
 * @param msg
 */
function translateLabels(msg) {
    $(".languageHTML").each(function(){
        $(this).html(langObject.languageSpecifications[0][$(this).data("text")]);
    });
    //add here more jquery expressions..
}

function localizeStringForKey(key){
    return langObject.languageSpecifications[0][key];
}

/**
 * 
 * access a language file
 * 
 * @param localUrl
 * @param successCallback
 */
function openLangFile(localUrl,successCallback){
	var deferred = $.Deferred();
	$.ajax({
		type: "POST",
		url: localUrl,
		timeout: 500,
		global: false,
	}).then(function( msg ) {
		langObject = JSON.parse(msg);
		successCallback(msg);
		deferred.resolve();
	}).fail(function(jqXHR, textStatus, errorThrown){
		alertMessage("Couldn't access language resources!");
	});
	return deferred.promise();
}

/**
 * 
 * Applies i18n according to the telephone settings
 * 
 * @param locale
 */
function applyI18n(locale) {
    var deferred = $.Deferred();
    langByLocale = locale.value;
    // Use the following condition if we want the language of the application to match the device language ( applies only to French)   
    //    if ((langByLocale.toString() == "fr")  || (langByLocale.toString().indexOf("fr") != -1)){
    if ((localStorage.getItem('selectedLanguage') == "fr")  /*|| (localStorage.getItem('selectedLanguage').toString().indexOf("fr") != -1) */ ){
        selectedLangUrl = frenchURL;
    } else {
        //default English
        selectedLangUrl = englishURL;
    }
    //open one of the strings.json files
    openLangFile(selectedLangUrl,translateLabels).then(function (){
        deferred.resolve();
    })
    return deferred.promise();
}
