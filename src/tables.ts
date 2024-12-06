const TableNames = {
  User_Table: 'Users',
  Group_Table: 'Groups',
  Group_User_Table: 'Group_Users',
  // Bet_Table: 'Bets',
  Pick_Table: 'Picks',
  Week_Table: 'Weeks',
  Year_Table: 'Years',
  Computed_Results_Table: 'Computed_Results',
  Game_Table: 'Games',
};

const YearTableColumns = {
  year_id: 'year_id', //type string -> doesn't need to be opaque like uuid [so like 2021-2022, etc.]
  start_date: 'start_date', // for navigational purposes
  end_date: 'end_date',
};

const WeekTableColumns = {
  week_id: 'week_id', //type string -> doesn't need to be opaque like uuid, can be like "week_1", "week_2", etc.

  year_id: 'year_id', //obselete -> will be removed in the future
  // The Primary Key will be a composite key of year_id and week_id
  // The year_id will be a foreign key to the Year Table
  week_name: 'week_name',
  start_date: 'start_date',
  end_date: 'end_date',
};

/*
  return knex.schema.alterTable(TableNames.Game_Table, (table) => {
    table.integer('home_team_score').notNullable().defaultTo(0);
    table.integer('away_team_score').notNullable().defaultTo(0);
    //add computed columns to game table as well
    table.boolean('Home_Team_Spread').notNullable().defaultTo(false);
    //table.boolean("Away_Team_Spread").notNullable().defaultTo(false);
    table.boolean('Home_Team_Moneyline').notNullable().defaultTo(false);
    table.boolean('Over_Under').notNullable().defaultTo(false);
  });
  */

const GameTableColumns = {
  game_id: 'game_id', //for simplification purposes, and no need for navigation, this will be an opaque uuid
  week_id: 'week_id',
  year_id: 'year_id', // the combo [week_id, year_id] will be foreign keys to the Week Table
  kickoff: 'kickoff', //date time
  home_team: 'home_team', //string
  away_team: 'away_team', //string
  finished: 'finished', //boolean -> true for final, false for not final
  over_under: 'over_under', //number , can be a decimal
  spread: 'spread', //number , + for road team favored, - for home team favored
  moneyline: 'moneyline', //number, + for road team favored, - for home team favored
  //needs to be the same as the database column names
  home_team_score: 'home_team_score',
  away_team_score: 'away_team_score',
  home_team_spread: 'Home_Team_Spread',
  home_team_moneyline: 'Home_Team_Moneyline',
  over_under_result: 'Over_Under',
};

const GroupTableColumns = {
  group_id: 'group_id', // can be opaque uuid
  group_name: 'group_name', //string
  bets: 'bets', //json type
  year_id: 'year_id', //foreign key to the Year Table
};

const GroupUserTableColumns = {
  group_id: 'group_id', //foreign key to the Group Table, group_user corresponds to a group while a group corresponds to a year
  user_id: 'user_id', //no user table -> this will be filled out by the payload of the JWT when joining a group
  user_name: 'user_name', // filled out by the payload of the JWT when joining a group
  user_email: 'user_email', // filled out by the payload of the JWT when joining a group
  position: 'position', //string -> 'admin' | 'member'
};

/*const BetTableColumns = {
  bet_id: 'bet_id',
  group_id: 'group_id',
  bet_type: 'bet_type',
  num_points: 'num_points',
};*/

const PickTableColumns = {
  pick_id: 'pick_id', // each pick will be given random uuid
  bet_id: 'bet_id', // corresponds to the index [number] of the bet in the group
  user_id: 'user_id', // corresponds to the user_id in the group_user table
  game_id: 'game_id', // corresponds to the game_id in the game table
  pick: 'pick', // boolean -> true for home team, false for away team
  // choice: 'choice', // boolean -> true for home team, false for away team
  choice: 'choice', //will be binary -> 0 for road team, 1 for home team
  week_id: 'week_id', //string, refers to the week_id in the week table
};

const ComputedResultsTableColumns = {
  computeresult_id: 'computeresult_id',
  week_id: 'week_id', //string
  year_id: 'year_id', //string
  group_id: 'group_id', //string
  user_id: 'user_id', //string
  points: 'points', //number
};

export {
  TableNames,
  YearTableColumns,
  WeekTableColumns,
  GameTableColumns,
  GroupTableColumns,
  GroupUserTableColumns,
  // BetTableColumns,
  PickTableColumns,
};
