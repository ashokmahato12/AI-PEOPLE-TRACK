CREATE DATABASE IF NOT EXISTS ai_people_track
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ai_people_track;

CREATE TABLE IF NOT EXISTS tracking_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  camera_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_sessions_started_at (started_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS people_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  tracking_id VARCHAR(40) NOT NULL,
  event_type ENUM('ENTRY', 'EXIT') NOT NULL,
  event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_time_type (event_time, event_type),
  KEY idx_events_session (session_id),
  KEY idx_events_tracking (tracking_id),
  CONSTRAINT fk_events_session
    FOREIGN KEY (session_id) REFERENCES tracking_sessions (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;