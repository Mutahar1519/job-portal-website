const db = require("../config/mysql");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const getPlatformSetting = async (key, fallbackValue = null) => {
  try {
    const rows = await query(
      "SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1",
      [key]
    );

    if (!rows.length) return fallbackValue;
    return rows[0].setting_value;
  } catch (err) {
    return fallbackValue;
  }
};

const setPlatformSetting = async (key, value) => {
  await query(
    `INSERT INTO platform_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
    [key, String(value)]
  );
};

const toBooleanSetting = (value, defaultValue = false) => {
  if (value === null || value === undefined || value === "") return !!defaultValue;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return !!defaultValue;
};

module.exports = {
  getPlatformSetting,
  setPlatformSetting,
  toBooleanSetting
};