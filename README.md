# ReservationKey_Usability_Enhancements

TODO:
- [ ] BUG AutoRefresh not detecting actions & not logging after leaving page to activity then returning to availability - but refreshes still seem to happen..?
- [ ] BUG DoublePaymentPrevention - if enable paymentprevention with reservation & links already open, doesn't actually enable it yet	
- [ ] REVIEW standardize "_" prefix and me. vs var for all; move attach/unattach to basemodule?
- [ ] REVIEW revist turn on vs enable
- [ ] REVIEW AutoRefresh - review autoRefresh logic
- [ ] REVIEW HookHelper
- [ ] REVIEW EnhancementsController
- [ ] REVIEW UsabilityEnhancements
- [ ] NEW MODULE better billing address parsing
- [ ] NEW MODULE fix "this Invalid account name / file not found (please click a tab to load the system)."?
- [ ] FEATURE ADD HookHelper - change the way we hook into ajax events if possible instead of polling
- [ ] FEATURE ADD HookHelper - the way we sense page changes - potentially sense pages by hooking into "viewer" functions
- [ ] FEATURE ADD AutoRefresh - Calculate difference in table and update rather than fully reload autorefresh (phase 1 - only refresh if there IS a difference) - I believe this may be impossible
- [ ] FEATURE ADD AutoReminders "update reminders count when checking off reminders"?	

GreaseMonkey script for ReservationKey Usability Enhancements
With John's blessing, I am here to present to you a way to get some helpful new functionality into your ReservationKey, for FREE.  This is UNOFFICIAL so John is in no way responsible for it or supporting it.  I have developed them myself to meet my own needs, but thought the community could benefit from them as well.  I will be constantly updating them and responding to any needs that arise.

Here's a list of enhancements we have so far, and more are in the works.  You can opt in or out of using any of these, so you can decide to only use the ones that make sense for you and your business:

Force HTTPS - Make sure that ReservationKey is always running in a secure mode

Auto Reminders - Causes the reminders window pop-up automatically when something is due immediately

Double Payment Prevention - Pops up a confirmation dialog when you "Add Payment," "Charge Card," "Remove," or "Refund" to prevent accidental financial changes.  Additionally, it disables these buttons after you've clicked them, so you don't accidentally click twice and double charge the card.

Automatically Select Credit Card Type - Once you start typing the credit card number, the correct credit card type (Visa, Mastercard, Discover, American Express) will automatically be selected based on the card #.

COMING SOON:

Auto Refresh - Automatically refresh the calendar availability screen
History - Enable the use of the "Back" and "Forward" browser buttons

To start using these enhancements today, all you need to do is follow these simple instructions:

1.  You MUST use the <a href="https://www.mozilla.org/en-US/firefox/new/">Mozilla Firefox web browser</a>
2.  After you install Firefox, run Firefox and install the GreaseMonkey browser plug-in (<a href="https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/">go here, and click "Add to Firefox"</a>).  Restart Firefox.
3.  Open Firefox and <a href="https://gist.github.com/anonymous/80d0f1345590759cd517#file-reservationkey_usability_enhancements-user-js">Go here</a> and click the "Raw" button, which should install the enhancements for you.
4.  Restart Firefox and open up ReservationKey.
5.  You will see a very small [ + ] in the bottom left hand corner of the screen:
	<img src=”http://oi57.tinypic.com/9hnyv9.jpg” />
6.  If you click this, you will see all the enhancements you have available to you, and if you hover over one of them, it will tell you what it does.  
	<img src=”http://oi60.tinypic.com/2lbm39g.jpg” />
7.  As soon as you click the checkbox for one, it will begin working immediately!  

If you have ANY questions or have ideas of something you'd like me to add, respond to this thread and I will do what I can to help.  
