/**
Setting the Games For the Week
*/

import { Request, Response } from 'express';

import db from '../db';

import { TableNames, GameTableColumns } from '../tables';

const getGames = async (req: Request, res: Response) => {
  const { year_id, week_id } = req.params;
  const games = await db(TableNames.Game_Table)
    .where(GameTableColumns.year_id, year_id)
    .andWhere(GameTableColumns.week_id, week_id);
  res.json(games);
};

const addGames = async (req: Request, res: Response) => {
  const games = req.body;
  await db(TableNames.Game_Table).insert(games);
  res.sendStatus(201);
};

const deleteGame = async (req: Request, res: Response) => {
  const { game_id } = req.params;
  await db(TableNames.Game_Table)
    .where(GameTableColumns.game_id, game_id)
    .del();
  res.sendStatus(200);
};

const getCurrentWeekGames = async (req: Request, res: Response) => {
  //filter week by start and end date
  const current_date = new Date();

  //get week_id
  const week = await db(TableNames.Week_Table)
    .where('start_date', '<=', current_date)
    .andWhere('end_date', '>=', current_date)
    .first();

  console.log('week', week);

  //get games
  const games = await db(TableNames.Game_Table).where('week_id', week.week_id);

  console.log('games', games);

  res.json(games);
};

type FinalScore = {
  home_score: number;
  away_score: number;
};

const submitFinalScore = async (req: Request, res: Response) => {
  const { game_id } = req.params;
  const { home_score, away_score } = req.body;

  if (!home_score || !away_score) {
    res.sendStatus(400);
    return;
  }

  const game = await db(TableNames.Game_Table)
    .where(GameTableColumns.game_id, game_id)
    .first();

  //if the final result different (awayscore - homescore) is larger than the spread
  //then true

  //if the away team + homne team is greater than the over under, then true

  // if the home team wins, the moneyline is positive

  const home_team_spread =
    game[GameTableColumns.spread] < away_score - home_score;

  const over_under =
    game[GameTableColumns.over_under] < home_score + away_score;

  const home_team_moneyline = game[GameTableColumns.moneyline] < 0;

  //now -> compute the moneyline passing, spread passing , and o/u passing

  const new_game = {
    ...game,
  };
  new_game[GameTableColumns.home_team_score] = home_score;
  new_game[GameTableColumns.away_team_score] = away_score;
  new_game[GameTableColumns.finished] = true;
  new_game[GameTableColumns.home_team_spread] = home_team_spread;
  new_game[GameTableColumns.home_team_moneyline] = home_team_moneyline;
  new_game[GameTableColumns.over_under_result] = over_under;

  //update the game
  await db(TableNames.Game_Table)
    .where(GameTableColumns.game_id, game_id)
    .update(new_game);

  res.json(new_game).status(200);
};

export {
  getGames,
  addGames,
  deleteGame,
  getCurrentWeekGames,
  submitFinalScore,
};
