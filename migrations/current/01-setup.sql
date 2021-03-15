drop schema public cascade;
create schema public;

create extension if not exists "uuid-ossp";

create table profiles (
  id uuid primary key default uuid_generate_v1mc(),
  name text not null
);

create table outbound_messages (
  id uuid primary key default uuid_generate_v1mc(),
  profile_id uuid references profiles (id),
  to_number text not null,
  body text not null
);

create table delivery_reports (
  id uuid primary key default uuid_generate_v1mc(),
  message_id uuid not null references outbound_messages (id),
  event_type text not null,
  error_code integer
);
