import type { Knex } from 'knex';

import { PickTableColumns, TableNames, WeekTableColumns } from '../src/tables';

/**
We Will Modify the week table so that the Primary Key is ONLY the week_id
and not a composite key of year_id and week_id

and rename "pick" to "choice" in the Pick Table
*/

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TableNames.Pick_Table, (table) => {
    table.renameColumn(PickTableColumns.pick, PickTableColumns.choice);
  });

  await knex.schema.alterTable(TableNames.Week_Table, (table) => {
    table.dropPrimary();
    table.primary([WeekTableColumns.week_id]);
  });

  //add week_id to the pick that references the week_id in the week table
  await knex.schema.alterTable(TableNames.Pick_Table, (table) => {
    table.uuid('week_id').notNullable();
    table
      .foreign('week_id')
      .references(`${TableNames.Week_Table}.${WeekTableColumns.week_id}`);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TableNames.Pick_Table, (table) => {
    table.renameColumn(PickTableColumns.choice, PickTableColumns.pick);
  });

  await knex.schema.alterTable(TableNames.Week_Table, (table) => {
    table.dropPrimary();
    table.primary([WeekTableColumns.year_id, WeekTableColumns.week_id]);
  });

  await knex.schema.alterTable(TableNames.Pick_Table, (table) => {
    table.dropColumn('week_id');
  });
}
