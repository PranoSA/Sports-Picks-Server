/**

Format is something like this :

[] {

    sports_title : "NFL", //make sure its NFL before proceeding
    home_team : "New England Patriots",
    road_team : "Miami Dolphins",
    commence_time : "2021-09-12T17:00:00Z", //use this to determine if the game has started
    bookmakers : [
    //just use the first bookmaker for now , which is draftkings
    {
        title : "DraftKings",
            markets : [
                [
{
        "key": "draftkings",
        "title": "DraftKings",
        "last_update": "2024-11-15T20:03:23Z",
        "markets": [
          {
            "key": "h2h",
            "last_update": "2024-11-15T20:03:23Z",
            "outcomes": [
              {
                "name": "Baltimore Ravens",
                "price": -170
              },
              {
                "name": "Pittsburgh Steelers",
                "price": 142
              }
            ]
          },
          {
            "key": "spreads",
            "last_update": "2024-11-15T20:03:23Z",
            "outcomes": [
              {
                "name": "Baltimore Ravens",
                "price": -102,
                "point": -3.5
              },
              {
                "name": "Pittsburgh Steelers",
                "price": -118,
                "point": 3.5
              }
            ]
          },
          {
            "key": "totals",
            "last_update": "2024-11-15T20:03:23Z",
            "outcomes": [
              {
                "name": "Over",
                "price": -110,
                "point": 48.5
              },
              {
                "name": "Under",
                "price": -110,
                "point": 48.5
              }
            ]
          }
        ]
                ]
            ]
        ]
    }
]

}

*/

import { Request, Response } from 'express';

type GameResponse = {
  //only extract relevant fields
  sport_title: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: {
    title: string;
    markets: {
      key: string;
      outcomes: {
        name: string;
        price: number;
        point: number;
      }[];
    }[];
  }[];
};

//markests order is moneyline, spread, over_under

import db from './db';
import {
  YearTableColumns,
  TableNames,
  WeekTableColumns,
  GameTableColumns,
} from './tables';

const API_KEY = process.env.API_KEY;
console.log('API_KEY', API_KEY);

const updateGamesAutomatically = async () => {
  //get the corresponding year
  const years = await db(TableNames.Year_Table)
    .where(YearTableColumns.start_date, '<', new Date())
    .andWhere(YearTableColumns.end_date, '>', new Date());
  const year = years[0];
  if (!year) {
    return;
  }
  console.log('years', years);

  //get the corresponding week
  const weeks = await db(TableNames.Week_Table)
    .where(WeekTableColumns.year_id, year.year_id)
    .andWhere(WeekTableColumns.start_date, '<', new Date())
    .andWhere(WeekTableColumns.end_date, '>', new Date());

  const week = weeks[0];
  if (!week) {
    console.log('No week found');
    return;
  }

  //this is the week we are currently in

  //now get the games
  const api_url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${API_KEY}`;

  console.log('API URL', api_url);
  console.log('API_KEY', API_KEY);

  const res = await fetch(api_url);

  if (!res.ok) {
    throw new Error('Network response was not okay');
  }

  const data = await res.json();

  //clear gmaes for the current time period
  await db(TableNames.Game_Table)
    .delete()
    .where(GameTableColumns.kickoff, '>=', week.start_date)
    .andWhere(GameTableColumns.kickoff, '<=', week.end_date);

  //iterate through the games in a for each loop
  data.forEach(async (game: GameResponse) => {
    //check if the game is in the current week
    //check if NFL
    console.log('game', game);
    console.log('Home Team', game.home_team);
    console.log('Road Team', game.away_team);
    console.log('Commence Time', game.commence_time);
    console.log('Week Start Date', week.start_date);
    console.log('Week End Date', week.end_date);

    console.log('--------------------');

    if (game.sport_title !== 'NFL') {
      console.log('NOT NFL, it is ', game.sport_title);
      return;
    }

    const game_start = new Date(game.commence_time);

    if (game_start >= week.start_date && game_start <= week.end_date) {
      //check if the game is already in the database
      const games = await db(TableNames.Game_Table)
        .where('home_team', game.home_team)
        .andWhere('away_team', game.away_team)
        .andWhere('kickoff', game.commence_time)
        .andWhere('week_id', week.week_id)
        .andWhere('year_id', year.year_id);

      console.log('game', game);
      console.log('games', games);

      /*

      There is no consistency in the location of the favorites and underdogs in the API response
      */
      //get the name from the spread
      const name_of_team_one = game.bookmakers[0].markets[1].outcomes[0].name;
      //determine if this is the home team or the away team
      const home_team =
        name_of_team_one === game.home_team ? game.home_team : game.away_team;

      //get the spread corresponding to this
      const spread = game.bookmakers[0].markets[1].outcomes[0].point;

      // flip it if its not corresponding to the home team (the spread is for the home team)
      const spread_for_home_team =
        name_of_team_one === game.home_team ? spread : -spread;

      //do the same thing for the moneyline
      const moneyline = game.bookmakers[0].markets[0].outcomes[0].price;

      //get the name corresponding to the moneyline
      const name_of_team_two = game.bookmakers[0].markets[0].outcomes[1].name;

      //determine if this is the home team or the away team
      const home_team_moneyline =
        name_of_team_two === game.home_team ? game.home_team : game.away_team;

      //flip it if its not corresponding to the home team
      const moneyline_for_home_team =
        name_of_team_two === game.home_team ? -moneyline : moneyline;

      if (games.length === 0) {
        //insert the game

        const newGame = {
          home_team: game.home_team,
          away_team: game.away_team,
          kickoff: game.commence_time,
          week_id: week.week_id,
          year_id: year.year_id,
          finished: false,
          //over_under should be the amount the total
          over_under: game.bookmakers[0].markets[2].outcomes[0].point,
          spread: spread_for_home_team,
          moneyline: moneyline_for_home_team,
        };

        console.log('inserting game', newGame);

        await db(TableNames.Game_Table).insert(newGame);
      }
    }
  });
};

const handleAutomaticUpdates = async (req: Request, res: Response) => {
  //we know the deal
  try {
    await updateGamesAutomatically();
    res.status(200).json({ message: 'Automatic Updates Complete' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server Error' });
  }
};

export default handleAutomaticUpdates;
