function hasRoleAccess(user, allowedRoles) {
  if (!user) return false;
  if (user.is_admin) return true;
  return allowedRoles.includes(user.role);
}

function runRbacTests() {
  const admin = { id: 1, role: "job_seeker", is_admin: true };
  const employer = { id: 2, role: "employer", is_admin: false };
  const seeker = { id: 3, role: "job_seeker", is_admin: false };

  console.assert(hasRoleAccess(admin, ["employer"]) === true, "Admin should always have access");
  console.assert(hasRoleAccess(employer, ["employer"]) === true, "Employer should have employer access");
  console.assert(hasRoleAccess(seeker, ["employer"]) === false, "Job seeker should not have employer access");

  console.log("PASS: RBAC tests");
}

module.exports = {
  hasRoleAccess,
  runRbacTests
};
