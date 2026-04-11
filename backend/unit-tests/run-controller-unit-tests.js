const path = require("path");

// Prevent real DB connections when controllers are required during unit tests.
const mysqlModulePath = path.resolve(__dirname, "../config/mysql.js");
const fakeDb = {
  query: (...args) => {
    const cb = args[args.length - 1];
    if (typeof cb === "function") cb(null, []);
  },
  execute: (...args) => {
    const cb = args[args.length - 1];
    if (typeof cb === "function") cb(null, []);
  }
};

require.cache[mysqlModulePath] = {
  id: mysqlModulePath,
  filename: mysqlModulePath,
  loaded: true,
  exports: fakeDb
};

const { runApplicationsControllerUnitTests } = require("./applicationsController.unit.test");
const { runChatControllerUnitTests } = require("./chatController.unit.test");
const { runCompaniesControllerUnitTests } = require("./companiesController.unit.test");
const { runEmployerControllerUnitTests } = require("./employerController.unit.test");
const { runJobAlertsControllerUnitTests } = require("./jobAlertsController.unit.test");
const { runJobsControllerUnitTests } = require("./jobsController.unit.test");
const { runMessagesControllerUnitTests } = require("./messagesController.unit.test");
const { runNotificationsControllerUnitTests } = require("./notificationsController.unit.test");
const { runRecommendationsControllerUnitTests } = require("./recommendationsController.unit.test");
const { runReferralsControllerUnitTests } = require("./referralsController.unit.test");
const { runResumesControllerUnitTests } = require("./resumesController.unit.test");
const { runReviewsControllerUnitTests } = require("./reviewsController.unit.test");
const { runSavedJobsControllerUnitTests } = require("./savedJobsController.unit.test");
const { runShiftsControllerUnitTests } = require("./shiftsController.unit.test");
const { runUsersControllerUnitTests } = require("./usersController.unit.test");

function runAllControllerUnitTests() {
  runApplicationsControllerUnitTests();
  runChatControllerUnitTests();
  runCompaniesControllerUnitTests();
  runEmployerControllerUnitTests();
  runJobAlertsControllerUnitTests();
  runJobsControllerUnitTests();
  runMessagesControllerUnitTests();
  runNotificationsControllerUnitTests();
  runRecommendationsControllerUnitTests();
  runReferralsControllerUnitTests();
  runResumesControllerUnitTests();
  runReviewsControllerUnitTests();
  runSavedJobsControllerUnitTests();
  runShiftsControllerUnitTests();
  runUsersControllerUnitTests();
  console.log("\nAll controller unit tests completed.");
}

try {
  runAllControllerUnitTests();
} catch (error) {
  console.error("Controller unit test runner failed:", error);
  process.exit(1);
}
