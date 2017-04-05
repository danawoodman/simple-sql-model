drop table users;
drop table accounts;

create table accounts (
  id SERIAL primary key,
  created_at timestamp not null default current_timestamp
);

create table users (
  primary key(id, account_id),

  id SERIAL,
  account_id integer references accounts,
  name varchar(150) not null,
  is_admin boolean default false,
  created_at timestamp not null default current_timestamp
);
