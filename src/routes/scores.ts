import db from '../db';
import {
  GameTableColumns,
  TableNames,
  WeekTableColumns,
  YearTableColumns,
  UserTableColumns,
} from '../tables';

import { Request, Response } from 'express';

/**

*/

const useGetWeeksForCurrentYear = async () => {
  const current_date = new Date();
  const year = await db(TableNames.Year_Table)
    .where(YearTableColumns.start_date, '<=', current_date)
    .andWhere(YearTableColumns.end_date, '>=', current_date)
    .first();

  if (!year) {
    return [];
  }

  const weeks = await db(TableNames.Week_Table).where(
    WeekTableColumns.year_id,
    year.year_id
  );

  return weeks;
};

/**
Format For Retrieved Scores
The User Will want to either retrieve the scores for the entire year

type UserScore = {
user_id: string;
score: number
}

type GroupScores = []UserScore

or for all the weeks in a yeasr

type ScoresForWeek = {
week_id: string;
    UserScoresWeek[]
}

type UserScoresWeek = {
    user_id: string;
    score: number;
}

type ScoresForYear = {
    ScoresForWeek[]
}

*/

const getUsersInAGroup = async (group_id: string) => {
  const users = await db('group_user').where('group_id', group_id);
  return users;
};

const getScoresForWeek = async (week_id: string, group_id: string) => {
  const users = await db(TableNames.Group_User_Table)
    .where('group_id', group_id)
    .select('user_id');

  const picks = await db(TableNames.Pick_Table).whereIn(
    'user_id',
    users.map((user) => user.user_id)
  );

  const games_for_week = await db(TableNames.Game_Table).where(
    'week_id',
    week_id
  );

  const group = await db(TableNames.Group_Table)
    .where('group_id', group_id)
    .first();

  const bets = group.bets;

  const scores = users.map((user) => {
    const user_picks = picks.filter((pick) => pick.user_id === user.user_id);

    const user_score = user_picks.reduce((acc, pick) => {
      const game = games_for_week.find((game) => game.game_id === pick.game_id);

      if (!game) {
        return acc;
      }

      if (!game.finished) {
        return acc;
      }

      const bet = bets[pick.bet_id];

      if (!bet) {
        return acc;
      }

      let result = false;
      let points = 0;

      if (bet.type === 'spread') {
        result =
          game[GameTableColumns.home_team_score] +
            game[GameTableColumns.spread] >
          game[GameTableColumns.away_team_score];
        points = bet.num_points;
      } else if (bet.type === 'moneyline') {
        result =
          game[GameTableColumns.home_team_score] >
          game[GameTableColumns.away_team_score];
        //if moneyline is negative, then the home team is the favorite
        //this means picking the road  should net you more points
        // so say its -210, then you should multiply the points by 2.1
        // if the road team wins
        //if the home team wins and you picked the home team, then you get 100/210 * points

        if (
          game[GameTableColumns.home_team_score] >
          game[GameTableColumns.away_team_score]
        ) {
          if (pick.pick === true) {
            points = bet.num_points * (100 / Math.abs(game.moneyline));
          } else {
            points = bet.num_points * (Math.abs(game.moneyline) / 100);
          }
        }

        if (
          game[GameTableColumns.home_team_score] <
          game[GameTableColumns.away_team_score]
        ) {
          if (pick.pick === false) {
            //road team is favored,
            points = bet.num_points * (100 / Math.abs(game.moneyline));
          } else {
            points = bet.num_points * (Math.abs(game.moneyline) / 100);
          }
        }
      } else if (bet.type === 'over_under') {
        result =
          game[GameTableColumns.home_team_score] +
            game[GameTableColumns.away_team_score] >
          game[GameTableColumns.over_under];
        points = bet.num_points;
      }

      if (result === pick.pick) {
        //determin
        return acc + points;
      }

      return acc;
    }, 0);

    const user_pending_scores = user_picks.reduce((acc, pick) => {
      const game = games_for_week.find((game) => game.game_id === pick.game_id);

      if (!game) {
        return acc;
      }

      if (game.finished) {
        //

        return acc;
      }

      const bet = bets[pick.bet_id];

      if (!bet) {
        return acc;
      }

      let points = 0;

      if (bet.type === 'spread') {
        points = bet.num_points;
      } else if (bet.type === 'moneyline') {
        //check if picked the the underdog or not
        //pretty much if moneyline>0 and pick.pick are opposite signs
        //moneyline>0 means road team is favored (0 pick) and pick.pick is true would mean you
        //picked the underdog
        if (pick.pick !== game.moneyline > 0) {
          points = bet.num_points * (100 / Math.abs(game.moneyline));
        } else {
          points = bet.num_points * (Math.abs(game.moneyline) / 100);
        }
      } else if (bet.type === 'over_under') {
        points = bet.num_points;
      }

      return acc + points;
    }, 0);

    return {
      week: week_id,
      user_id: user.user_id,
      score: user_score,
      potential: user_pending_scores,
    };
  });

  const user_info_promises = scores.map((user) => {
    const userinner = getUserInfoFromId(user.user_id);

    if (!userinner) {
      return {
        user_id: user.user_id,
        username: user.user_id,
      };
    }
    return userinner;
  });
  const user_infos = await Promise.all(user_info_promises);

  scores.forEach((user, index) => {
    user.user_id = user_infos.find(
      (info) => info.user_id === user.user_id
    ).username;
  });

  return scores;
};

const getUserInfoFromId = async (user_id: string) => {
  const user = await db(TableNames.User_Table)
    .where('user_id', user_id)
    .first();

  if (!user) {
    return {
      user_id: user_id,
      username: user_id,
    };
  }

  return user;
};

const getScoresForAllWeeks = async (group_id: string) => {
  const weeks = await useGetWeeksForCurrentYear();

  const scores = await Promise.all(
    weeks.map((week) => getScoresForWeek(week.week_id, group_id))
  );

  return scores;
};

const getTotalScores = async (group_id: string) => {
  const scores = await getScoresForAllWeeks(group_id);

  const total_scores = scores.reduce((acc, week) => {
    week.forEach((user) => {
      const user_score = acc.find((score) => score.user_id === user.user_id);

      if (!user_score) {
        acc.push(user);
        return;
      }

      user_score.score += user.score;
    });

    return acc;
  }, []);

  //replace user_id with user.username using getUserInfoFromId
  const user_info_promises = total_scores.map((user) =>
    getUserInfoFromId(user.user_id)
  );

  const user_info = await Promise.all(user_info_promises);

  total_scores.forEach((user, index) => {
    user.user_id = user_info.find((info) => info.user_id === user.user_id);
  });

  return total_scores;
};

const scoresForWeekHandler = async (req: Request, res: Response) => {
  const { week_id, group_id } = req.params;

  const scores = await getScoresForWeek(week_id, group_id);

  res.json(scores);
};

const scoresForYearHandler = async (req: Request, res: Response) => {
  const { group_id } = req.params;

  const scores = await getScoresForAllWeeks(group_id);

  res.json(scores);
};

export { scoresForWeekHandler, scoresForYearHandler };
