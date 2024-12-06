import type { Knex } from 'knex';

import { TableNames } from '../src/tables';

export async function up(knex: Knex): Promise<void> {
  //add home team score and away team score to game table
  return knex.schema.alterTable(TableNames.Game_Table, (table) => {
    table.integer('home_team_score').notNullable().defaultTo(0);
    table.integer('away_team_score').notNullable().defaultTo(0);
    //add computed columns to game table as well
    table.boolean('Home_Team_Spread').notNullable().defaultTo(false);
    //table.boolean("Away_Team_Spread").notNullable().defaultTo(false);
    table.boolean('Home_Team_Moneyline').notNullable().defaultTo(false);
    table.boolean('Over_Under').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable(TableNames.Game_Table, (table) => {
    table.dropColumn('home_team_score');
    table.dropColumn('away_team_score');
    table.dropColumn('Home_Team_Spread');
    table.dropColumn('Home_Team_Moneyline');
    table.dropColumn('Over_Under');
  });
}
