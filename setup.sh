#!/usr/bin/env bash

name=${DB_NAME-"simple-sql-model-test"}
host=${DB_HOST-"localhost"}
username=${DB_USERNAME-"dana"}

psql -d $name -h $host -U $username -f 'schema.sql'
