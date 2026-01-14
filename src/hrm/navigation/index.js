import { COMPANY_NAV } from "./companyNav.jsx";
import { EMPLOYEES_NAV } from "./employeesNav.jsx";
import { SETTINGS_NAV } from "./settingsNav.jsx";

export const NAVIGATION = [
    COMPANY_NAV,
    EMPLOYEES_NAV,
    SETTINGS_NAV,
    // Note: Permissions is intentionally not included here because
    // a pinned footer link is used instead. This keeps the main
    // navigation list clean and shows the link only at the bottom.
];

