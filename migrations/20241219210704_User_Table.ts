import type { Knex } from 'knex';

/**
 * 
    Just Make User Table With Things like
    user_id 
    username 
    Full Name
    Email


 * @param knex 


 */

import { TableNames, UserTableColumns } from '../src/tables';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('User_Table', (table) => {
    table.uuid(UserTableColumns.user_id).primary();
    table.string(UserTableColumns.username);
    table.string(UserTableColumns.full_name);
    table.string(UserTableColumns.email);
    table
      .timestamp(UserTableColumns.last_activity)
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('User_Table');
}
