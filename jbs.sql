DROP TABLE IF EXISTS users_companies;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;



CREATE TABLE IF NOT EXISTS companies (
  name TEXT UNIQUE,
  display_name TEXT,
  legal_name TEXT,
  domain TEXT UNIQUE,
  description TEXT,
  location TEXT,
  founded_date TEXT,
  url TEXT,
  logo TEXT,
  twitter TEXT,
  linkedin TEXT,
  facebook TEXT,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  id BIGSERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL DEFAULT currval('users_id_seq') UNIQUE,
  password TEXT,
  temp BOOLEAN NOT NULL DEFAULT FALSE,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users_companies (
  user_id INT REFERENCES users,
  company_id INT REFERENCES companies,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS news (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  snippet TEXT,
  url TEXT UNIQUE,
  image_url TEXT,
  date_written DATE,
  author TEXT,
  company_id INT REFERENCES companies
);

CREATE TABLE IF NOT EXISTS jobs (
  title TEXT,
  company_name TEXT,
  url TEXT UNIQUE,
  description TEXT,
  visa_sponsored BOOLEAN,
  remote_ok BOOLEAN,
  relocation BOOLEAN,
  created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  city TEXT,
  id BIGSERIAL PRIMARY KEY,
  company_id INT REFERENCES companies
);
