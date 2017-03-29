drop table users;

create table users (
  id SERIAL,
  name varchar(150) not null,
  is_admin boolean default false,
  created_at timestamp not null default current_timestamp
);
