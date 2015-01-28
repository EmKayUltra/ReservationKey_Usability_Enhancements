// ==UserScript==
// @name        ReservationKey Usability Enhancements
// @namespace   reservationkey.com
// @description Various usability enhancements to Reservation Key
// @include    http://v2.reservationkey.com/reservations/
// @include    https://v2.reservationkey.com/reservations/
// @include    http://v2.reservationkey.com/reservations/?*
// @include    https://v2.reservationkey.com/reservations/?*
// @include    http://v2.reservationkey.com/web/?*
// @include    https://v2.reservationkey.com/web/?*
// @include    http://v2.reservationkey.com/properties/?*
// @include    https://v2.reservationkey.com/properties/?*
// @include    http://v2.reservationkey.com/settings/?*
// @include    https://v2.reservationkey.com/settings/?*
// @resource   http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/themes/smoothness/jquery-ui.css
// @require    http://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js
// @require    http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.js
// @require    https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
// @version    1.2
// @grant 	   none
// ==/UserScript==
/* NOTE: "@include" very specific (no general-case asterixes, etc) because otherwise all of this loads for every AJAX call as well */

/***


This script is provided courtesy of one ResKey lover, and it comes with no guarantees or warranties.  Use and modify at your own risk.


Enjoy!


***/

$.noConflict();  //no need to overwrite ResKey's existing $ function - we'll just call "jQuery" whenever we need jQuery functionality
console.log("starting ResKey GM script...");

/****BEGIN NamespaceUtility****/
(function () {
    var NamespaceUtility = new function() {
        var me = this;

        me.RegisterClass = function(pstrNamespaceName, pstrClassName, pobjClass) {
            CreateNamespace(pstrNamespaceName);

            //add the object to the namespace
            eval(pstrNamespaceName + '.' + pstrClassName + '= pobjClass;');
        };

        var CreateNamespace = function(pstrNamespaceName) {
            //if the namespace doesn't exist yet, create it
            if (eval('typeof ' + pstrNamespaceName + ' === "undefined"')) {
                eval(pstrNamespaceName + ' = {};');
            }
        };
    };

    NamespaceUtility.RegisterClass("Utils", "NamespaceUtility", NamespaceUtility);
})();
/****END NamespaceUtility****/


/****BEGIN Settings****/
Utils.NamespaceUtility.RegisterClass("ResKey", "Settings", new function(){
	//May find a need to change one of these for some reason...
	this.ENABLE_LOGGING = true;
	this.ENABLE_MODULE_LOGGING_DEFAULT = false;
	this.ALLOW_EXPERIMENTAL_MODULES = true;
	this.CURRENTPAGE_POLLTIME_MILLISECONDS = 100;
	this.AJAXSTATE_POLLTIME_MILLISECONDS = 100;
	this.DEFAULT_BILLING_COUNTRY = "US"; //this must be the two letter representation of the country as ResKey understands it
	
	//Probably never change anything below this line
	this.JQUERY_EVENT_CLASS_PREFIX = "ResKeyGM_";
	this.JQUERY_EVENT_CLASS_GENERAL = this.JQUERY_EVENT_CLASS_PREFIX + "General";
	this.COOKIE_PREFIX = "ResKeyGM_";
	this.COOKIE_MODULE_ON_VALUE = 1;
	this.COOKIE_MODULE_OFF_VALUE = 0;
	this.COOKIE_MODULE_DEFAULT_VALUE = this.COOKIE_MODULE_OFF_VALUE;
	this.MODULE_DEFAULTS = { cookie_prefix: this.COOKIE_PREFIX, event_prefix: this.COOKIE_PREFIX, autoLoad: true, logging: this.ENABLE_MODULE_LOGGING_DEFAULT, module_name: "", module_name_readable: "", module_description: "" };
	this.MODULES_LIST_RELEASED = [ "ForceHttps", "AutoReminders", "DoublePaymentPrevention", "CreditCardTypeAutoSelector", "BillingAddressParser"];
	this.MODULES_LIST_EXPERIMENTAL = [ "AutoRefresh", "AjaxHistory" ];
	this.MODULES_LIST_DISCONTINUED = [ "ReservationLinkBuilder" ];
	this.MODULE_OPTIONS = { "AjaxHistory" : { logging: true },
							"AutoRefresh" : { logging: false },
							"BillingAddressParser" : { default_country: this.DEFAULT_BILLING_COUNTRY }
	};
});
/****END Settings****/


/****BEGIN HelperUtility****/
Utils.NamespaceUtility.RegisterClass("ResKey", "HelperUtility", new function(){
	var me = this;
	
	me.currentPage = function() {
		return ResKey.HookHelper.getCurrentPage();
	};
	
	me.previousPage = function() {
		return ResKey.HookHelper.getPreviousPage();
	};
	
	me.log = function(text) {
		if (ResKey.Settings.ENABLE_LOGGING) console.log(text);
	};
	
	me.saveCookie = function(name, value) {
		me.log("saving cookie: {"+name+","+value+"}");
		jQuery.removeCookie(name, { path: '/' });
		jQuery.cookie(name, value, { expires: 3650, path: '/' }); //max expiry
	};
	
	me.extendJQuery = function() {
		jQuery.fn.disable = function() {
			jQuery(this).prop("disabled", "disabled");
		};

		jQuery.fn.enable = function() {
			jQuery(this).prop("disabled", "");
		};
	};
	
	me.pageIsReady = function() {
		return (xmlHttp.readyState == 4);
	};

	me.executeDefaultOnClick = function(obj) {		
		jQuery(obj).triggerHandler("click");
	};

	me.preventDefaultOnClick = function(obj) {
		//HACK: e.stopPropogation and e.preventDefault and return false do not prevent the onclick from happening, so we must remove it entirely, then queue re-adding it so the event handling can resolve without seeing the onclick
		me.log("preventing default on-click on '"+jQuery(obj).attr("id")+"'");
		var onclick = jQuery(obj).attr("onclick");
		jQuery(obj).attr("onclick", null);
		setTimeout(function(){ jQuery(obj).attr("onclick", onclick); }, 1);
	};
	
	me.executeInlineOnClickForAnchor = function(obj, e) {
		jQuery(obj).data("onclick").call(obj, e);
	};

	me.preventFutureInlineOnClickForAnchor = function(obj) {
		jQuery(obj).each(function(e){
			ResKey.HelperUtility.log("reconfiguring future inline onclick for '"+jQuery(obj).first().text()+"' link(s)");
			if (jQuery(this).attr("onclick") != null) {
				jQuery(this).data("onclick", this.onclick);
				jQuery(this).attr("onclick", null);
			}
		});
	};
	
	me.translateTdIDToPageName = function(tdID) {
		switch(tdID) {
			case "t24": return "Availability";
			case "t25": return "Reservations";
			case "t28": return "Guests";
			case "t27": return "Reports";
			case "t41": return "Activity";
		}
	};

	var getCurrentPageTdID = function() {
		return jQuery("#sidebuttons a").parents("td[id*=t]").filter(function(o){ return jQuery(this).css("background-color") == "rgb(255, 255, 255)"}).attr("id");
	};
	
	me.getCurrentPageName = function() {
		return me.translateTdIDToPageName(getCurrentPageTdID());
	};
	
	me.currentlyOnAvailabilityTab = function() {
		return (ResKey.HookHelper.getCurrentPage() == "Availability");
	};

	me.currentlyOnReservationsTab = function() {
		return (ResKey.HookHelper.getCurrentPage() == "Reservations");
	};

	me.currentlyOnGuestsTab = function() {
		return (ResKey.HookHelper.getCurrentPage() == "Guests");
	};

	me.currentlyOnActivityTab = function() {
		return (ResKey.HookHelper.getCurrentPage() == "Activity");
	};
});
/****END HelperUtility****/


/****BEGIN ModuleFactory****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "ModuleFactory", new function(){
	this.getModule = function(moduleName, options) {
		options = (typeof options == "undefined") ? ResKey.Settings.MODULE_DEFAULTS : options;
		switch(moduleName) {
			case "DoublePaymentPrevention": return new ResKey.Modules.DoublePaymentPrevention(options);
			case "ForceHttps": return new ResKey.Modules.ForceHttps(options);
			case "AutoRefresh": return new ResKey.Modules.AutoRefresh(options);
			case "AutoReminders": return new ResKey.Modules.AutoReminders(options);
			case "AjaxHistory": return new ResKey.Modules.AjaxHistory(options);
			case "CreditCardTypeAutoSelector": return new ResKey.Modules.CreditCardTypeAutoSelector(options);
			case "BillingAddressParser": return new ResKey.Modules.BillingAddressParser(options);
			case "ReservationLinkBuilder": return new ResKey.Modules.ReservationLinkBuilder(options);
			default: return {};
		}
	};
});
/****END ModuleFactory****/


/****BEGIN AdvancedDataUtility****/
Utils.NamespaceUtility.RegisterClass("ResKey", "AdvancedDataUtility", new function(){
	var me = this;
	var reservationPages = [];  //of type "ReservationPage"
	var ReservationPage = { Name: "", AvailabilityURL: "", CalendarURL: ""};

	me.getReservationPages = function() {
		return reservationPages;
	};

	me.loadData = function() {
		loadReservationPages();
	};

	var _log = function(text) {
		ResKey.HelperUtility.log("AdvancedDataUtility: "+text);
	};

	var getRandomNumberForWSCall = function() {
		return Math.random();
	};

	var loadReservationPages = function() {
		_log("requesting reservation pages...");
		jQuery.get("https://v2.reservationkey.com/web/reservationpages.asp?sid="+getRandomNumberForWSCall(), parseReservationPagesOutOfResponse);
	};

	var parseReservationPagesOutOfResponse = function(responseText) {
		var reservationPage; 
		_log("reservation page response received, parsing...");
		jQuery("table tbody tr:has('td.col')", responseText).each(function(){
			reservationPage = Object.create(ReservationPage);
			reservationPage.Name = jQuery("td.col:first", this).text();
			reservationPage.AvailabilityURL = jQuery("td.col:eq(3) a:contains('Availability')", this).attr("href");
			reservationPage.CalendarURL = jQuery("td.col:eq(3) a:contains('Calendar')", this).attr("href");
			_log("reservation page parsed - "+reservationPage.Name+", '"+reservationPage.AvailabilityURL+"', '"+reservationPage.CalendarURL+"'");
			reservationPages.push(reservationPage);
		});
	};
});
/****END AdvancedDataUtility****/



/****BEGIN ModuleBase****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "ModuleBase", function(o){
	this._moduleName;
	this._moduleNameReadable
	this._moduleDescription;
	this._cookieName;
	this._eventName;
	this._isLogging;
	
	this._log = function(msg) {
		if (this._isLogging) {
			ResKey.HelperUtility.log(this._moduleName+": "+msg);
		}
	};
	
	this._initializeCookieIfNeeded = function() {
		if (typeof jQuery.cookie(this._cookieName) == "undefined") { ResKey.HelperUtility.saveCookie(this._cookieName, ResKey.Settings.COOKIE_MODULE_DEFAULT_VALUE); }
	};
	
	this._init = function(options) {
		this._moduleName = options.module_name;
		ResKey.HelperUtility.log("initializing "+this._moduleName+"...");
		this._moduleNameReadable = typeof options.module_name_readable != "undefined" ? options.module_name_readable : this._moduleName
		this._moduleDescription = typeof options.module_description != "undefined" ? options.module_description : this._moduleName;
		this._cookieName = (typeof options.cookie_prefix != "undefined" ? options.cookie_prefix : "")+this._moduleName;
		this._eventName = (typeof options.event_prefix != "undefined" ? options.event_prefix : "")+this._moduleName;
		this._isLogging = (typeof options.logging != "undefined") ? options.logging : false;
		this._initializeCookieIfNeeded();
		
		this._initializeModule(options);
		
		if (options.autoLoad) {
			this.turnOnIfEnabled();
		}
	};
	
	this._init(o);
});

ResKey.Modules.ModuleBase.prototype.pageChangeEventHandler = function(e) {
	this._log("page change detected");
	this._pageChangeEventHandler(e);
};

ResKey.Modules.ModuleBase.prototype.attachToPageEvents = function() {
	this._log("attaching to page events ("+"pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName+")...");
	jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName).on("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName, jQuery.proxy(this.pageChangeEventHandler, this));
	this._attachToPageEvents();
};

ResKey.Modules.ModuleBase.prototype.detachFromPageEvents = function() {
	this._log("detaching from page events ("+"pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName+")");
	jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName);
	this._detachFromPageEvents();
};

ResKey.Modules.ModuleBase.prototype.ajaxStateChangeEventHandler = function(e) {
	this._log("ajax state change detected (url:"+xmlHttp.responseURL+")");
	this._ajaxStateChangeEventHandler(e);
};

ResKey.Modules.ModuleBase.prototype.attachToAjaxStateChange = function() {
	this._log("attaching to AJAX state change ("+"ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName+")...");
	jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName).on("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName, jQuery.proxy(this.ajaxStateChangeEventHandler, this));
	this._attachToAjaxStateChange();
};

ResKey.Modules.ModuleBase.prototype.detachFromAjaxStateChange = function() {
	this._log("detaching from AJAX state change ("+"ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName+")");
	jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+this._eventName);
	this._detachFromAjaxStateChange();
};

ResKey.Modules.ModuleBase.prototype.turnOn = function() {
	this._log("turning on...");
	this._turnOn();
};

ResKey.Modules.ModuleBase.prototype.turnOff = function() {
	this._log("turning off");
	this._turnOff();
};

ResKey.Modules.ModuleBase.prototype.enable = function() {
	this._log("enabling...");
	ResKey.HelperUtility.saveCookie(this._cookieName, ResKey.Settings.COOKIE_MODULE_ON_VALUE);
	this._enable();
};

ResKey.Modules.ModuleBase.prototype.disable = function() {
	this._log("disabling");
	ResKey.HelperUtility.saveCookie(this._cookieName, ResKey.Settings.COOKIE_MODULE_OFF_VALUE);
	this._disable();
};

ResKey.Modules.ModuleBase.prototype.isEnabled = function() {
	this._log("checking if enabled...");
	return (jQuery.cookie(this._cookieName) == ResKey.Settings.COOKIE_MODULE_ON_VALUE);
};

ResKey.Modules.ModuleBase.prototype.enableAndTurnOn = function() {
	this._log("enabling and turning on...");
	this.enable();
	this.turnOnOrOffBasedOnCurrentPage();
};

ResKey.Modules.ModuleBase.prototype.disableAndTurnOff = function() {
	this._log("disabling and turning off...");
	this.disable();
	this.turnOff();
};

ResKey.Modules.ModuleBase.prototype.turnOnIfEnabled = function() {
	this._log("turning on if enabled...");
	if (this.isEnabled()) {
		this.turnOnOrOffBasedOnCurrentPage();
	}
};

ResKey.Modules.ModuleBase.prototype.turnOnOrOffBasedOnCurrentPage = function() {
	this._log("turning on or off based on current page...");
	if (this.isEnabled() && this._isOnRelevantPage()) {
		this.turnOn();
	}
	else if (!this._isOnRelevantPage()) {
		this.turnOff();
	}
};
ResKey.Modules.ModuleBase.prototype._pageChangeEventHandler = function() {};

ResKey.Modules.ModuleBase.prototype._attachToPageEvents = function() {};

ResKey.Modules.ModuleBase.prototype._detachFromPageEvents = function() {};

ResKey.Modules.ModuleBase.prototype._ajaxStateChangeEventHandler = function() {};

ResKey.Modules.ModuleBase.prototype._attachToAjaxStateChange = function() {};

ResKey.Modules.ModuleBase.prototype._detachFromAjaxStateChange = function() {};

ResKey.Modules.ModuleBase.prototype._enable = function() {};

ResKey.Modules.ModuleBase.prototype._disable = function() {};

ResKey.Modules.ModuleBase.prototype._turnOn = function() {};

ResKey.Modules.ModuleBase.prototype._turnOff = function() {};

ResKey.Modules.ModuleBase.prototype._isOnRelevantPage = function() { return true; };

ResKey.Modules.ModuleBase.prototype._initializeModule = function() {};
/****END ModuleBase****/


/****BEGIN ForceHttps****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "ForceHttps", function(o){
	var me = this;
	
	me._turnOn = function() {
		if (window.location.protocol != "https:") window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
	};
		
	me._isOnRelevantPage = function() {
		return true;
	};
	
	me._initializeModule = function() {
		if (me.isEnabled()) {
			me._enable();
		}
	};
	
	o = jQuery.extend(o, { module_name: "ForceHttps", module_name_readable: "Force HTTPS", module_description: "Forces Use of Secure Connection" });
	ResKey.Modules.ModuleBase.call(me, o);
});
ResKey.Modules.ForceHttps.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.ForceHttps.prototype.constructor = ResKey.Modules.ForceHttps;
/****END ForceHttps****/


/****BEGIN AutoRefresh****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "AutoRefresh", function(o){
	var me = this;
	var REFRESH_INTERVAL_MILLISECONDS = 30000; //refresh every 30 seconds (initiated by idle state, canceled by active state)
	var IDLE_THRESHOLD_MILLISECONDS = 30000; //considered idle if 30 seconds have passed since last action	
	var refreshTimer;
	var idleTimer;
	
	var cancelTimers = function() {
		if (idleTimer != null) {
			clearTimeout(idleTimer);
		}
		if (refreshTimer != null) {
			clearInterval(refreshTimer);
		}
	};

	var actionDetected = function() {
		if (me.isEnabled() && ResKey.HelperUtility.currentlyOnAvailabilityTab()) {
			me._log("action detected");
			cancelTimers();
			awaitIdleState();		
		}
		else {
			cancelTimers();
		}
		return true;
	};

	var awaitIdleState = function() {
		me._log("awaiting idle state");
		idleTimer = setTimeout(function() { setRefreshTimer(); }, IDLE_THRESHOLD_MILLISECONDS);
	};

	var setRefreshTimer = function() {
		me._log("setting refresh timer");
		refreshTimer = setInterval(function(){ autoRefresh(); }, REFRESH_INTERVAL_MILLISECONDS);
	};

	var autoRefresh = function () {
		me._log("autorefresh state");
		if (!$('save')) {
			ResKey.HookHelper.setOldState(0);
			viewer('/reservations/availability.asp','','24');
		
			me._log("REFRESHING");
			actionDetected();
		}
		else {
			me._log("NOT REFRESHING - SAVE PRESENT");
			actionDetected();
		}
	};

	var initiateHeartbeat = function() {
		me._log("initiating heartbeat...");
		jQuery(document).off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName).on("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName, function() { actionDetected(); });
		
		jQuery("iframe#califrame").contents().off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName).on("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName, function() { actionDetected(); });
		
		jQuery("iframe#califrame").load(function(){
			jQuery("iframe#califrame").contents().off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName).on("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName, function() { actionDetected(); });
		});
	};

	var cancelHeartbeat = function() {
		me._log("canceling heartbeat");
		jQuery(document).off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName);	
		jQuery("iframe#califrame").contents().off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName);
	};

	me.getRefreshInterval = function() {
		return REFRESH_INTERVAL_MILLISECONDS;
	};
	
	me.getIdleInterval = function() {
		return IDLE_THRESHOLD_MILLISECONDS;
	};

	me._pageChangeEventHandler = function(e) {
		me.turnOnOrOffBasedOnCurrentPage();
	};
	
	me._ajaxStateChangeEventHandler = function(e) {
		if (me.isEnabled() && ResKey.HelperUtility.currentlyOnAvailabilityTab()) {
			jQuery("iframe#califrame").contents().off("click."+me._className+" keydown."+me._className+" keyup."+me._className).on("click."+me._className+" keydown."+me._className+" keyup."+me._className, actionDetected);
		}
	};

	me._enable = function() {
		me.attachToPageEvents();
	};
	
	me._disable = function() {
		me.detachFromPageEvents();
	};
	
	me._turnOn = function() {
		me.attachToAjaxStateChange();
		initiateHeartbeat();
		awaitIdleState();
	};
	
	me._turnOff = function() {
		me.detachFromAjaxStateChange();
		setTimeout(function(){
			cancelHeartbeat();
			cancelTimers(); 
		}, 100); //using setTimeout to solve most queuing issues
	};
	
	me._isOnRelevantPage = function() {
		return ResKey.HelperUtility.currentlyOnAvailabilityTab();
	};
	
	me._initializeModule = function() {
		if (me.isEnabled()) {
			me._enable();
		}
	};
	
	o = jQuery.extend(o, { module_name: "AutoRefresh", module_name_readable: "Auto-Refresh Calendar", module_description: "Automatically refresh availability grid every "+(me.getRefreshInterval()/1000)+" seconds (after idle time of "+(me.getIdleInterval()/1000)+" seconds)" });
	ResKey.Modules.ModuleBase.call(this, o);
});
ResKey.Modules.AutoRefresh.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.AutoRefresh.prototype.constructor = ResKey.Modules.AutoRefresh;
/*****END AutoRefresh*****/


/*****BEGIN AutoReminders*****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "AutoReminders", function(o){
	var me = this;

	me.showMyReminders = function() {
		me._log("opening reminders");

		jQuery("#resinfowindow").load("/inc/viewreminders.asp").show();
	};
	
	me._turnOn = function() {
		if (jQuery("div:visible[style*='sticky'] span").text() > 0) {
			me.showMyReminders();
		}
	};
		
	me._isOnRelevantPage = function() {
		return true;
	};
	
	me._initializeModule = function() {
		if (me.isEnabled()) {
			me._enable();
		}
	};
	
	o = jQuery.extend(o, { module_name: "AutoReminders", module_name_readable: "Auto Reminders", module_description: "Automatically show Reminders if any are due today." });
	ResKey.Modules.ModuleBase.call(me, o);	
});
ResKey.Modules.AutoReminders.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.AutoReminders.prototype.constructor = ResKey.Modules.AutoReminders;
/*****END AutoReminders******/


/****BEGIN DoublePaymentPrevention****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "DoublePaymentPrevention", function(o){
	var me = this;
	
	me._pageChangeEventHandler = function(e) {
		me.turnOnOrOffBasedOnCurrentPage();
	};
	
	me._ajaxStateChangeEventHandler = function(e) {
		ResKey.HelperUtility.preventFutureInlineOnClickForAnchor(jQuery("#pricedetails_div a:contains('Remove')"));
	};

	me._enable = function() {
		me.attachToPageEvents();
	};
	
	me._disable = function() {
		me.detachFromPageEvents();
	};
	
	me._turnOn = function() {		
		me.attachToAjaxStateChange();
			
		jQuery(document).off("mouseup."+me._eventName, "#button_addpayment").on("mouseup."+me._eventName, "#button_addpayment", function(e){ 
			if (e.which == 1) {
				jQuery(this).disable();
				
				if (confirm("Make payment?")) {
					ResKey.HelperUtility.executeDefaultOnClick(this);
				}
				else {
					jQuery(this).enable();
					ResKey.HelperUtility.preventDefaultOnClick(this);
				}
				return false;
			}
		});
		
		jQuery(document).off("mouseup."+me._eventName, "#button_chargecard").on("mouseup."+me._eventName, "#button_chargecard", function(e){
			if (e.which == 1) {
				jQuery(this).disable();

				if (confirm("Charge card " + $('idcontactcc_charge_temp').value + "?")){
					ResKey.HelperUtility.executeDefaultOnClick(this);
				}
				else {
					jQuery(this).enable();
					ResKey.HelperUtility.preventDefaultOnClick(this);
				}
				return false;
			}
		});
		
		//solution: remove onclick on these anchors (when...?), save them to data("onclick"), then call: eval("("+$(this).data("onclick")+")();"); ( http://stackoverflow.com/questions/1756425/prevent-onclick-action-with-jquery )
		jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Remove')").on("click."+me._eventName, "#pricedetails_div a:contains('Remove')", function(e) {
			if (e.which == 1) {
				jQuery(this).disable();
				if (confirm("Remove payment?")){
					ResKey.HelperUtility.executeInlineOnClickForAnchor(this, e);
				}
				else {
					jQuery(this).enable();
				}
				return false;
			}
		});
		
		jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Refund')").on("click."+me._eventName, "#pricedetails_div a:contains('Refund')", function(e) {
			if (e.which == 1) {
				jQuery(this).disable();
				if (confirm("Refund payment?")){
					ResKey.HelperUtility.executeInlineOnClickForAnchor(this, e);
				}
				else {
					jQuery(this).enable();
				}
				return false;
			}
		});			
	};
	
	me._turnOff = function() {
		jQuery(document).off("mouseup."+me._eventName, "#button_addpayment");
		jQuery(document).off("mouseup."+me._eventName, "#button_chargecard");
		jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Remove')");
		jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Refund')");
		me.detachFromAjaxStateChange();
	};
	
	me._isOnRelevantPage = function() {
		return ResKey.HelperUtility.currentlyOnReservationsTab();
	};
	
	me._initializeModule = function() {
		if (me.isEnabled()) {
			me._enable();
		}
	};
	
	o = jQuery.extend(o, { module_name: "DoublePaymentPrevention", module_name_readable: "Double Payment Prevention", module_description: "Prevents accidental double-charging" });
	ResKey.Modules.ModuleBase.call(me, o);	
});
ResKey.Modules.DoublePaymentPrevention.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.DoublePaymentPrevention.prototype.constructor = ResKey.Modules.DoublePaymentPrevention;
/****END DoublePaymentPrevention****/


/****BEGIN CreditCardTypeAutoSelector****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "CreditCardTypeAutoSelector", function(o){
	var me = this;
	
	//This could be much more sophisticated if we wanted: http://stackoverflow.com/questions/72768/how-do-you-detect-credit-card-type-based-on-number
	var getCardTypeBasedOnCardNumber_US = function(cardNumber) {
		var firstNumber = (cardNumber.length > 0 ? cardNumber[0] : "");
		switch(firstNumber) {
			case "4": return "Visa";
			case "5": return "Mastercard";
			case "3": return "American Express";
			case "6": return "Discover";
			default: return "";
		}
	};
	
	var selectCardType = function(cardTypeName) {
		if (jQuery("#cctype option:contains('"+cardTypeName+"')").length > 0) {
			jQuery("#cctype").val(jQuery("#cctype option:contains('"+cardTypeName+"')").first().val());
		}
	};
	
	me._pageChangeEventHandler = function(e) {
		me.turnOnOrOffBasedOnCurrentPage();
	};
	
	me._enable = function() {
		me.attachToPageEvents();
	};
	
	me._disable = function() {
		me.detachFromPageEvents();
	};
	
	me._turnOn = function() {		
		jQuery(document).off("keyup."+me._eventName, "#ccnum").on("keyup."+me._eventName, "#ccnum", function(e) {
			var cardType = getCardTypeBasedOnCardNumber_US(jQuery(this).val());
			
			selectCardType(cardType);
			
			return true;
		});
	};
	
	me._turnOff = function() {
		jQuery(document).off("keyup."+me._eventName, "#ccnum");
	};
	
	me._isOnRelevantPage = function() {
		return ResKey.HelperUtility.currentlyOnReservationsTab();
	};
	
	me._initializeModule = function() {
		if (me.isEnabled()) {
			me._enable();
		}
	};
	
	o = jQuery.extend(o, { module_name: "CreditCardTypeAutoSelector", module_name_readable: "CC Type Auto Selector", module_description: "Automatically selects credit card type based on CC #" });
	ResKey.Modules.ModuleBase.call(me, o);	
});
ResKey.Modules.CreditCardTypeAutoSelector.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.CreditCardTypeAutoSelector.prototype.constructor = ResKey.Modules.CreditCardTypeAutoSelector;
/****END CreditCardTypeAutoSelector****/


/****BEGIN AjaxHistory****/
//TODO: FEATURE this needs to handle edge cases like opening a reservation from the calendar (which it does except for tab coloring)
//TODO: FEATURE allow this to work across actual back actions (for instance, going from "website/*" pages to "properties/*" pages & back) - probably because we're always using "viewer" and not the subfunctions
//TODO: FEATURE we may want to remove (sid=[\.0-9]+)& to force a full reload instead of the saved one
//TODO: REVIEW BUG when going back to an ajax page that was only a partial load (loading "payments" on a reservation, or opening a forum thread, for instance) - would this have happened with the "named pages" approach?
//TODO: REVIEW MAYBE BUG this is using the AJAX state, which will probably result in some problems w/ autorefresh (maybe?)
//TODO: REVIEW MAYBE BUG could this be causing multiple credit card processing or payments for instance, since we're using the ajax state change?
//TODO: REVIEW remove lasthash array?
//TODO: TEST all pages if possible, including forums - this isn't working in some places, losing querystring params is killing it
//TODO: REFACTOR
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "AjaxHistory", function(o){
	var me = this;
	var previousPage;
	var movingThroughHistory;
	var pageHashMap;
	var lastHashMapped;
	var lastUrlMapped;

	var disableDhtmlHistory = function() {
		//need to kill off dhtmlHistory because it is buggy and messes up our system here.
		window.dhtmlHistory.checkLocationOld = window.dhtmlHistory.checkLocation;
		window.dhtmlHistory.checkLocation = function(){};
		window.historyStorageOld = window.historyStorage;
		window.historyStorage = null;
	};

	var reenableDhtmlHistory = function() {
		window.historyStorage = window.historyStorageOld;
		window.historyStorageOld = null;
		window.dhtmlHistory.checkLocation = window.dhtmlHistory.checkLocationOld;
		window.dhtmlHistory.checkLocationOld = null;
	};

	var pageHasHorizontalMenu = function(pageURL) {
		return pageURL.indexOf('/reservations/') > -1;
	};

	var setHorizontalMenuItemAsCurrentPage = function(basicURL) {
		jQuery("#sidebuttons a[onclick*='"+basicURL+"']").parents("td[id*='t']").css("backgroundColor", "white").css("backgroundImage","url('../i/sideshade.gif')").css("backgroundRepeat", "repeat-y").css("backgroundPosition", "right center");
	};

	var setVerticalMenuItemAsCurrentPage = function(basicURL) {
		jQuery("#sidebuttons a[onclick*='"+basicURL+"']").parents("td[id*='t']").css("backgroundColor", "white").css("backgroundImage","url('../i/sidetabbackon.gif')").css("backgroundRepeat", "repeat-x").css("backgroundPosition", "center bottom");
	};

	var adjustSelectionOfCurrentPageTab = function() {
		var basicURL = getBasicPageUrlForCurrentPage();
		adjustSelectionOfCurrentPageTabToMatchBasicURL(basicURL);
	};

	var adjustSelectionOfCurrentPageTabToMatchBasicURL = function(basicURL) {
		me._log("adjusting menu item selection to match page: "+basicURL);

		//this currently doesn't work for certain special cases like the reservation details and probably more

		//clear old selection if we can add a new one
		// if (jQuery("#sidebuttons a[onclick*='"+url+"']").length > 0) {
		jQuery("#sidebuttons a").parents("td[id*='t']").filter(function(o){ return jQuery(this).css("background-color") == "rgb(255, 255, 255)"}).css("backgroundColor", "").css("backgroundImage", "none");
		// }

		if (pageHasHorizontalMenu(basicURL)) {
			setHorizontalMenuItemAsCurrentPage(basicURL);
		}
		else {
			setVerticalMenuItemAsCurrentPage(basicURL);
		}
	};

	var loadPageFromHashTag = function(pageHashTag) {
		var viewerURL = getViewerUrlForPageHashTag(pageHashTag);
		var basicURL = extractBasicPageUrlFromViewerUrl(viewerURL);
		var queryStringParameters = extractQueryStringParametersFromViewerUrlForViewer(viewerURL);
		me._log("loading page: "+pageHashTag+" (url: "+viewerURL+")");

		if ($('save')) {
			$('save').click();
		} 

		viewer(basicURL,queryStringParameters,'');
		adjustSelectionOfCurrentPageTabToMatchBasicURL(basicURL);
	};

	var saveCurrentPageToHistory = function() {
		previousPage = getPageHashTagForCurrentPage();
		savePageHashTag(previousPage);
	};

	var savePageHashTag = function(pageHashTagToSave) {
		if (pageHashTagToSave != null) {
			me._log("saving page: "+pageHashTagToSave);
			window.location.lasthash.push(window.location.hash);
			window.location.hash = pageHashTagToSave;
		}
	};

	var backPage = function() {
		var pageHashTagToLoad = window.location.hash.replace('#','');
		me._log("going back to page: "+pageHashTagToLoad);
		movingThroughHistory = true;

		updateHash();

		//loadPage(prevPage);
		loadPageFromHashTag(pageHashTagToLoad);
	};

	var updateHash = function() {
		if (movingThroughHistory && window.location.lasthash.length > 0) { //pageHistory.length > 0
			window.location.lasthash.pop();
		}
	};

	var swallowBackspace = function() { //prevent "back" initiation with backspace - courtesy of http://stackoverflow.com/questions/25806608/how-to-detect-browser-back-button-event-cross-browser
		var rx = /INPUT|SELECT|TEXTAREA/i;

		jQuery(document).off("keydown."+me._eventName+" keypress."+me._eventName).on("keydown."+me._eventName+" keypress."+me._eventName, function(e){
			if( e.which == 8 ){ // 8 == backspace
				if(!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly) {
					me._log("swalllowing backspace");
					e.preventDefault();
				}
			}
		});
	};

	var unswallowBackspace = function() {
		jQuery(document).off("keydown."+me._eventName+" keypress."+me._eventName);
	};	

	var isMouseInsideDocument = function() {
		return jQuery(document).find(":hover").length > 0;
	};

	//http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
	//TODO: REFACTOR move this out to different helper class
	var generateHashFromString = function(stringToHash) {
		var hash = 0, i, chr, len;
		if (stringToHash.length == 0) return hash;
		for (i = 0, len = stringToHash.length; i < len; i++) {
			chr   = stringToHash.charCodeAt(i);
			hash  = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	};

	var logAjaxUrl = function(urlString) {
		mapHashToURL(urlString);
	};

	var mapHashToURL = function(urlString) {
		var hashTag = createPageHashTagFromFullUrl(urlString);
		var viewerURL =  createViewerUrlFromFullUrl(urlString);
		
		associatePageHashTagWithViewerUrl(hashTag, viewerURL);
		
		lastHashMapped = hashTag;
		lastUrlMapped = viewerURL;
		me._log("mapping hash ("+lastHashMapped+") for URL: "+lastUrlMapped);
	};

	var createBasicPageUrlFromFullUrl = function(urlString) {
		var results = /reservationkey.com\/([^.]+)\/([^.]+)\.asp/.exec(urlString);
		var savedURL = '/'+results[1]+'/'+results[2]+'.asp';

		return '/'+results[1]+'/'+results[2]+'.asp';
	};

	var createViewerUrlFromFullUrl = function(urlString) {
		var results = /reservationkey.com(.+)$/.exec(urlString);
		var viewerURL = results[1];

		return viewerURL;
	};

	var extractBasicPageUrlFromViewerUrl = function(viewerURL) {
		var results = /([^?]+)\?/.exec(viewerURL);
		var basicURL = results[1];

		return basicURL;
	};

	var extractQueryStringParametersFromViewerUrlForViewer = function(viewerURL) {
		var results = /[^?]+\?(.+)/.exec(viewerURL);
		var queryStringParameters = results[1];

		return queryStringParameters;
	};


	var createPageHashTagFromFullUrl = function(urlString) {
		/*var results = /reservationkey.com\/([^.]+)\/([^.]+)\.asp/.exec(urlString);
		var pagePrefix = results[1]
		var pageName = results[2];
		return pagePrefix+"-"+pageName;*/
		return generateHashFromString(urlString);
	};

	var associatePageHashTagWithViewerUrl = function(hashTag, viewerURL) {
		pageHashMap[hashTag] = viewerURL;
	};

	var getViewerUrlForPageHashTag = function(hashTag) {
		return pageHashMap[hashTag];
	};

	var getPageHashTagFromViewerUrl = function(viewerURL) {
		for (key in pageHashMap) {
			if (pageHashMap[key] == viewerURL) {
				return key;
			}
		}
		return null;
	};

	var getBasicPageUrlForCurrentPage = function() {
		return extractBasicPageUrlFromViewerUrl(lastUrlMapped);
	};

	var getPageUrlForCurrentPage = function() {
		return lastUrlMapped;
	};

	var getPageHashTagForCurrentPage = function() {
		//return ResKey.HelperUtility.getCurrentPageName();
		return lastHashMapped;  //this will fail for initial load if the module isn't ON for first page load
	};

	me._ajaxStateChangeEventHandler = function(e) {	
		if (!movingThroughHistory) {
			var currentPageURL = xmlHttp.responseURL;
			logAjaxUrl(currentPageURL);
			saveCurrentPageToHistory();
		}
		else {
			movingThroughHistory = false;
		}
		//adjustSelectionOfCurrentPageTab();
	};	
	
	me._pageChangeEventHandler = function(e) {
		/*if (!movingThroughHistory) {
			saveCurrentPage();
			previousPage = getPageHashTagForCurrentPage();
			savePage(previousPage);
		}
		else {
			movingThroughHistory = false;
		}
		adjustSelectionOfCurrentPageTab();
		*/
	};	
	
	me._enable = function() {
		me.attachToPageEvents();
		me.attachToAjaxStateChange();
	};
	
	me._disable = function() {	
		me.detachFromAjaxStateChange();
		me.detachFromPageEvents();
	};
	
	me._turnOn = function() {
		var initialURL = "https://v2.reservationkey.com/reservations/reservations.asp";
		disableDhtmlHistory();
		window.location.lasthash = new Array();
		pageHashMap = {};
		lastHashMapped = createPageHashTagFromFullUrl(initialURL);
		lastUrlMapped = createViewerUrlFromFullUrl(initialURL); //DEFAULT
		associatePageHashTagWithViewerUrl(lastHashMapped, lastUrlMapped);
		saveCurrentPageToHistory();
		movingThroughHistory = false;
		
		//at this point, hash has already changed
		window.onhashchange = function() {
			if (!movingThroughHistory) {
				me._log("window.hashchange...");
				if (isMouseInsideDocument()) { //Your own in-page mechanism triggered the hash change
					me._log("in-page mechanism clicked."); //this is being triggered when back button clicked
				} else { //Browser back button was clicked 
					me._log("back button clicked.");
					if (window.location.hash != '') {
						backPage();
					} else { //default back behavior
						history.pushState("", document.title, window.location.pathname);
						location.reload();
					}
				}
			}
			else {
				movingThroughHistory = false;
			}
			return true;
		};	

		swallowBackspace();
	};
	
	me._turnOff = function() {
		window.onhashchange = null;
		window.location.lasthash = null;
		window.location.hash = '';
		previousPage = null;
		pageHistory = null;
		pageFuture = null;
		me.detachFromAjaxStateChange();
		unswallowBackspace();
		reenableDhtmlHistory();
	};
	
	me._isOnRelevantPage = function() {
		return true;
	};
	
	me._initializeModule = function() {
		if (me.isEnabled()) {
			me._enable();
		}
	};
	
	o = jQuery.extend(o, { module_name: "AjaxHistory", module_name_readable: "Browser History", module_description: "Enables limited use of back &amp; forward browser functions" });
	ResKey.Modules.ModuleBase.call(me, o);
});
ResKey.Modules.AjaxHistory.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.AjaxHistory.prototype.constructor = ResKey.Modules.AjaxHistory;
/****END AjaxHistory****/


/****BEGIN BillingAddressParser****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "BillingAddressParser", function(o){
	var me = this;
	var defaultCountry;
	var Address = {
		StreetAddress1: "",
		StreetAddress2: "",
		City: "",
		State: "",
		Zip: "",
		Country: ""
	};

	var parseOutCountry = function(addressText) {
	    var resArray = /([\s\S]*)\n(.*)$/.exec(addressText);
	    var countryOrLastLine = resArray[2];
	    if (/^[a-zA-Z]+$/.test(countryOrLastLine)) {
	        return countryOrLastLine;
	    }
	    
	    return "";
	}

	var chopOffLastLine = function(str) {
	    return /([\s\S]*)\n(.*)$/.exec(str)[1];
	}

	var chopOffLastTextBlock = function(str) {
	    return /([\s\S]*) (.*)$/.exec(str)[1];
	}

	var parseOutZip = function(addressText) {
	  var resArray = /([\s\S]*) ([0-9\-]*)$/.exec(addressText);
	  return resArray[2];
	}

	var parseOutState = function(addressText) {
	  var resArray = /([\s\S]*), ([a-zA-Z]*)$/.exec(addressText);
	  return resArray[2]; 
	}

	var parseOutCity = function(addressText) {
	  var resArray = /([\s\S]*)\n([a-zA-Z ]*)$/.exec(addressText);
	  return resArray[2];    
	}

	var parseOutAddress1 = function(addressText) {
	  var resArray = /^(.+)(\n)?/.exec(addressText);
	  return resArray[1];  
	}

	var parseOutAddress2 = function(addressText) {
	  var resArray = /.+\n(.*)$/.exec(addressText);
	  if (resArray != null) {
	      return resArray[1];  
	  }
	  return "";
	}

	var createAddressObjectFromUserEnteredText = function(addressText) {
		me._log("parsing address: "+addressText);
		//start at the end

		//is it text? if so is COUNTRY
		//otherwise is ZIP XXXXX-XXXX
		//next is state , XX
		//next is city
		//next is street address 1 & possibly 2

		var textToParse = addressText;
		var country = parseOutCountry(textToParse);
		me._log("country: "+country);
		if (country != "") {   
		    //then chop off country
		    textToParse = chopOffLastLine(textToParse);   
		}
		var zip = parseOutZip(textToParse);  
		me._log("zip: "+zip);
		textToParse = chopOffLastTextBlock(textToParse);
		var state = parseOutState(textToParse);
		me._log("state: "+state);
		textToParse = chopOffLastTextBlock(textToParse);
		textToParse = textToParse.substr(textToParse, textToParse.length-1);
		var city = parseOutCity(textToParse);
		me._log("city: "+city);
		textToParse = chopOffLastLine(textToParse);
		var addr1 = parseOutAddress1(textToParse);
		me._log("addr1: "+addr1);
		var addr2 = parseOutAddress2(textToParse);
		me._log("addr2: "+addr2);
		Address.Zip = zip;
		Address.State = state;
		Address.City = city;
		if (country == "") { 
			country = defaultCountry;
		}
		Address.Country = (country == "USA") ? "US" : country;
		Address.StreetAddress1 = addr1;
		Address.StreetAddress2 = addr2;
	};

	var fillAddressFieldsFromAddress = function() {
		jQuery("#ccaddress").val(Address.StreetAddress1+" "+Address.StreetAddress2);
		jQuery("#cccountry").val(Address.Country);
		jQuery("#cccity").val(Address.City);
		jQuery("#ccstate").val(Address.State);
		jQuery("#cczip").val(Address.Zip);
	};

	var fillAddressNormally = function(addressText) {
		jQuery("#ccaddress").val(addressText);
	};
	
	var parseContactAddressIntoBillingAddress = function(addressText) {
		try {
			createAddressObjectFromUserEnteredText(addressText);
		
			fillAddressFieldsFromAddress();
			
			return true;
		}
		catch(ex) { //fallback to old behavior if odd case encountered.
			fillAddressNormally(addressText);
			return true;
		}
	};

	me._pageChangeEventHandler = function(e) {
		me.turnOnOrOffBasedOnCurrentPage();
	};
	
	me._enable = function() {
		me.attachToPageEvents();
	};
	
	me._disable = function() {
		me.detachFromPageEvents();
	};
	
	me._turnOn = function() {		
		jQuery(document).off("blur."+me._eventName, "#address").on("blur."+me._eventName, "#address", function(e) {
			me._log("blur detected with value: "+jQuery(this).val());
			parseContactAddressIntoBillingAddress(jQuery(this).val());
		});

		jQuery(document).off("click."+me._eventName, "a:contains('contact address')").on("click."+me._eventName, "a:contains('contact address')", function(e){
			me._log("'contact address' click detected");
			parseContactAddressIntoBillingAddress(jQuery("#address").val());
		});
	};
	
	me._turnOff = function() {
		jQuery(document).off("blur."+me._eventName, "#address");
		jQuery(document).off("click."+me._eventName, "a:contains('contact address')");
	};
	
	me._isOnRelevantPage = function() {
		return ResKey.HelperUtility.currentlyOnReservationsTab();
	};
	
	me._initializeModule = function(o) {
		if (me.isEnabled()) {
			me._enable();
		}
		defaultCountry = o.default_country;
	};

	o = jQuery.extend(o, { module_name: "BillingAddressParser", module_name_readable: "Billing Address Parser", module_description: "Parses City/State/Zip out of Contact Address into Billing Address fields for CC." });
	ResKey.Modules.ModuleBase.call(me, o);
});
ResKey.Modules.BillingAddressParser.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.BillingAddressParser.prototype.constructor = ResKey.Modules.BillingAddressParser;
/****END BillingAddressParser****/


/****BEGIN ReservationLinkBuilder****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "ReservationLinkBuilder", function(o){
	var me = this;
	var HTML_CONTAINER_ID = "ResKey_ReservationLinkBuilder";
	var RESERVATION_PAGE_DROPDOWN_ID = "ResKey_ReservationLinkBuilder_ReservationPage";
	var RESERVATION_LINK_TEXTBOX_ID = "ResKey_ReservationLinkBuilder_ReservationLinkText";
	var GENERATE_LINK_BUTTON_ID = "ResKey_ReservationLinkBuilder_ReservationLinkGenerationButton";

	var createLinkBuildingUI = function() {
		var html = 	"<div id='"+HTML_CONTAINER_ID+"' style='float: left; font-size: .75em;'> " +
			"<span style='font-weight: bold;'>Pre-Booked Reservation Link Builder</span><br />" +
			"<select id='"+RESERVATION_PAGE_DROPDOWN_ID+"' title='Select a reservation page to direct the guest to for this reservation' style='font-size: 1em; margin-left: 5px;'></select><br />" +
			"<input type='text' id='"+RESERVATION_LINK_TEXTBOX_ID+"' title='Copy this link and send it to your guest' style='margin-left: 5px; width: 450px; font-size: 1em;' />" +
			"<button id='"+GENERATE_LINK_BUTTON_ID+"' style='font-size: 1em;'>Create Link</button>" +
		"</div>";

		me._log("creating UI...");
		jQuery(html).appendTo("#resdetails_head");

		//add event handlers
		var reservationPages = ResKey.AdvancedDataUtility.getReservationPages();
		var currentReservationPage;
		jQuery.each(reservationPages, function(i){
			currentReservationPage = reservationPages[i];
			me._log("adding reservation page "+currentReservationPage.Name+"...");
			if (typeof currentReservationPage.AvailabilityURL != "undefined") {
				jQuery("#"+RESERVATION_PAGE_DROPDOWN_ID).append("<option value='"+currentReservationPage.AvailabilityURL+"'>"+currentReservationPage.Name+" - Availability</option>");
			}
			if (typeof currentReservationPage.CalendarURL != "undefined") {
				jQuery("#"+RESERVATION_PAGE_DROPDOWN_ID).append("<option value='"+currentReservationPage.CalendarURL+"'>"+currentReservationPage.Name+" - Calendar</option>");
			}
		});

		jQuery(document).on("click."+this._eventName, "#"+GENERATE_LINK_BUTTON_ID, function(){
			var reservationID = /Reservation Details: #([0-9]+)/.exec(jQuery("#resdetails_head h2").text())[1];
			var arrivalDate = new Date(jQuery("#arrive_new").val());
			var departureDate = new Date(jQuery("#depart_new").val());
			var startDateAsMMDotDDDotYYYY = (arrivalDate.getMonth()+1)+"."+(arrivalDate.getDate())+"."+(arrivalDate.getFullYear());
			var endDateAsMMDotDDDotYYYY = (departureDate.getMonth()+1)+"."+(departureDate.getDate())+"."+(departureDate.getFullYear());
			var reservationURL = "";
			if (jQuery("#"+RESERVATION_PAGE_DROPDOWN_ID+" option:selected").text().indexOf("Availability") >= 0) {
				reservationURL = jQuery("#"+RESERVATION_PAGE_DROPDOWN_ID).val()+"/s|"+startDateAsMMDotDDDotYYYY+"|"+endDateAsMMDotDDDotYYYY+"/idr|"+reservationID
			}
			else if (jQuery("#"+RESERVATION_PAGE_DROPDOWN_ID+" option:selected").text().indexOf("Calendar") >= 0) {
				reservationURL = jQuery("#"+RESERVATION_PAGE_DROPDOWN_ID).val()+"/s|"+startDateAsMMDotDDDotYYYY+"/idr|"+reservationID
			}
			jQuery("#"+RESERVATION_LINK_TEXTBOX_ID).val(reservationURL);
		});
	};

	var removeLinkBuildingUI = function() {
		jQuery("#"+HTML_CONTAINER_ID).remove();
	};

	me._pageChangeEventHandler = function(e) {
		me.turnOnOrOffBasedOnCurrentPage();
	};

	me._ajaxStateChangeEventHandler = function(e) {
		if (me.isEnabled() && ResKey.HelperUtility.currentlyOnReservationsTab()) {
			if (jQuery("#"+HTML_CONTAINER_ID).length == 0) {
				createLinkBuildingUI();	
			}
		}
	};
	
	me._enable = function() {
		me.attachToPageEvents();
	};
	
	me._disable = function() {
		me.detachFromPageEvents();
	};
	
	me._turnOn = function() {		
		me.attachToAjaxStateChange();	
	};
	
	me._turnOff = function() {
		me.detachFromAjaxStateChange();
		removeLinkBuildingUI();
	};
	
	me._isOnRelevantPage = function() {
		return ResKey.HelperUtility.currentlyOnReservationsTab();
	};
	
	me._initializeModule = function(o) {
		if (me.isEnabled()) {
			me._enable();
		}
	};

	o = jQuery.extend(o, { module_name: "ReservationLinkBuilder", module_name_readable: "Reservation Link Builder", module_description: "Assists in the creation of a custom reservation link to share with potential guests." });
	ResKey.Modules.ModuleBase.call(me, o);
});
ResKey.Modules.ReservationLinkBuilder.prototype = Object.create(ResKey.Modules.ModuleBase.prototype);
ResKey.Modules.ReservationLinkBuilder.prototype.constructor = ResKey.Modules.ReservationLinkBuilder;
/****END ReservationLinkBuilder*****/

/****BEGIN EnhancementsController****/
Utils.NamespaceUtility.RegisterClass("ResKey", "EnhancementsController", new function(o){
	var me = this;
	var moduleList;
	
	var createCheckboxForModule = function(module) {
		var checkbox;
		
		if (isExperimentalModule(module._moduleName)) {
 			checkbox = jQuery("<input type='checkbox' id='chk+"+module._moduleName+"' style='margin-left: 10px;' title='"+module._moduleDescription+"' /><label style='color: red;'>"+module._moduleNameReadable+"</a>");
		}
		else {
 			checkbox = jQuery("<input type='checkbox' id='chk+"+module._moduleName+"' style='margin-left: 10px;' title='"+module._moduleDescription+"' /><label>"+module._moduleNameReadable+"</a>");
		}

		if (module.isEnabled()) {
			checkbox.prop("checked", true);
		}	

		checkbox.on("click.gmEnhancementsController", function(){
			if (jQuery(this).prop("checked")){
				module.enableAndTurnOn();
			}
			else {
				module.disableAndTurnOff();
			}
			return true;
		});

		return checkbox;
	};

	var addCheckboxForModuleToController = function(module) {
		jQuery(jQuery("<div style='float: left; margin-right: 10px;' />").append(createCheckboxForModule(module))).appendTo("#EnhancementsController_ModuleContainer");
	};

	var isExperimentalModule = function(moduleName) {
		return ResKey.Settings.MODULES_LIST_EXPERIMENTAL.indexOf(moduleName) >= 0;
	};

	var addModulesToController = function() {
		var currentModule;
		jQuery.each(moduleList, function(i){
			currentModule = moduleList[i];
			addCheckboxForModuleToController(currentModule);
		});
	};

	var initEnhancementsController = function() {
		ResKey.HelperUtility.log("adding enhancements controller...");
		var enhancementsController = "<div id='EnhancementsController' style='width: 575px; height: 100px; position: fixed; bottom: 50px; left: 10px; background-color: white; border: 1px solid black; padding: 5px; -moz-box-shadow: 0 4px 8px rgba(0,0,0,0.5); -webkit-box-shadow: 0 4px 8px rgba(0,0,0,0.5); box-shadow: 0 4px 8px rgba(0,0,0,0.5); display: none;'><div id='EnhancementsController_ModuleContainer'></div><span style='font-size: .75em; font-style: italic; position: absolute; bottom: 2px; right: 2px;'>ResKey Usability Enhancements</span></div>";
		var enhancementsControllerToggle = "<div id='EnhancementsControllerToggle' style='color: blue; background-color: white; padding: 5px; position: fixed; bottom: 0px; left: 0px; cursor: pointer; font-size: .5em;'><span title='Toggle Enhancements Controller'>[ + ]</span></div>";
		
		jQuery(enhancementsController).insertBefore("#resinfowindow");
		jQuery(enhancementsControllerToggle).insertBefore("#resinfowindow");
		jQuery("#EnhancementsControllerToggle").on("click.gmEnhancementsController", function(){
			if (jQuery("#EnhancementsController:visible").length > 0) {
				jQuery("#EnhancementsController").hide("slide", { direction: "left" });
				jQuery("span", this).text("[ + ]");
			}
			else {
				jQuery("#EnhancementsController").show("slide", { direction: "left" });
				jQuery("span", this).text("[ - ]");
			}
		});
		
		addModulesToController();
	};

	me.insertIntoPage = function(pmoduleList) {
		ResKey.HelperUtility.log("inserting enhancements controller into page...");
		moduleList = pmoduleList;
		initEnhancementsController();
	};
	
	var init = function(options) {};

	init(o);
});
/****END EnhancementsController****/


/****BEGIN HookHelper****/
Utils.NamespaceUtility.RegisterClass("ResKey", "HookHelper", new function(o){
	var me = this;
	var currentPage;
	var previousPage;
	var oldState = null;
	
	var ajaxStateChangedToReady = function(){
		ResKey.HelperUtility.log("ajax state changed to ready");
		jQuery(document).trigger("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL);
	};

	var determineAjaxState = function() {
		if (oldState != xmlHttp.readyState && xmlHttp.readyState == 4) {
			oldState = xmlHttp.readyState; //putting this here so we immediately catch the new state (if ajaxStateChangedToReady errors, this could go on forever)
			ajaxStateChangedToReady();
		}
		else {
			oldState = xmlHttp.readyState;
		}
	};

	var initAjaxHooks = function() {
		setInterval(determineAjaxState, ResKey.Settings.AJAXSTATE_POLLTIME_MILLISECONDS);
	};

	var pageChanged = function() {
		ResKey.HelperUtility.log("Current page: " + currentPage + " (previous: " + previousPage + ")");
		jQuery(document).trigger("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL);
	};

	var determineCurrentPage = function() {
		var initialLoad = (typeof previousPage == "undefined");
		previousPage = currentPage;
		currentPage = ResKey.HelperUtility.getCurrentPageName();
		
		if (currentPage != previousPage && !initialLoad) {
			pageChanged();
		}
	};

	var initPageChangeSensor = function() {
		determineCurrentPage();
		setInterval(determineCurrentPage, ResKey.Settings.CURRENTPAGE_POLLTIME_MILLISECONDS); //poll to look for page changes
	};
	
	me.getCurrentPage = function() { return currentPage; }
	
	me.getPreviousPage = function() { return previousPage; }
	
	me.setOldState = function(val) { oldState = val; } 
	
	me.start = function() {
		initPageChangeSensor();
		initAjaxHooks();
	};

	var init = function(options) {};
	
	init(o);
});
/****END HookHelper****/


/****BEGIN UsabilityEnhancements****/
Utils.NamespaceUtility.RegisterClass("ResKey", "UsabilityEnhancements", new function(o){
	var me = this;
	var moduleList;
	
	var allowExperimentalModules = function() {
		return ResKey.Settings.ALLOW_EXPERIMENTAL_MODULES;
	};

	var initModules = function() {
		ResKey.HelperUtility.log("initializing modules...");
		moduleList = new Array();
		var currentModuleName;
		var currentOptions;
		jQuery.each(ResKey.Settings.MODULES_LIST_RELEASED, function(i){
			currentModuleName = ResKey.Settings.MODULES_LIST_RELEASED[i];
			currentOptions = jQuery.extend({}, ResKey.Settings.MODULE_DEFAULTS, ResKey.Settings.MODULE_OPTIONS[currentModuleName]);
			moduleList.push(ResKey.Modules.ModuleFactory.getModule(currentModuleName, currentOptions));
		});
		
		if (allowExperimentalModules()) {
			jQuery.each(ResKey.Settings.MODULES_LIST_EXPERIMENTAL, function(i){
				currentModuleName = ResKey.Settings.MODULES_LIST_EXPERIMENTAL[i];
				currentOptions = jQuery.extend({}, ResKey.Settings.MODULE_DEFAULTS, ResKey.Settings.MODULE_OPTIONS[currentModuleName]);
				moduleList.push(ResKey.Modules.ModuleFactory.getModule(currentModuleName, currentOptions));
			});
		}
	};

	var initPageWhenFullyLoaded = function() {
		if (ResKey.HelperUtility.pageIsReady()) { //page isn't ready for us to set up modules until all the AJAX has completed
			ResKey.HelperUtility.log("page ready. beginning setup...");
			
			ResKey.HookHelper.start();
			//ResKey.AdvancedDataUtility.loadData(); //disabled for now, because we don't need it & it unnecessarily hits the server
			initModules();
			ResKey.EnhancementsController.insertIntoPage(moduleList);
		}
		else {
			setTimeout(initPageWhenFullyLoaded, 500);
		}
	};
	
	me.run = function() {
		ResKey.HelperUtility.log("starting ResKey Usability Enhancements...");
		ResKey.HelperUtility.extendJQuery();
		setTimeout(initPageWhenFullyLoaded, 500);	
	};
	
	var init = function(options) {};
	
	init(o);
});
/****END UsabilityEnhancements****/


jQuery(function(){
	ResKey.UsabilityEnhancements.run();	
});