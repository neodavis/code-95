-- Full schema matching TypeORM entity definitions (synchronize: false).
-- UUID PKs for application tables; SERIAL for reference/legacy tables.
-- This file runs automatically on first postgres container creation
-- (when the pgdata volume is empty).

-- ─── Reference / lookup tables (integer PKs, match Django legacy schema) ──────

CREATE TABLE IF NOT EXISTS system_ecarrytype (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(200) NOT NULL,
    name_spk  VARCHAR(200) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS system_ecountry (
    id          SERIAL PRIMARY KEY,
    name_ukr    VARCHAR(50) NOT NULL DEFAULT '',
    name_eng    VARCHAR(50) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS system_econstant (
    id                  SERIAL PRIMARY KEY,
    date_of_miniinfra   DATE,
    miniinfra_no        VARCHAR(20) NOT NULL DEFAULT '',
    date_of_minjust     DATE,
    minjust_no          VARCHAR(20) NOT NULL DEFAULT ''
);

-- ─── Study group types (UUID PK — matches StudyGroupType entity) ──────────────

CREATE TABLE IF NOT EXISTS study_group_type (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL
);

-- ─── Training centres (UUID PK — matches TrainingCenter entity) ───────────────

CREATE TABLE IF NOT EXISTS training_center (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    father_tc            VARCHAR(4)   NOT NULL DEFAULT '',
    ati_code             VARCHAR(4)   NOT NULL DEFAULT '',
    division             VARCHAR(20)  NOT NULL DEFAULT '',
    name                 VARCHAR(200) NOT NULL,
    name_short           VARCHAR(60)  NOT NULL DEFAULT '',
    edrpou               VARCHAR(10)  NOT NULL,
    cert_no              VARCHAR(9)   NOT NULL DEFAULT '',
    city                 VARCHAR(50)  NOT NULL DEFAULT '',
    addr_street          VARCHAR(50)  NOT NULL DEFAULT '',
    addr_house           VARCHAR(7)   NOT NULL DEFAULT '',
    cert_date            DATE,
    email                VARCHAR(100),
    phone                VARCHAR(20),
    region               VARCHAR(50),
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    website              VARCHAR(200),
    post_code            VARCHAR(5),
    chief_pip            VARCHAR(50)  NOT NULL DEFAULT '',
    old_id               INTEGER
);

-- ─── Users (UUID PK — matches User entity; JWT sub is UUID) ───────────────────

CREATE TABLE IF NOT EXISTS users_user (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_code             VARCHAR(256) NOT NULL UNIQUE,
    password                VARCHAR(128) NOT NULL,
    username                VARCHAR(30)  NOT NULL DEFAULT '',
    email                   VARCHAR(254) NOT NULL DEFAULT '',
    first_name              VARCHAR(30)  NOT NULL DEFAULT '',
    last_name               VARCHAR(30)  NOT NULL DEFAULT '',
    middle_name             VARCHAR(64)  NOT NULL DEFAULT '',
    phone                   VARCHAR(64)  NOT NULL DEFAULT '',
    passport                VARCHAR(64)  NOT NULL DEFAULT '',
    identification_code     VARCHAR(100) NOT NULL DEFAULT '0',
    is_staff                BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    is_superuser            BOOLEAN      NOT NULL DEFAULT FALSE,
    region                  VARCHAR(256),
    verification_type       VARCHAR(64),
    date_joined             TIMESTAMPTZ  NOT NULL,
    last_login              TIMESTAMPTZ
);

-- ─── Training centre employees (UUID PK — matches TrainingCenterEmployee) ──────

CREATE TABLE IF NOT EXISTS training_center_employee (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    training_center_id  UUID    NOT NULL,
    user_id             UUID    NOT NULL UNIQUE
);

-- ─── Articles (UUID PKs — match Article*, ArticleCategory, ArticleTag entities) ─

CREATE TABLE IF NOT EXISTS article_articlecategory (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT         NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS article_articletag (
    id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS article_article (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL UNIQUE,
    title_img    VARCHAR(100) NOT NULL DEFAULT '',
    author       VARCHAR(255) NOT NULL,
    description  TEXT         NOT NULL,
    shortly      VARCHAR(255) NOT NULL,
    is_published BOOLEAN      NOT NULL,
    pub_date     TIMESTAMPTZ  NOT NULL
);

-- ManyToMany join tables for articles
CREATE TABLE IF NOT EXISTS article_article_cat (
    article_id          UUID NOT NULL,
    articlecategory_id  UUID NOT NULL,
    PRIMARY KEY (article_id, articlecategory_id)
);

CREATE TABLE IF NOT EXISTS article_article_tag (
    article_id     UUID NOT NULL,
    articletag_id  UUID NOT NULL,
    PRIMARY KEY (article_id, articletag_id)
);

-- ─── FAQ (UUID PK — matches Faq entity) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS faq_faq (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    question     VARCHAR(255) NOT NULL,
    answer       TEXT         NOT NULL,
    is_published BOOLEAN      NOT NULL
);

-- ─── Cabinet: study groups (UUID PK — matches StudyGroup entity) ──────────────

CREATE TABLE IF NOT EXISTS study_group (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    date_start          DATE,
    date_finish         DATE,
    status              INTEGER      NOT NULL DEFAULT 1,
    training_center_id  UUID         NOT NULL,
    carry_type_id       INTEGER,
    group_type_id       UUID,
    is_reduced_program  BOOLEAN      NOT NULL DEFAULT false
);

-- ─── Cabinet: study group students (join table) ───────────────────────────────

CREATE TABLE IF NOT EXISTS study_group_students (
    studygroup_id  UUID    NOT NULL,
    edriver_id     INTEGER NOT NULL,
    PRIMARY KEY (studygroup_id, edriver_id)
);

-- ─── Cabinet: drivers (integer PK — legacy Django table) ─────────────────────

CREATE TABLE IF NOT EXISTS system_edriver (
    id                          SERIAL PRIMARY KEY,
    surname                     VARCHAR(100) NOT NULL,
    first_name                  VARCHAR(100) NOT NULL,
    middle_name                 VARCHAR(100) NOT NULL DEFAULT '',
    tax_number                  VARCHAR(20)  NOT NULL UNIQUE,
    date_of_birth               DATE,
    phone                       VARCHAR(20),
    email                       VARCHAR(100),
    status_id                   INTEGER,
    id_espk                     INTEGER,
    id_card                     INTEGER,
    tc_id                       INTEGER,
    country_of_birth_id         INTEGER,
    addr_town                   VARCHAR(50),
    addr_street                 VARCHAR(50),
    addr_house                  VARCHAR(8),
    addr_flat                   VARCHAR(5),
    post_code                   VARCHAR(5),
    driver_license_no           VARCHAR(50),
    driver_license_categories   VARCHAR(100),
    driver_license_issue_date   DATE,
    driver_license_expiry_date  DATE,
    driver_license_updated_at   TIMESTAMP,
    c_category_issue_date       DATE,
    d_category_issue_date       DATE,
    intends_urban_suburban_route BOOLEAN     NOT NULL DEFAULT false,
    last_user                   INTEGER,
    created_at                  TIMESTAMP,
    updated_at                  TIMESTAMP
);

-- Idempotent additions for existing databases
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS driver_license_no           VARCHAR(50);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS driver_license_categories   VARCHAR(100);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS driver_license_issue_date   DATE;
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS driver_license_expiry_date  DATE;
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS driver_license_updated_at   TIMESTAMP;
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS c_category_issue_date       DATE;
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS d_category_issue_date       DATE;
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS intends_urban_suburban_route BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS addr_town                   VARCHAR(50);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS addr_street                 VARCHAR(50);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS addr_house                  VARCHAR(8);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS addr_flat                   VARCHAR(5);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS post_code                   VARCHAR(5);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS photo_img                   VARCHAR(500);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS sign_img                    VARCHAR(500);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS surname_trans               VARCHAR(50);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS first_name_trans            VARCHAR(50);
ALTER TABLE system_edriver ADD COLUMN IF NOT EXISTS categories_list             VARCHAR(30);
ALTER TABLE system_edriver DROP COLUMN IF EXISTS notes;
ALTER TABLE system_edriver DROP COLUMN IF EXISTS ati_code;
ALTER TABLE system_edriver DROP COLUMN IF EXISTS division;
ALTER TABLE system_edriver DROP COLUMN IF EXISTS place_of_birth;
ALTER TABLE system_ecard   ADD COLUMN IF NOT EXISTS qr_img                      TEXT;
ALTER TABLE study_group    ADD COLUMN IF NOT EXISTS is_reduced_program           BOOLEAN NOT NULL DEFAULT false;

-- ─── Cabinet: SPK (integer PK — legacy Django table) ─────────────────────────

CREATE TABLE IF NOT EXISTS system_espk (
    id                    SERIAL PRIMARY KEY,
    uuid                  UUID         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    tc_id                 INTEGER      NOT NULL,
    tc_name               VARCHAR(200) NOT NULL DEFAULT '',
    tc_cert_no            VARCHAR(20)  NOT NULL DEFAULT '',
    spk_no                VARCHAR(20)  NOT NULL DEFAULT '',
    driver_id             INTEGER      NOT NULL,
    driver_pip            VARCHAR(200) NOT NULL DEFAULT '',
    date_of_birth         DATE,
    country_of_birth      VARCHAR(100),
    carry_type_id         INTEGER,
    carry_type_txt        VARCHAR(200),
    date_of_miniinfra     DATE,
    miniinfra_no          VARCHAR(20),
    date_of_minjust       DATE,
    minjust_no            VARCHAR(20),
    date_of_test          DATE,
    test_protocol_no      VARCHAR(50),
    date_of_test_protocol DATE,
    date_of_expiry        DATE,
    position              VARCHAR(100),
    chief_pip             VARCHAR(100),
    last_user             INTEGER,
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP
);

-- ─── Cabinet: eCard (integer PK — legacy Django table) ───────────────────────

CREATE TABLE IF NOT EXISTS system_ecard (
    id                  SERIAL PRIMARY KEY,
    driver_id           INTEGER      NOT NULL,
    surname             VARCHAR(100) NOT NULL DEFAULT '',
    first_name          VARCHAR(100) NOT NULL DEFAULT '',
    surname_trans       VARCHAR(100) NOT NULL DEFAULT '',
    first_name_trans    VARCHAR(100) NOT NULL DEFAULT '',
    date_of_birth       DATE,
    date_of_issue       DATE,
    date_of_expiry      DATE,
    issued_by           VARCHAR(200),
    registration_number VARCHAR(50),
    licence_no          VARCHAR(50),
    serial_no           VARCHAR(50),
    categories_list     VARCHAR(200),
    union_code95        VARCHAR(50),
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    last_user           INTEGER,
    photo_img           VARCHAR(500),
    sign_img            VARCHAR(500),
    qr_img              TEXT
);

-- ─── Cabinet: driver registry (integer PK — legacy Django table) ──────────────

CREATE TABLE IF NOT EXISTS system_edriverregistry (
    id              SERIAL PRIMARY KEY,
    driver_id       INTEGER      NOT NULL UNIQUE,
    driver_pip      VARCHAR(200) NOT NULL DEFAULT '',
    date_of_expiry  DATE,
    categories_list VARCHAR(200),
    carry_type      VARCHAR(200),
    ati_code        VARCHAR(10)  NOT NULL DEFAULT '',
    last_user       INTEGER,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

-- ─── НФ-01: Course type (Наказ 789, Розділ II, п.9: три типи курсів) ──────────
-- initial            — початкові (280 год)
-- initial_shortened  — початково-скорочені (140 год)
-- periodic           — періодичні (35 год)

DO $$
BEGIN
  -- New databases: create the new enum directly
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_type_enum') THEN
    CREATE TYPE course_type_enum AS ENUM ('initial', 'initial_shortened', 'periodic');
  ELSE
    -- Existing databases: migrate from legacy ('long','short') to ('initial','initial_shortened','periodic')
    -- Strategy: rename old enum, create new one, cast columns, drop old enum.
    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'course_type_enum' AND e.enumlabel IN ('long', 'short')
    ) THEN
      ALTER TYPE course_type_enum RENAME TO course_type_enum_old;
      CREATE TYPE course_type_enum AS ENUM ('initial', 'initial_shortened', 'periodic');

      -- Map legacy values: long → initial, short → initial (per migration spec)
      ALTER TABLE study_group
        ALTER COLUMN course_type TYPE course_type_enum
        USING (CASE course_type::text
                 WHEN 'long'  THEN 'initial'
                 WHEN 'short' THEN 'initial'
                 ELSE NULL
               END)::course_type_enum;
      ALTER TABLE system_espk
        ALTER COLUMN course_type TYPE course_type_enum
        USING (CASE course_type::text
                 WHEN 'long'  THEN 'initial'
                 WHEN 'short' THEN 'initial'
                 ELSE NULL
               END)::course_type_enum;

      DROP TYPE course_type_enum_old;
    END IF;
  END IF;
END
$$;

ALTER TABLE study_group  ADD COLUMN IF NOT EXISTS course_type course_type_enum;
ALTER TABLE system_espk  ADD COLUMN IF NOT EXISTS course_type course_type_enum;

-- ─── training_center.is_active: enable/disable training centers ──────────────
ALTER TABLE training_center ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── system_espk.uuid: public identifier for QR code URLs ─────────────────────
-- New SPKs receive a UUID via gen_random_uuid(); existing rows backfilled here.
-- Registry endpoint accepts both UUID (new) and integer driver_id (old QR codes).
ALTER TABLE system_espk  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();
UPDATE system_espk       SET uuid = gen_random_uuid() WHERE uuid IS NULL;
ALTER TABLE system_espk  ALTER COLUMN uuid SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'system_espk_uuid_key'
  ) THEN
    ALTER TABLE system_espk ADD CONSTRAINT system_espk_uuid_key UNIQUE (uuid);
  END IF;
END
$$;

-- ─── users_user: legacy Django field parity ───────────────────────────────────

ALTER TABLE users_user ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users_user ADD COLUMN IF NOT EXISTS passport VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE users_user ADD COLUMN IF NOT EXISTS identification_code VARCHAR(100) NOT NULL DEFAULT '0';
ALTER TABLE users_user ADD COLUMN IF NOT EXISTS region VARCHAR(256);
ALTER TABLE users_user DROP COLUMN IF EXISTS is_email_validated;
ALTER TABLE users_user DROP COLUMN IF EXISTS signed_on_notifications;
ALTER TABLE users_user DROP COLUMN IF EXISTS show_modal;
ALTER TABLE users_user DROP COLUMN IF EXISTS type;
ALTER TABLE users_user DROP COLUMN IF EXISTS auth_type;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type_enum') THEN
    DROP TYPE user_type_enum;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_type_enum') THEN
    DROP TYPE auth_type_enum;
  END IF;
END
$$;

-- ─── Study group log (Excel import audit + future activity entries) ──────────

CREATE TABLE IF NOT EXISTS study_group_log (
    id              SERIAL PRIMARY KEY,
    study_group_id  UUID,
    type            INTEGER     NOT NULL DEFAULT 1,
    description     VARCHAR(512),
    value           TEXT,
    action          VARCHAR(64),
    actor_user_id   UUID,
    count           INTEGER,
    created_at      TIMESTAMP
);

-- ─── Audit log ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_enum') THEN
    CREATE TYPE audit_action_enum AS ENUM (
      'login', 'password_change', 'user_create', 'user_update',
      'group_create', 'group_update', 'group_status_change', 'group_split',
      'student_add', 'student_remove',
      'driver_create', 'driver_update',
      'spk_create', 'ecard_create'
    );
  END IF;
END
$$;

ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'group_update';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'login_failed';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'user_deactivate';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'tc_create';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'tc_update';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'tc_delete';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'employee_create';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'employee_update';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'employee_delete';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'article_create';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'article_update';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'article_delete';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'faq_create';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'faq_update';
ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS 'faq_delete';

CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id     UUID,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    action      audit_action_enum NOT NULL,
    entity      VARCHAR(100),
    entity_id   VARCHAR(100),
    changes     JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

-- ─── Bootstrap reference data ─────────────────────────────────────────────────

INSERT INTO system_ecarrytype (id, name, name_spk) VALUES
    (1, 'Вантажно-автомобільні',    'вантажних автомобільних'),
    (2, 'Вантажні та пасажирські',  'вантажних та пасажирських'),
    (3, 'Пасажирсько-автомобільні', 'пасажирських автомобільних')
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_ecountry (id, name_ukr, name_eng) VALUES
    (1, 'Україна',  'Ukraine'),
    (2, 'Польща',   'Poland'),
    (3, 'Німеччина','Germany')
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_econstant (id, date_of_miniinfra, miniinfra_no, date_of_minjust, minjust_no) VALUES
    (1, '2020-01-15', '1-МНФ', '2020-02-20', '100/5')
ON CONFLICT (id) DO NOTHING;

-- ─── Bootstrap admin user (password: Admin123) ────────────────────────────────
-- Hash: pbkdf2_sha256$600000$code95seed0000000000AB$sR1dDtEXuwUPLqHA5ADtM9uXfuRYhGwphEd0XJaMgp4=

INSERT INTO users_user
    (unique_code, username, password, email, first_name, last_name,
     is_staff, is_superuser, is_active, date_joined)
VALUES
    ('admin', 'admin',
     'pbkdf2_sha256$600000$code95seed0000000000AB$sR1dDtEXuwUPLqHA5ADtM9uXfuRYhGwphEd0XJaMgp4=',
     'admin@example.com', 'Адмін', 'Системний',
     true, true, true, now())
ON CONFLICT (unique_code) DO NOTHING;

-- ─── Idempotent cleanup: drop columns dropped from entities (titleId/countryCode/etc.) ──
ALTER TABLE system_edriver DROP COLUMN IF EXISTS title_id;
ALTER TABLE system_edriver DROP COLUMN IF EXISTS country_code;
ALTER TABLE system_ecard   DROP COLUMN IF EXISTS title_ukr;
ALTER TABLE system_ecard   DROP COLUMN IF EXISTS title_eng;
DROP TABLE IF EXISTS system_etitle;
ALTER TABLE system_ecountry  DROP COLUMN IF EXISTS code_alpha2;
ALTER TABLE training_center  DROP COLUMN IF EXISTS country_code;
ALTER TABLE system_ecard     DROP COLUMN IF EXISTS country_code;
ALTER TABLE system_ecard     DROP COLUMN IF EXISTS place_of_birth_a2;
