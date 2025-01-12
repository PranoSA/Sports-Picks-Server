import { GameTableColumns, GroupTableColumns, TableNames } from '../tables';

Error.stackTraceLimit = 50;

import db from '../db';

import { Request, Response } from 'express';

//get games for week

const getCurrentWeekId = async () => {
  const current_date = new Date();
  const week = await db(TableNames.Week_Table)
    .where('start_date', '<=', current_date)
    .andWhere('end_date', '>=', current_date)
    .first();
  if (!week) {
    return '1';
  }
  return week.week_id;
};

//get games for week
const getWeekGames = async (week_id: string) => {
  const games = await db(TableNames.Game_Table).where('week_id', week_id);
  return games;
};

// remove picks for a user -> filtering for game_id in getWeekGames
const removePicks = async (user_id: string, week_id: string) => {
  const games = await getWeekGames(week_id);
  const game_ids = games.map((game) => game.game_id);
  await db(TableNames.Pick_Table)
    .whereIn('game_id', game_ids)
    .andWhere('user_id', user_id)
    .del();
};

// get the games for the current week
const getCurrentWeekGames = async () => {
  const week_id = await getCurrentWeekId();
  const games = await db(TableNames.Game_Table).where('week_id', week_id);
  return games;
};

// now for uploading new picks
const addPicks = async (req: Request, res: Response) => {
  const picks = req.body;

  const { group_id } = req.params;

  //make sure all the necessary fields are present
  if (!picks.length) {
    //send 400 response with some message
    res.sendStatus(400);
    console.log('No picks were sent');
    //write a message
    //res.sendStatus(401);

    return;
  }

  //get the current week
  const week_id = await getCurrentWeekId();

  // now get the current games
  const games = await db(TableNames.Game_Table).where('week_id', week_id);

  let user_id = res.locals.user;

  //validate that all picks have game_id, bet_id, and choice
  for (const pick of picks) {
    if (!pick.game_id) {
      console.log('Missing game_id or bet_id');
      res.sendStatus(400);
      return;
    }
    //make sure bet_id is type of number
    if (typeof pick.bet_id !== 'number') {
      console.log('bet_id must be a number');
      res.sendStatus(400);
      return;
    }

    //make sure typeof choice is a boolean
    if (typeof pick.pick !== 'boolean') {
      console.log('Choice must be a boolean');
      res.sendStatus(400);
      return;
    }
  }

  //make sure accross all picks, the same bet_id is not repeated
  const bet_ids = picks.map((pick: { bet_id: any }) => pick.bet_id);

  const unique_bets = [...new Set(bet_ids)];

  if (unique_bets.length !== bet_ids.length) {
    console.log('Duplicate bet_id');
    res.sendStatus(400);
    return;
  }

  //iterate through all picks and ensure that
  // 1. all the fields are present
  // 2. That the old game is not in the past [check for an entry with same week and bet_id]
  // 3. the new game is not in the past [and in this week]
  for (const pick of picks) {
    console.log('pick', pick);
    if (!pick.game_id) {
      console.log('Missing game_id or bet_id');
      res.sendStatus(400);
      return;
    }

    //make sure bet_id is type of number
    if (typeof pick.bet_id !== 'number') {
      console.log('bet_id must be a number');
      res.sendStatus(400);
      return;
    }

    //check if the game is in the past
    /*
    the current selection can be identified by the bet_id and the user_id
    */
    const old_pick = await db(TableNames.Pick_Table)
      //.where('week_id', week_id) //week is inferred from the game_id
      .andWhere('bet_id', pick.bet_id)
      .andWhere('user_id', user_id)
      //and where there was a game_id in games.id
      .whereIn(
        'game_id',
        games.map((game) => game.game_id)
      )

      //.andWhere('group_id', group_id) not per group?
      .first();

    // get the game corresponding to the old pick
    if (old_pick) {
      const game = games.find((game) => game.game_id === old_pick.game_id);
      console.log('game', game);
      console.log("old_pick['game_id']", old_pick['game_id']);
      console.log('Games', games);
      //make sure the game is not in the past
      const old_kickoff = new Date(game.kickoff);
      if (old_kickoff < new Date()) {
        console.log('Old game is in the past');
        //res.sendStatus(400);
        //return;
      }
    }

    //check if the game is in the future
    const game = games.find((game) => game.game_id === pick.game_id);
    const new_kickoff = new Date(game.kickoff);
    if (new_kickoff < new Date()) {
      console.log('New game is in the past');
      //addthis back later
      //res.sendStatus(400);
      //return;
    }
  }

  //clear old `picks` for the user and week
  /* await db(TableNames.Pick_Table)
    //.where('week_id', week_id)
    .andWhere('user_id', user_id)
    //.andWhere('group_id', group_id)
    //.andWhere('game_id',)
    //you need to add week_id to the pick
    .del();
*/
  await removePicks(user_id, week_id);

  //set user_id for all picks
  picks.forEach((pick: { user_id: any }) => (pick.user_id = user_id));

  await db(TableNames.Pick_Table).insert(picks);
  res.sendStatus(201);
};

//get picks for a particular week
const getPicks = async (req: Request, res: Response) => {
  const { group_id, week_id } = req.params;

  const picks = await db(TableNames.Pick_Table)
    .where('group_id', group_id)
    .andWhere('week_id', week_id);

  res.send(picks);
};

//get picks for current week
const getCurrentWeekPicks = async (req: Request, res: Response) => {
  const week_id = await getCurrentWeekId();
  const { group_id } = req.params;

  let user_id = res.locals.user;

  const current_games = await getCurrentWeekGames();

  try {
    const picks = await db(TableNames.Pick_Table)
      //.where('group_id', group_id)
      .andWhere('user_id', user_id);

    //filter out picks corresponding to games that are not in the current week
    const picks_for_current_week = picks.filter((pick) =>
      current_games.find((game) => game.game_id === pick.game_id)
    );

    res.send(picks_for_current_week);

    //res.send(picks);
  } catch (error) {
    console.log('error', error);
    res.sendStatus(500);
  }
};

//posted picks will always go to the current week

//In the future I'll need to add capabilities
//to get all group users picks for a particular week

const getMembersOfGroup = async (group_id: string) => {
  const users = await db(TableNames.Group_User_Table).where(
    'group_id',
    group_id
  );
  return users;
};

//get users in group
const getGroupUsers = async (req: Request, res: Response) => {
  const { group_id } = req.params;

  const users = await db(TableNames.Group_User_Table).where(
    'group_id',
    group_id
  );

  res.send(users);
};

//get end date for a week id
const getWeekEndDate = async (week_id: string) => {
  const week = await db(TableNames.Week_Table)
    .where('week_id', week_id)
    .first();
  return week.end_date;
};

//get current year start date
const getCurrentYearStartDate = async () => {
  const current_date = new Date();
  const year = await db(TableNames.Year_Table)
    .where('start_date', '<=', current_date)
    .first();
  return year.start_date;
};

//get all the weeks that have finished that occurred this year
const getFinishedWeeks = async () => {
  const current_date = new Date();

  const start_date_of_year = await getCurrentYearStartDate();
  const weeks = await db(TableNames.Week_Table)
    // .where('end_date', '<=', current_date)
    .andWhere('start_date', '>=', start_date_of_year);
  return weeks;
};

//get picks for each user for a particular week [making sure it has finished so far]
const getWeekPicks = async (req: Request, res: Response) => {
  const { group_id, week_id } = req.params;

  const finished_weeks = await getFinishedWeeks();

  const week = finished_weeks.find((week) => week.week_id === week_id);

  if (!week) {
    res.sendStatus(400);
    return;
  }

  const picks = await db(TableNames.Pick_Table)
    .where('group_id', group_id)
    .andWhere('week_id', week_id);

  res.send(picks);
};

//get picks for each group member for a particular week
const getGroupWeekPicks = async (req: Request, res: Response) => {
  const { group_id, week_id } = req.params;

  const finished_weeks = await getFinishedWeeks();

  const week = finished_weeks.find((week) => week.week_id === week_id);

  if (!week) {
    res.sendStatus(400);
    return;
  }

  const users = await db(TableNames.Group_User_Table).where(
    'group_id',
    group_id
  );

  const picks = await db(TableNames.Pick_Table)
    .where('group_id', group_id)
    .andWhere('week_id', week_id);

  const user_picks = users.map((user) => {
    const user_picks = picks.filter((pick) => pick.user_id === user.user_id);
    return {
      user_id: user.user_id,
      picks: user_picks,
    };
  });

  res.send(user_picks);
};

//get commulative picks for each week for each user in a group
const getGroupPicks = async (req: Request, res: Response) => {
  const { group_id } = req.params;

  const finished_weeks = await getFinishedWeeks();

  const users = await db(TableNames.Group_User_Table).where(
    'group_id',
    group_id
  );

  const user_picks = await Promise.all(
    users.map(async (user) => {
      const picks = await Promise.all(
        finished_weeks.map(async (week) => {
          const picks = await db(TableNames.Pick_Table)
            .where('group_id', group_id)
            .andWhere('week_id', week.week_id)
            .andWhere('user_id', user.user_id);
          return {
            week_id: week.week_id,
            picks,
          };
        })
      );
      return {
        user_id: user.user_id,
        picks,
      };
    })
  );

  res.send(user_picks);
};

//get cummmulative scores for each user in a group, accross all weeks

type ScoreForWeek = {
  week_id: string;
  score: number;
};

//key-value pair, user_id and ScoreForWeek
type UserScoresForWeek = {
  [key: string]: ScoreForWeek[];
};

//return UserScoresForWeek type -> by calculating whether the pick was correct
const calculateScores = async (group_id: string, week_id: string) => {
  const games = await db(TableNames.Game_Table); //.where('week_id', week_id);

  const group_members = await getMembersOfGroup(group_id);

  const picks = await db(TableNames.Pick_Table).whereIn(
    'user_id',
    group_members.map((member) => member.user_id)
  );

  console.log('picks', picks);

  const bets = await db(TableNames.Group_Table)
    .where('group_id', group_id)
    .first();

  console.log('bets', bets);

  //bets is a json type column that encodes a list of bets
  const bets_json = bets[GroupTableColumns.bets];

  //for each bet -> join the bet_id with the index in the bets_json

  const picks_with_bets = picks
    .map((pick) => {
      const bet = bets_json[pick.bet_id];
      return {
        ...pick,
        bet,
      };
    })
    //filter out picks for games that are not finished
    .filter((pick) => {
      const game = games.find((game) => game.game_id === pick.game_id);
      console.log('game', game);
      return game[GameTableColumns.finished];
    });

  console.log('picks_with_bets', picks_with_bets);

  const scores = await Promise.all(
    picks_with_bets.map(async (pick) => {
      const game = games.find((game) => game.game_id === pick.game_id);

      let result = false;
      //check type of pick
      switch (pick.bet.type) {
        case 'spread':
          result =
            game[GameTableColumns.home_team_score] +
              game[GameTableColumns.spread] >
            game[GameTableColumns.away_team_score];
          break;
        case 'over_under':
          result =
            game[GameTableColumns.home_team_score] +
              game[GameTableColumns.away_team_score] >
            game[GameTableColumns.over_under];
          break;
        case 'moneyline':
          result =
            game[GameTableColumns.home_team_score] >
            game[GameTableColumns.away_team_score];
      }

      const correct = pick.pick === result;

      //get points based on the type of bet
      let points = 0;

      switch (pick.bet.type) {
        case 'spread':
          points = pick.bet.num_points;
        case 'over_under':
          points = pick.bet.num_points;
          break;
        case 'moneyline':
          const money_line = game[GameTableColumns.moneyline];
          console.log('money_line', money_line);

          //if home team won and money line is positive, then the points is greater than num_points
          if (
            game[GameTableColumns.home_team_score] >
            game[GameTableColumns.away_team_score]
          ) {
            //points is (num_points * money_line) / 100
            points =
              money_line > 0
                ? (points = pick.bet.num_points * (money_line / 100))
                : (points = pick.bet.num_points * (100 / (0 - money_line)));
          }
          //essentially reverse the logic if the away team won
          else if (
            game[GameTableColumns.home_team_score] <
            game[GameTableColumns.away_team_score]
          ) {
            points =
              money_line < 0
                ? (points = pick.bet.num_points * (0 - money_line / 100))
                : (points = pick.bet.num_points * (100 / money_line));
          }
      }
      console.log('points', points);
      console.log('user_id', pick.user_id);
      console.log('score', correct ? points : 0);

      return {
        week_id,
        score: correct ? points : 0,
        user_id: pick.user_id,
      };
    })
  );

  const scores_by_user = scores.reduce((acc, score) => {
    if (!acc[score.user_id]) {
      acc[score.user_id] = [];
    }
    acc[score.user_id].push(score);
    return acc;
  }, {} as UserScoresForWeek);

  const scores_for_week = Object.entries(scores_by_user).map(
    ([user_id, scores]) => {
      const totalScore = scores.reduce((acc, score) => acc + score.score, 0);
      return {
        user_id,
        week_id,
        score: totalScore,
      };
    }
  );

  return scores_for_week;
};

//Here we will calculate a week-by-week score for each user in the group
type WeeklyScore = {
  user_id: string;
  score: number;
  pending: number;
  //will map user_id to the score for that week
};

type WeeklyScores = {
  week_id: string;
  scores: WeeklyScore[];
};

const calculateScoresForWeek = async (
  group_id: string,
  week_id: string
): Promise<WeeklyScore[]> => {
  const games = await db(TableNames.Game_Table).where('week_id', week_id);

  const group_members = await getMembersOfGroup(group_id);

  const unfiltered_picks = await db(TableNames.Pick_Table).whereIn(
    'user_id',
    group_members.map((member) => member.user_id)
  );

  //filter picks so only one of a particular bet_id is present
  const picks = unfiltered_picks.filter(
    (pick, index, self) =>
      index ===
      self.findIndex(
        (t) => t.bet_id === pick.bet_id && t.user_id === pick.user_id
      )
  );

  console.log('picks', picks);

  const group = await db(TableNames.Group_Table)
    .where('group_id', group_id)
    .first();

  const bets = group.bets;

  const picks_with_bets = picks
    .map((pick) => {
      const bet = bets[pick.bet_id];
      return {
        ...pick,
        bet,
      };
    })
    //filter out picks for games that are not finished
    .filter((pick) => {
      const game = games.find((game) => game.game_id === pick.game_id);
      console.log('game', game);
      if (!game) return false;
      return game.finished;
    });

  console.log('picks_with_bets', picks_with_bets);

  if (!picks_with_bets.length) {
    return [];
  }

  const scores = picks_with_bets.reduce((acc, pick) => {
    const game = games.find((game) => game.game_id === pick.game_id);

    let result = false;
    //check type of pick
    switch (pick.bet.type) {
      case 'spread':
        result = game.home_team_score + game.spread > game.away_team_score;
        break;
      case 'over_under':
        result = game.home_team_score + game.away_team_score > game.over_under;
        break;
      case 'moneyline':
        result = game.home_team_score > game.away_team_score;
    }

    const correct = pick.pick === result;

    //get points based on the type of bet
    let points = 0;

    switch (pick.bet.type) {
      case 'spread':
        points = pick.bet.num_points;
      case 'over_under':
        points = pick.bet.num_points;
        break;
      case 'moneyline':
        const money_line = game.moneyline;
        console.log('money_line', money_line);

        //if home team won and money line is positive, then the points is greater than num_points
        if (game.home_team_score > game.away_team_score) {
          //points is (num_points * money_line) / 100
          points =
            money_line > 0
              ? (points = pick.bet.num_points * (money_line / 100))
              : (points = pick.bet.num_points * (100 / (0 - money_line)));
        }
        //essentially reverse the logic if the away team won
        else if (game.home_team_score < game.away_team_score) {
          points =
            money_line < 0
              ? (points = pick.bet.num_points * (0 - money_line / 100))
              : (points = pick.bet.num_points * (100 / money_line));
        }
    }
    console.log('points', points);
    console.log('user_id', pick.user_id);
    console.log('score', correct ? points : 0);

    //should jusit return a WeeklyScore
    if (!acc[pick.user_id]) {
      acc[pick.user_id] = {
        user_id: pick.user_id,
        score: 0,
        pending: 0,
      };
    }

    return acc;
  });

  //flatten out scores like this -> {user_id:stri}

  return scores;
};

const calculateWeeklyScores = async (
  group_id: string
): Promise<WeeklyScores[]> => {
  //find weeks that have finished
  const finished_weeks = await getFinishedWeeks();

  //calculate scores for each week
  const scores = await Promise.all(
    finished_weeks.map(async (week) => {
      return calculateScoresForWeek(group_id, week.week_id);
    })
  );

  //

  console.log('scores', scores);

  const scores_by_week = scores.map((scores_for_week, index) => {
    return {
      week_id: finished_weeks[index].week_id,
      scores: Object.entries(scores_for_week).map(([user_id, score]) => {
        return {
          user_id,
          score: score.score,
          pending: score.pending,
        };
      }),
    };
  });

  return scores_by_week;
};

//Here We Will Calculate Total Scores for the Season/Year

type TotalScore = {
  user_id: string;
  score: number;
};

type TotalScoreMap = {
  [key: string]: TotalScore[];
};

//get cummulative scores across all weeks
//week_id is not an argument - you are calculating across all weeks that have occured
const calculateScoresForGroupAllWeeks = async (group_id: string) => {
  const finished_weeks = await getFinishedWeeks();

  const scores = await Promise.all(
    finished_weeks.map(async (week) => {
      return calculateScores(group_id, week.week_id);
    })
  );

  const scores_by_user = scores.reduce((acc, scores_for_week) => {
    scores_for_week.forEach((score) => {
      if (!acc[score.user_id]) {
        acc[score.user_id] = [];
      }
      acc[score.user_id].push(score);
    });
    return acc;
  }, {} as UserScoresForWeek);

  //return scores_by_user;

  const scores_for_group = Object.entries(scores_by_user).map(
    ([user_id, scores]) => {
      const totalScore = scores.reduce((acc, score) => acc + score.score, 0);
      return {
        user_id,
        score: totalScore,
      };
    }
  );

  return scores_for_group;
};

const calculateScoresHandler = async (req: Request, res: Response) => {
  const { group_id } = req.params;

  console.log('Hello from calculateScoresHandler');

  // const scores = await calculateScoresForGroupAllWeeks(group_id);
  const current_week_id = await getCurrentWeekId();

  const scores = await calculateWeeklyScores(group_id);
  res.send(scores);
};

export {
  addPicks,
  getPicks,
  getCurrentWeekPicks,
  getCurrentWeekGames,
  getGroupUsers,
  getWeekPicks,
  getGroupWeekPicks,
  getGroupPicks,
  calculateScores,
  getWeekEndDate,
  getCurrentWeekId,
  getWeekGames,
  removePicks,
  getCurrentYearStartDate,
  calculateScoresHandler,
};
