import type { Knex } from 'knex';

import {
  TableNames,
  YearTableColumns,
  WeekTableColumns,
  GroupTableColumns,
  GroupUserTableColumns,
  PickTableColumns,
  GameTableColumns,
} from '../src/tables';

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable(TableNames.Year_Table, (table) => {
      table.string(YearTableColumns.year_id).primary();
      table.timestamp(YearTableColumns.start_date).notNullable();
      table.timestamp(YearTableColumns.end_date).notNullable();
    })

    .createTable(TableNames.Week_Table, (table) => {
      table.string(WeekTableColumns.week_id);
      table.string(WeekTableColumns.year_id).notNullable();
      table.string(WeekTableColumns.week_name).notNullable();
      table.timestamp(WeekTableColumns.start_date).notNullable();
      table.timestamp(WeekTableColumns.end_date).notNullable();
      table
        .primary([WeekTableColumns.week_id, WeekTableColumns.year_id])
        .foreign(WeekTableColumns.year_id)
        .references(`${TableNames.Year_Table}.${YearTableColumns.year_id}`);
    })

    .createTable(TableNames.Game_Table, (table) => {
      table
        .uuid(GameTableColumns.game_id)
        .primary()
        .defaultTo(knex.raw('gen_random_uuid()'));
      table.string(GameTableColumns.week_id).notNullable();
      table.string(GameTableColumns.year_id).notNullable();
      table.timestamp(GameTableColumns.kickoff).notNullable();
      table.string(GameTableColumns.home_team).notNullable();
      table.string(GameTableColumns.away_team).notNullable();
      table.boolean(GameTableColumns.finished).notNullable();
      table.float(GameTableColumns.over_under).notNullable();
      table.float(GameTableColumns.spread).notNullable();
      table.float(GameTableColumns.moneyline).notNullable();
      table
        .foreign([GameTableColumns.week_id, GameTableColumns.year_id])
        .references([WeekTableColumns.week_id, WeekTableColumns.year_id]);
    })

    .createTable(TableNames.Group_Table, (table) => {
      table
        .uuid(GroupTableColumns.group_id)
        .primary()
        .defaultTo(knex.raw('gen_random_uuid()'));
      table.string(GroupTableColumns.group_name).notNullable();
      table.jsonb(GroupTableColumns.bets).notNullable().defaultTo('[]');
    })

    .createTable(TableNames.Group_User_Table, (table) => {
      table
        .uuid(GroupUserTableColumns.group_id)
        .notNullable()
        .defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid(GroupUserTableColumns.user_id).notNullable();
      table.string(GroupUserTableColumns.user_name).notNullable();
      table.string(GroupUserTableColumns.user_email).notNullable();
      table.string(GroupUserTableColumns.position).notNullable();
      table.primary([
        GroupUserTableColumns.group_id,
        GroupUserTableColumns.user_id,
      ]);
      table
        .foreign(GroupUserTableColumns.group_id)
        .references(`${TableNames.Group_Table}.${GroupTableColumns.group_id}`);
    })

    .createTable(TableNames.Pick_Table, (table) => {
      table
        .uuid(PickTableColumns.pick_id)
        .primary()
        .defaultTo(knex.raw('gen_random_uuid()'));
      table.integer(PickTableColumns.bet_id).notNullable();
      table.uuid(PickTableColumns.game_id).notNullable();
      table.uuid(PickTableColumns.user_id).notNullable();

      table.boolean(PickTableColumns.pick).notNullable();
      //BET ID IS NOT!!!!!!!!!! A FOREIGN KEY
      table
        .foreign(PickTableColumns.game_id)
        .references(`${TableNames.Game_Table}.${GameTableColumns.game_id}`);
    })

    .createTable(TableNames.Computed_Results_Table, (table) => {
      table
        .uuid(WeekTableColumns.week_id)
        .notNullable()
        .defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid(WeekTableColumns.year_id).notNullable();
      table.uuid(GroupTableColumns.group_id).notNullable();
      table.uuid(GroupUserTableColumns.user_id).notNullable();
      table.integer('points').notNullable();
      table.primary([
        WeekTableColumns.week_id,
        GroupTableColumns.group_id,
        GroupUserTableColumns.user_id,
      ]);
      table
        .foreign([WeekTableColumns.week_id, WeekTableColumns.year_id])
        .references([WeekTableColumns.week_id, WeekTableColumns.year_id]);
      table
        .foreign(GroupTableColumns.group_id)
        .references(`${TableNames.Group_Table}.${GroupTableColumns.group_id}`);
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .dropTable(TableNames.Computed_Results_Table)
    .dropTable(TableNames.Pick_Table)
    .dropTable(TableNames.Game_Table)
    .dropTable(TableNames.Group_User_Table)
    .dropTable(TableNames.Group_Table)
    .dropTable(TableNames.Week_Table)
    .dropTable(TableNames.Year_Table);
}
