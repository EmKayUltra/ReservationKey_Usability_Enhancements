// ==UserScript==
// @name        ReservationKey Usability Enhancements
// @namespace   reservationkey.com
// @description Various usability enhancements to Reservation Key
// @include    http://v2.reservationkey.com/reservations/
// @include    https://v2.reservationkey.com/reservations/
// @include    http://v2.reservationkey.com/reservations/?*
// @include    https://v2.reservationkey.com/reservations/?*
// @resource   http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/themes/smoothness/jquery-ui.css
// @require    http://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js
// @require    http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.js
// @require    https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
// @version    1.1
// @grant      none
// ==/UserScript==
/* NOTE: "@include" very specific (no general-case asterixes, etc) because otherwise all of this loads for every AJAX call as well */

/***


This script is provided courtesy of one ResKey lover, and it comes with no guarantees or warranties.  Use and modify at your own risk.


Enjoy!


***/

$.noConflict();  //no need to overwrite ResKey's existing $ function - we'll just call "jQuery" whenever we need jQuery functionality
console.log("starting ResKey GM script...");

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
// (function(){
//   var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
//   // The base Class implementation (does nothing)
//   this.Class = function(){};
 
//   // Create a new Class that inherits from this class
//   Class.extend = function(prop) {
//     var _super = this.prototype;
   
//     // Instantiate a base class (but only create the instance,
//     // don't run the init constructor)
//     initializing = true;
//     var prototype = new this();
//     initializing = false;
   
//     // Copy the properties over onto the new prototype
//     for (var name in prop) {
//       // Check if we're overwriting an existing function
//       prototype[name] = typeof prop[name] == "function" &&
//         typeof _super[name] == "function" && fnTest.test(prop[name]) ?
//         (function(name, fn){
//           return function() {
//             var tmp = this._super;
           
//             // Add a new ._super() method that is the same method
//             // but on the super-class
//             this._super = _super[name];
           
//             // The method only need to be bound temporarily, so we
//             // remove it when we're done executing
//             var ret = fn.apply(this, arguments);        
//             this._super = tmp;
           
//             return ret;
//           };
//         })(name, prop[name]) :
//         prop[name];
//     }
   
//     // The dummy class constructor
//     function Class() {
//       // All construction is actually done in the init method
//       if ( !initializing && this.init )
//         this.init.apply(this, arguments);
//     }
   
//     // Populate our constructed prototype object
//     Class.prototype = prototype;
   
//     // Enforce the constructor to be what we expect
//     Class.prototype.constructor = Class;
 
//     // And make this class extendable
//     Class.extend = arguments.callee;
   
//     return Class;
//   };
// })(); 
// var Person = Class.extend({
//   init: function(isDancing){
//     this.dancing = isDancing;
//   },
//   dance: function(){
//     return this.dancing;
//   }
// });
 
// var Ninja = Person.extend({
//   init: function(){
//     this._super( false );
//   },
//   dance: function(){
//     // Call the inherited version of dance()
//     return this._super();
//   },
//   swingSword: function(){
//     return true;
//   }
// });
 
// var p = new Person(true);
// p.dance(); // => true
 
// var n = new Ninja();

/****BEGIN GENERAL HELPERS****/
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

Utils.NamespaceUtility.RegisterClass("ResKey", "Settings", new function(){
	//May find a need to change one of these for some reason...
	this.ENABLE_LOGGING = true;
	this.ALLOW_EXPERIMENTAL_MODULES = false;
	this.CURRENTPAGE_POLLTIME_MILLISECONDS = 100;
	this.AJAXSTATE_POLLTIME_MILLISECONDS = 100;
	
	//Probably never change anything below this line
	this.JQUERY_EVENT_CLASS_PREFIX = "ResKeyGM_";
	this.JQUERY_EVENT_CLASS_GENERAL = this.JQUERY_EVENT_CLASS_PREFIX + "General";
	this.COOKIE_PREFIX = "ResKeyGM_";
	this.COOKIE_MODULE_ON_VALUE = 1;
	this.COOKIE_MODULE_OFF_VALUE = 0;
	this.COOKIE_MODULE_DEFAULT_VALUE = this.COOKIE_MODULE_OFF_VALUE;
	this.MODULE_DEFAULTS = { cookie_prefix: this.COOKIE_PREFIX, event_prefix: this.COOKIE_PREFIX, autoLoad: true, logging: false, module_name: "", module_name_readable: "", module_description: "" };
	this.MODULES_LIST_RELEASED = [ "ForceHttps", "AutoRefresh", "AutoReminders", "DoublePaymentPrevention", "CreditCardTypeAutoSelector" ];
	this.MODULES_LIST_EXPERIMENTAL = [ "AjaxHistory" ];
	this.MODULE_OPTIONS = { "AutoRefresh" : { logging: true } };
});

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
			default: return {};
		}
	};
});
/****END GENERAL HELPERS****/


/****BEGIN MODULEBASE****/
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
		
		this._initializeModule();
		
		if (options.autoLoad) {
			this.turnOnIfEnabled();
		}
	};
	
	this._init(o);
});

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

ResKey.Modules.ModuleBase.prototype._enable = function() {};

ResKey.Modules.ModuleBase.prototype._disable = function() {};

ResKey.Modules.ModuleBase.prototype._turnOn = function() {};

ResKey.Modules.ModuleBase.prototype._turnOff = function() {};

ResKey.Modules.ModuleBase.prototype._isOnRelevantPage = function() { return true; };

ResKey.Modules.ModuleBase.prototype._initializeModule = function() {};
/****END MODULEBASE****/


/****BEGIN FORCEHTTPS****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "ForceHttps", function(o){
	var me = this;
	
	me._enable = function() {};
	
	me._disable = function() {};
	
	me._turnOn = function() {
		if (window.location.protocol != "https:") window.location.href = "https:" + window.location.href.substring(window.location.protocol.length);
	};
	
	me._turnOff = function() {};
	
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
/****END FORCEHTTPS****/


/****BEGIN AUTOREFRESH****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "AutoRefresh", function(o){
	var me = this;
	var REFRESH_INTERVAL_MILLISECONDS = 30000; //refresh every 10 seconds (initiated by idle state, canceled by active state)
	var IDLE_THRESHOLD_MILLISECONDS = 30000; //considered idle if 10 seconds have passed since last action	
	var refreshTimer;
	var idleTimer;
	
	me.getRefreshInterval = function() {
		return REFRESH_INTERVAL_MILLISECONDS;
	};
	
	me.getIdleInterval = function() {
		return IDLE_THRESHOLD_MILLISECONDS;
	};
	
	me._cancelTimers = function() {
		if (idleTimer != null) {
			clearTimeout(idleTimer);
		}
		if (refreshTimer != null) {
			clearInterval(refreshTimer);
		}
	};

	me._actionDetected = function() {
		if (me.isEnabled() && ResKey.HelperUtility.currentlyOnAvailabilityTab()) {
			me._log("action detected");
			me._cancelTimers();
			me._awaitIdleState();		
		}
		else {
			me._cancelTimers();
		}
		return true;
	};

	me._awaitIdleState = function() {
		me._log("awaiting idle state");
		idleTimer = setTimeout(function() { me._setRefreshTimer(); }, IDLE_THRESHOLD_MILLISECONDS);
	};

	me._setRefreshTimer = function() {
		me._log("setting refresh timer");
		refreshTimer = setInterval(function(){ me._autoRefresh(); }, REFRESH_INTERVAL_MILLISECONDS);
	};

	me._autoRefresh = function () {
		me._log("autorefresh state");
		if (!$('save')) {
			ResKey.HookHelper.setOldState(0);
			viewer('/reservations/availability.asp','','24');
		
			me._log("REFRESHING");
			me._actionDetected();
		}
		else {
			me._log("NOT REFRESHING - SAVE PRESENT");
			me._actionDetected();
		}
	};

	me._attachToPageEvents = function() {
		me._log("attaching to pagechange events");
		jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName).on("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName, function(e){
			ResKey.HelperUtility.log("AUTOREFRESH detected page change.");
			me.turnOnOrOffBasedOnCurrentPage();
		});	
	};

	me._unattachToPageEvents = function() {
		me._log("unattaching to pagechange events");
		jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName);	
	};
	
	me._attachToAjaxStateChange = function() {
		me._log("attaching to ajax state change...");
		jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName).on("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName, function(e){
			if (me.isEnabled() && ResKey.HelperUtility.currentlyOnAvailabilityTab()) {
				jQuery("iframe#califrame").contents().off("click."+me._className+" keydown."+me._className+" keyup."+me._className).on("click."+me._className+" keydown."+me._className+" keyup."+me._className, me._actionDetected);
			}
		});
	};

	me._unattachToAjaxStateChange = function() {
		me._log("unattaching to ajax state change...");
		jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName);
	};
	
	me._initiateHeartbeat = function() {
		me._log("initiating heartbeat...");
		jQuery(document).off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName).on("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName, function() { me._actionDetected(); });
		
		jQuery("iframe#califrame").contents().off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName).on("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName, function() { me._actionDetected(); });
		
		jQuery("iframe#califrame").load(function(){
			jQuery("iframe#califrame").contents().off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName).on("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName, function() { me._actionDetected(); });
		});
	};

	me._cancelHeartbeat = function() {
		me._log("canceling heartbeat");
		jQuery(document).off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName);	
		jQuery("iframe#califrame").contents().off("click."+me._eventName+" keydown."+me._eventName+" keyup."+me._eventName);
	};

	me._enable = function() {
		me._attachToPageEvents();
	};
	
	me._disable = function() {
		me._unattachToPageEvents();
	};
	
	me._turnOn = function() {
		me._attachToAjaxStateChange();
		me._initiateHeartbeat();
		me._awaitIdleState();
	};
	
	me._turnOff = function() {
		me._unattachToAjaxStateChange();
		setTimeout(function(){
			me._cancelHeartbeat();
			me._cancelTimers(); 
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
/*****END AUTOREFRESH*****/


/*****BEGIN REMINDERS*****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "AutoReminders", function(o){
	var me = this;

	me._showMyReminders = function() {
		me._log("opening reminders");
		//opendiv('resinfowindow','/inc/viewreminders.asp'); //has issues w/ timing so sometimes doesn't load properly
		
		//jQuery("#resinfowindow").css("top", "auto").css("left", "auto").css("bottom", 25).css("right", 15).css("height", 125).css("overflow-y","auto").show();
		
		//THIS WINDOW USED FOR OTHER THINGS, CANT JUST MOVE IT
		//jQuery("#resinfowindow").css("height", 125).css("overflow-y","auto").css("top", (jQuery(window).height()-jQuery("#resinfowindow").height()-25)+"px").css("left", (jQuery(window).width()-jQuery("#resinfowindow").width()-25)+"px").show();
		
		jQuery("#resinfowindow").load("/inc/viewreminders.asp").show();
		
		//jQuery("#resinfowindow").load("/inc/viewreminders.asp", function(){
			//jQuery("#resinfowindow a:contains('Close')").attr("onclick", "").off("click");
			//jQuery("#resinfowindow a:contains('Move')").attr("onmousedown", "").off("mousedown");
			//jQuery("#resinfowindow").css("top", "auto").css("left", "auto").css("bottom", 25).css("right", 15).css("height", 125).css("overflow-y","auto").show();
			/*jQuery("#resinfowindow").wrap("<div id='resinfowindowdialog' style='display: none; backgroundc'></div>");
			jQuery("#resinfowindow").show();
			jQuery("#resinfowindowdialog").dialog({
				title: "Reminders",
				width: 750, 
				height: 300
			});*/
		//});
	};
	
	me._enable = function() {};
	
	me._disable = function() {};
	
	me._turnOn = function() {
		/*jQuery("div:visible[style*='sticky']").data("onclick", jQuery("div:visible[style*='sticky']").attr("onclick");
		jQuery("div:visible[style*='sticky']").attr("onclick", null).off("click."+me._eventName).on("click."+me._eventName, function() {
			me._showMyReminders();
		});
		*/
		if (jQuery("div:visible[style*='sticky'] span").text() > 0) {
			me._showMyReminders();
		}
	};
	
	me._turnOff = function() {
		//jQuery("div:visible[style*='sticky']").off("click."+me._eventName).attr("onclick", jQuery("div:visible[style*='sticky']").data("onclick"));
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
/*****END REMINDERS******/


/****BEGIN DOUBLEPAYMENTPREVENTION****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "DoublePaymentPrevention", function(o){
	var me = this;
	
	var attachToPageEvents = function() {
		me._log("attaching to pagechange events");
		jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName).on("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName, function(e){
			me._log("detected page change");
			me.turnOnOrOffBasedOnCurrentPage();
		});
	};
	
	var unattachToPageEvents = function() {
		me._log("unattaching to pagechange events");
		jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName);
	};
	
	var attachToAjaxStateChange = function() {
		me._log("attaching to ajax state change...");
		jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName).on("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName, function(e){
			me._log("detected ajax state change");
			ResKey.HelperUtility.preventFutureInlineOnClickForAnchor(jQuery("#pricedetails_div a:contains('Remove')"));
				
			// jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Remove')").on("click."+me._eventName, "#pricedetails_div a:contains('Remove')", function(e) {
				// if (e.which == 1) {
					// jQuery(this).disable();
					// if (confirm("Remove payment?")){
						// ResKey.HelperUtility.executeInlineOnClickForAnchor(this, e);
					// }
					// else {
						// jQuery(this).enable();
					// }
					// //THIS DOESNT STOP THE ONCLICK FROM HAPPENING
					// e.stopPropagation();
					// e.preventDefault();
					// return false;
				// }
			// });
		});
	};

	var unattachToAjaxStateChange = function() {
		me._log("unattaching to ajax state change...");
		jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName);
	};
	
	me._enable = function() {
		attachToPageEvents();
	};
	
	me._disable = function() {
		unattachToPageEvents();
	};
	
	me._turnOn = function() {		
		attachToAjaxStateChange();
		//if (ResKey.HelperUtility.currentlyOnReservationsTab()) {
			// jQuery(document).on("click.gm", "#pricedetails_div #button_addpayment", function(){ //for whatever reason, this isn't being properly added dynamically...probably because of dynamic overwriting of the handler
				// jQuery(this).disable();
				// ResKey.HelperUtility.log("payment clicked");
				// return false;
			// });
			
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
					//THIS DOESNT STOP THE ONCLICK FROM HAPPENING
					e.stopPropagation();
					e.preventDefault();
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
					//THIS DOESNT STOP THE ONCLICK FROM HAPPENING
					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			});
			
			//solution: remove onclick on these anchors (when...?), save them to data("onclick"), then call:
			//eval("("+$(this).data("onclick")+")();");
			//http://stackoverflow.com/questions/1756425/prevent-onclick-action-with-jquery
			jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Remove')").on("click."+me._eventName, "#pricedetails_div a:contains('Remove')", function(e) {
				if (e.which == 1) {
					jQuery(this).disable();
					if (confirm("Remove payment?")){
						ResKey.HelperUtility.executeInlineOnClickForAnchor(this, e);
					}
					else {
						jQuery(this).enable();
					}
					//THIS DOESNT STOP THE ONCLICK FROM HAPPENING
					e.stopPropagation();
					e.preventDefault();
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
					//THIS DOESNT STOP THE ONCLICK FROM HAPPENING
					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			});			
		//}
	};
	
	me._turnOff = function() {
		jQuery(document).off("mouseup."+me._eventName, "#button_addpayment");
		jQuery(document).off("mouseup."+me._eventName, "#button_chargecard");
		jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Remove')");
		jQuery(document).off("click."+me._eventName, "#pricedetails_div a:contains('Refund')");
		unattachToAjaxStateChange();
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
/****END DOUBLEPAYMENTPREVENTION****/

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
	
	var attachToPageEvents = function() {
		me._log("attaching to pagechange events");
		jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName).on("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName, function(e){
			me._log("detected page change");
			me.turnOnOrOffBasedOnCurrentPage();
		});
	};
	
	me._enable = function() {
		attachToPageEvents();
	};
	
	me._disable = function() {
		unattachToPageEvents();
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


/****BEGIN AJAXHISTORY****/
Utils.NamespaceUtility.RegisterClass("ResKey.Modules", "AjaxHistory", function(o){
	var me = this;
	var pageHistory;
	var pageFuture;
	var savingPage;

	var loadPage = function(pageName) {
		me._log("loading page: "+pageName);
		switch(pageName) {
			case "#Availability": if ($('save')) {$('save').click(); }viewer('/reservations/availability.asp','','24'); break;
			case "#Reservations": if ($('save')) {$('save').click(); }viewer('/reservations/reservations.asp','','25'); break;
			case "#Guests": if ($('save')) {$('save').click(); }viewer('/reservations/guests.asp','','28'); break;
			case "#Activity": if ($('save')) {$('save').click(); }viewer('/reservations/activity.asp','','41'); break;
			case "#Reports": break;
		}
	};

	var savePage = function(pageToSave) {
		me._log("saving page: "+pageToSave);
		window.location.lasthash.push(window.location.hash);
		window.location.hash = pageToSave;
		//for some reason, this is causing the viewer to not load properly...moving it to the ajax readystate change fixes it 
		//setTimeout(function(){ me._log("setting page hash: " +window.location.href+" "+pageToSave); window.location.hash = pageToSave; }, 1000); //timout to stop viewer from not loading properly - maybe due to an interval timer on check for page state rather than reacting to an actual state change
		//pageHistory.push(pageToSave);
	};

	var backPage = function() {
		if (window.location.lasthash.length > 0) { //pageHistory.length > 0
			//var prevPage = pageHistory.pop();
			var prevPage = window.location.hash;
			window.location.hash = window.location.lasthash[window.location.lasthash.length-1];
			window.location.lasthash.pop();
			me._log("going back to page: "+prevPage);
			loadPage(prevPage);
			//pageFuture.push(currentPage);
		}
	};

	var forwardPage = function() {
		// var nextPage = pageFuture.pop();
		// pageHistory.push(currentPage);
		// loadPage(nextPage);
	};

	var swallowBackspace = function() { //prevent "back" initiation with backspace - courtesy of http://stackoverflow.com/questions/25806608/how-to-detect-browser-back-button-event-cross-browser
		var rx = /INPUT|SELECT|TEXTAREA/i;

		jQuery(document).off("keydown."+me._className+" keypress."+me._className).on("keydown."+me._className+" keypress."+me._className, function(e){
			if( e.which == 8 ){ // 8 == backspace
				if(!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly) {
					me._log("swalllowing backspace");
					e.preventDefault();
				}
			}
		});
	};

	var unswallowBackspace = function() {
		jQuery(document).off("keydown."+me._className+" keypress."+me._className);
	};
	
	var attachToAjaxStateChange = function() {	
		me._log("attaching to ajax state change...");
		jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName).on("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName, function(e){
			savePage(previousPage);
			savingPage = false;
		});
	};
	
	var unattachToAjaxStateChange = function() {
		jQuery(document).off("ajaxStateChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._eventName);
	};
	
	var attachToPageEvents = function() {
		jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._className).on("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._className, function(e){
			savePage(previousPage);
			savingPage = true;
		});
	};	

	var unattachToPageEvents = function() {
		jQuery(document).off("pageChanged_"+ResKey.Settings.JQUERY_EVENT_CLASS_GENERAL+"."+me._className);
	};
	
	me._enable = function() {
		attachToPageEvents();
		attachToAjaxStateChange();
	};
	
	me._disable = function() {
		unattachToAjaxStateChange();
		unattachToPageEvents();
	};
	
	me._turnOn = function() {
		window.location.lasthash = new Array();
		pageHistory = new Array();
		pageFuture = new Array();
		savingPage = false;
		
		//jQuery(window).off("hashchange."+me._className).on("hashchange."+me._className, function() {
		window.onhashchange = function() {
			me._log("window.hashchange...");
			if (window.innerDocClick) { //Your own in-page mechanism triggered the hash change
				me._log("in-page mechanism clicked.");
				window.innerDocClick = false;
			} else { //Browser back button was clicked
				me._log("back button clicked.");
				if (window.location.hash != '') {
					backPage(); //once loadPage is done, it calls backPage again and again until...?
				} else { //default back behavior
					history.pushState("", document.title, window.location.pathname);
					location.reload();
				}
			}
			return true;
		}
		//});				
		
		jQuery(document).off("mouseover."+me._className).on("mouseover."+me._className, function() {
			//User's mouse is inside the page.
			window.innerDocClick = true;
			return true;
		});

		jQuery(document).off("mouseleave."+me._className).on("mouseleave."+me._className, function() {
			//User's mouse has left the page.
			window.innerDocClick = false;
			return true;
		});
		
		swallowBackspace();
		//savePage(currentPage);
	};
	
	me._turnOff = function() {
		window.onhashchange = null;
		window.location.lasthash = null;
		window.location.hash = '';
		jQuery(document).off("mouseleave."+me._className);
		jQuery(document).off("mouseover."+me._className);
		unattachToAjaxStateChange();
		unswallowBackspace();
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
/****END AJAXHISTORY****/


/****BEGIN ENHANCEMENTS CONTROLLER****/
Utils.NamespaceUtility.RegisterClass("ResKey", "EnhancementsController", new function(o){
	var me = this;
	var moduleList;
	
	var createCheckboxForModule = function(module) {
		var checkbox = jQuery("<input type='checkbox' id='chk+"+module._moduleName+"' style='margin-left: 10px;' title='"+module._moduleDescription+"' /><label>"+module._moduleNameReadable+"</a>");
		
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
/****END ENHANCEMENTS CONTROLLER****/


/****BEGIN SETUP****/
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
		//NO way to hook into this, as any event handler here just seems to get overwritten...maybe use jQuery and namespace it?
		// var openFn = xmlHttp.open;
		// xmlHttp.open = function(e) {
			// ResKey.HelperUtility.log("opening ajax request");
			// openFn();
		// };
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

		// DOESN'T capture changing pages via links (like clicking a reservation) - or opening "quick view", etc
		// jQuery("#sidebuttons a").parents("td[id*=t]:not([id=t27])").find("a").on("click.gm", function(){ //EXCLUDING report anchor
			// previousPage = currentPage;
			// currentPage = ResKey.HelperUtility.translateTdIDToPageName(jQuery(this).parents("td[id*=t]").attr("id"));
			
			// if (currentPage != previousPage) {
				// pageChanged();
			// }
		// });
		
		// var viewerOld = viewer;
		
		// viewer = function(myurl,str,sidetabnum) {
			// ResKey.HelperUtility.log("viewering...");
			// viewerOld(myurl,str,sidetabnum);
		// };
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

//jQuery("head").append('<link href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/themes/smoothness/jquery-ui.css" rel="stylesheet" type="text/css">');

jQuery(function(){
	ResKey.UsabilityEnhancements.run();
	
});
/****END SETUP****/
