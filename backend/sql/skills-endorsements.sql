-- Skills endorsement system
-- Run this after core schema migration.

CREATE TABLE IF NOT EXISTS skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  name_normalized VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_skills_normalized (name_normalized)
);

CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  source ENUM('self', 'resume', 'admin') DEFAULT 'self',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_skill (user_id, skill_id),
  KEY idx_user_skills_user (user_id),
  KEY idx_user_skills_skill (skill_id),
  CONSTRAINT fk_user_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_endorsements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  skill_id INT NOT NULL,
  endorsed_user_id INT NOT NULL,
  endorsed_by_user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_skill_endorsement (skill_id, endorsed_user_id, endorsed_by_user_id),
  KEY idx_skill_endorsements_target (endorsed_user_id, skill_id),
  KEY idx_skill_endorsements_actor (endorsed_by_user_id),
  CONSTRAINT fk_skill_endorsements_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
  CONSTRAINT fk_skill_endorsements_target FOREIGN KEY (endorsed_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_skill_endorsements_actor FOREIGN KEY (endorsed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);
