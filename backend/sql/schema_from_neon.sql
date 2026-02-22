--
-- Raw pg_dump from Neon (reference; Neon-specific \restrict, \unrestrict, ALTER DEFAULT PRIVILEGES removed)
-- For init scripts use schema_postgres.sql instead (has DROP statements).
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE TYPE public.blood_type_enum AS ENUM (
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
);

CREATE TYPE public.feedback_status_enum AS ENUM (
    'new',
    'read',
    'archived'
);

CREATE TYPE public.gender_enum AS ENUM (
    'Male',
    'Female',
    'Other'
);

CREATE TYPE public.health_status_enum AS ENUM (
    'pending',
    'approved',
    'needs_report',
    'rejected'
);

CREATE TYPE public.package_type_enum AS ENUM (
    'education',
    'free_swimming'
);

CREATE TYPE public.payment_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);

CREATE TYPE public.report_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'invalid'
);

CREATE TYPE public.reservation_status_enum AS ENUM (
    'active',
    'canceled',
    'completed',
    'missed'
);

CREATE TYPE public.role_enum AS ENUM (
    'user',
    'admin',
    'doctor',
    'staff',
    'coach'
);

CREATE TYPE public.swimming_ability_enum AS ENUM (
    'Yes',
    'No'
);

CREATE TYPE public.verification_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);

SET default_tablespace = '';
SET default_table_access_method = heap;

CREATE TABLE public."Pools" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    capacity integer NOT NULL,
    rules text,
    location character varying(255) DEFAULT NULL::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public."Pools_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public."Pools_id_seq" OWNED BY public."Pools".id;

CREATE TABLE public.feedback (
    id integer NOT NULL,
    user_id integer NOT NULL,
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    status public.feedback_status_enum DEFAULT 'new'::public.feedback_status_enum,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;

CREATE TABLE public.health_info (
    id integer NOT NULL,
    user_id integer NOT NULL,
    blood_type public.blood_type_enum NOT NULL,
    allergies character varying(255) DEFAULT NULL::character varying,
    chronic_conditions character varying(255) DEFAULT NULL::character varying,
    medications character varying(255) DEFAULT NULL::character varying,
    height numeric(5,2) DEFAULT NULL::numeric,
    weight numeric(5,2) DEFAULT NULL::numeric,
    emergency_contact_name character varying(100) NOT NULL,
    emergency_contact_phone character varying(15) NOT NULL,
    has_heart_problems boolean DEFAULT false NOT NULL,
    chest_pain_activity boolean DEFAULT false NOT NULL,
    balance_dizziness boolean DEFAULT false NOT NULL,
    other_chronic_disease boolean DEFAULT false NOT NULL,
    prescribed_medication boolean DEFAULT false NOT NULL,
    bone_joint_issues boolean DEFAULT false NOT NULL,
    doctor_supervised_activity boolean DEFAULT false NOT NULL,
    emergency_contact_relationship character varying(50) DEFAULT NULL::character varying,
    emergency_contact_relationship_other character varying(100) DEFAULT NULL::character varying,
    health_additional_info text
);

CREATE SEQUENCE public.health_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.health_info_id_seq OWNED BY public.health_info.id;

CREATE TABLE public.health_reports (
    id integer NOT NULL,
    user_id integer NOT NULL,
    report_path character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status public.report_status_enum DEFAULT 'pending'::public.report_status_enum,
    doctor_notes text,
    rejected_reason text
);

CREATE SEQUENCE public.health_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.health_reports_id_seq OWNED BY public.health_reports.id;

CREATE TABLE public.packages (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type public.package_type_enum NOT NULL,
    price numeric(10,2) NOT NULL,
    remaining_sessions integer NOT NULL,
    expiry_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.packages_id_seq OWNED BY public.packages.id;

CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    user_id integer NOT NULL,
    payment_method_id character varying(255) NOT NULL,
    card_brand character varying(50) NOT NULL,
    last4 character varying(4) NOT NULL,
    exp_month integer NOT NULL,
    exp_year integer NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;

CREATE TABLE public.payments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    package_type public.package_type_enum NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_intent_id character varying(255) NOT NULL,
    status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;

CREATE TABLE public.qr_code_verifications (
    id integer NOT NULL,
    reservation_id integer NOT NULL,
    check_in_code character varying(100) NOT NULL,
    verified_by integer NOT NULL,
    verified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.qr_code_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.qr_code_verifications_id_seq OWNED BY public.qr_code_verifications.id;

CREATE TABLE public.reservations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status public.reservation_status_enum DEFAULT 'active'::public.reservation_status_enum,
    check_in_code character varying(100),
    checked_in_at timestamp without time zone
);

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;

CREATE TABLE public.sessions (
    id integer NOT NULL,
    pool_id integer NOT NULL,
    type public.package_type_enum NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    initial_capacity integer,
    session_date date NOT NULL
);

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;

CREATE TABLE public.users (
    id integer NOT NULL,
    provider character varying(50) DEFAULT NULL::character varying,
    provider_id character varying(255) DEFAULT NULL::character varying,
    profile_picture character varying(255) DEFAULT NULL::character varying,
    name character varying(50) DEFAULT NULL::character varying,
    surname character varying(50) DEFAULT NULL::character varying,
    date_of_birth date,
    gender public.gender_enum,
    swimming_ability public.swimming_ability_enum,
    phone character varying(15) DEFAULT NULL::character varying,
    email character varying(100) NOT NULL,
    password character varying(255) DEFAULT NULL::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    terms_accepted boolean DEFAULT false,
    id_card_path character varying(255) DEFAULT NULL::character varying,
    profile_photo_path character varying(255) DEFAULT NULL::character varying,
    privacy_accepted boolean DEFAULT false,
    marketing_accepted boolean DEFAULT false,
    email_verified boolean DEFAULT false,
    verification_token character varying(255) DEFAULT NULL::character varying,
    verification_token_expires timestamp without time zone,
    role public.role_enum DEFAULT 'user'::public.role_enum,
    verification_status public.verification_status_enum DEFAULT 'pending'::public.verification_status_enum,
    health_status public.health_status_enum DEFAULT 'pending'::public.health_status_enum,
    health_status_reason text,
    verification_reason text,
    rejection_count integer DEFAULT 0,
    password_reset_token character varying(255) DEFAULT NULL::character varying,
    password_reset_expires timestamp without time zone,
    stripe_customer_id character varying(255) DEFAULT NULL::character varying,
    health_report_requested_at timestamp without time zone,
    health_report_reminder_sent_at timestamp without time zone,
    health_report_request_count integer DEFAULT 0
);

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

ALTER TABLE ONLY public."Pools" ALTER COLUMN id SET DEFAULT nextval('public."Pools_id_seq"'::regclass);
ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);
ALTER TABLE ONLY public.health_info ALTER COLUMN id SET DEFAULT nextval('public.health_info_id_seq'::regclass);
ALTER TABLE ONLY public.health_reports ALTER COLUMN id SET DEFAULT nextval('public.health_reports_id_seq'::regclass);
ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);
ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);
ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);
ALTER TABLE ONLY public.qr_code_verifications ALTER COLUMN id SET DEFAULT nextval('public.qr_code_verifications_id_seq'::regclass);
ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);
ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

ALTER TABLE ONLY public."Pools"
    ADD CONSTRAINT "Pools_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.health_info
    ADD CONSTRAINT health_info_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.health_reports
    ADD CONSTRAINT health_reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.qr_code_verifications
    ADD CONSTRAINT qr_code_verifications_check_in_code_key UNIQUE (check_in_code);

ALTER TABLE ONLY public.qr_code_verifications
    ADD CONSTRAINT qr_code_verifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_provider_provider_id_key UNIQUE (provider, provider_id);

CREATE INDEX idx_users_health_report ON public.users USING btree (health_status, health_report_requested_at);

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.health_info
    ADD CONSTRAINT health_info_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.health_reports
    ADD CONSTRAINT health_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.qr_code_verifications
    ADD CONSTRAINT qr_code_verifications_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.qr_code_verifications
    ADD CONSTRAINT qr_code_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public."Pools"(id) ON DELETE CASCADE;
