### New Modules
- [X] better billing address parsing
- [ ] fix "this Invalid account name / file not found (please click a tab to load the system)."?
### Features
- [ ] HookHelper - change the way we hook into ajax events if possible instead of polling
- [ ] HookHelper - the way we sense page changes - potentially sense pages by hooking into "viewer" functions
- [ ] AutoRefresh - Calculate difference in table and update rather than fully reload autorefresh (phase 1 - only refresh if there IS a difference) - I believe this may be impossible
- [ ] AutoReminders - update reminders count when checking off reminders?
- [ ] BillingAddressParser - click "use guest address" cause parser to run
- 
### Bugs
- [ ] BUG AutoRefresh not detecting actions & not logging after leaving page to activity then returning to availability - but refreshes still seem to happen..?
- [ ] BUG DoublePaymentPrevention - if enable paymentprevention with reservation & links already open, doesn't actually enable it yet	
- 
### Code Review
- [ ] standardize "_" prefix and me. vs var for all; move attach/unattach to basemodule?
- [ ] revist turn on vs enable
- [ ] AutoRefresh - review autoRefresh logic
- [ ] HookHelper
- [ ] EnhancementsController
- [ ] UsabilityEnhancements
