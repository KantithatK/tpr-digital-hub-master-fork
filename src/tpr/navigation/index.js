import { PROJECTS_NAV } from './projectsNav.jsx';
import { SETTINGS_NAV } from './settingsNav.jsx';
import { PLANNING_NAV } from './planningNav.jsx';
import { TIME_NAV } from './timeNav.jsx';
import { TASK_TRACKING_NAV } from './taskTrackingNav.jsx';
import { MANAGER_OVERVIEW_NAV } from './managerOverviewNav.jsx';
import { LEAVE_OT_SUMMARY_NAV } from './leaveOtSummaryNav.jsx';
import { FINANCE_SUMMARY_NAV } from './financeSummaryNav.jsx';

// Keep the TPR module navigation minimal: Projects in the main list.
// The system settings menu lives in the sidebar footer (see DashboardLayoutMain).
export const NAVIGATION = [
	PROJECTS_NAV,
	PLANNING_NAV,
	TASK_TRACKING_NAV,
	TIME_NAV,
	MANAGER_OVERVIEW_NAV,
	LEAVE_OT_SUMMARY_NAV,
	FINANCE_SUMMARY_NAV,
	SETTINGS_NAV,
];
