create table users (
  id SERIAL,
  name varchar(150) not null,
  created_at timestamp not null default current_timestamp
);
