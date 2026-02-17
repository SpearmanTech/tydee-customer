import { initializeApp } from "firebase-admin/app";
initializeApp();

// 1. Marketplace Functions
export { submitBid, getAvailableJobs } from "./marketplace";

// 2. Job Management (Double-check these file names match your src/jobs folder)
export { createJob as activeJobs } from "./jobs/activejobs"; 
export { createJob } from "./jobs/createJob";
export { acceptBid } from "./jobs/acceptbids"; 
export { expireJobs } from "./jobs/expirejobs";
export { verifyAndSaveCard, chargeSavedCard } from "./payments/paystack";

// 3. Services (Crucial for the app's UI)
export { getServices } from "./services/getServices";
//export { presence } from "./services/presence";

// 4. Professional Functions
export { getProfessionalDashboard } from "./professionals/getProfessionalDashboard";