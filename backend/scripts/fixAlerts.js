const db = require("../config/mysql");

db.query(
  "UPDATE job_alerts SET location = 'Remote' WHERE keyword = 'developer' AND location = 'London'",
  (err, result) => {
    if (err) return console.error("Alice alert fix failed:", err);
    console.log("Alice alert fix: " + result.affectedRows + " row(s) updated");

    db.query(
      "UPDATE job_alerts SET location = 'London' WHERE keyword = 'analyst' AND location = 'Remote'",
      (err2, result2) => {
        if (err2) return console.error("Clara alert fix failed:", err2);
        console.log("Clara alert fix: " + result2.affectedRows + " row(s) updated");
        db.end();
      }
    );
  }
);
