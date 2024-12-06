import { Knex } from 'knex';
import {
  TableNames,
  GameTableColumns,
  GroupTableColumns,
  YearTableColumns,
} from '../src/tables';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.table(TableNames.Group_Table, (table) => {
    table
      .string(GroupTableColumns.year_id)
      .notNullable()
      .defaultTo('2024-2025');
    table
      .foreign(GroupTableColumns.year_id)
      .references(`${TableNames.Year_Table}.${YearTableColumns.year_id}`);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table(TableNames.Group_Table, (table) => {
    table.dropColumn(GroupTableColumns.year_id);
  });
}
//     .createTable(TableNames.Group_User_Table, (table) => {
