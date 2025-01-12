import express, {
  NextFunction,
  RequestHandler,
  Response,
  Request,
} from 'express';
import knex from 'knex';
import knexConfig from './knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
const db = knex(config);
import cors from 'cors';

import { verify } from './Authorization';

import { getYears, addYear, deleteYear } from './routes/years';

//use dotenv to load environment variables
import dotenv from 'dotenv';
//load environment variables from .env file
dotenv.config();

//import dotenv from 'dotenv';
console.log('process.env.NODE_ENV', process.env.NODE_ENV);
console.log('process.env.API_KEY', process.env.API_KEY);

import handleAutomaticUpdates from './game_automatic_updates';

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://sportspicks.compressibleflowcalculator.com',
    ],
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Alternative_UUID'],
  })
);

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

//weeks
import {
  getWeeks,
  addWeeks,
  deleteWeek,
  getWeekForCurrentYear,
} from './routes/weeks';

const auth_middleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bearer_header = req.headers.authorization;
  const bearer = bearer_header?.split(' ');

  if (!bearer || bearer.length !== 2) {
    res.status(401).send('invalid token...');
    return;
  }

  const token = bearer[1];

  try {
    const decoded = await verify(token); // Replace 'your-secret-key' with your actual secret key

    //set the user in the request context
    //not the body, but the request object
    res.locals.user = decoded.payload.sub;

    var any_decoded = decoded as any;

    const UserObject = {
      [UserTableColumns.user_id]: any_decoded.payload.sub,
      [UserTableColumns.full_name]: any_decoded.payload.name,
      [UserTableColumns.email]: any_decoded.payload.email,
      [UserTableColumns.username]: any_decoded.payload.preferred_username,
      [UserTableColumns.last_activity]: new Date(),
    };

    //res.locals.email = decoded.payload.

    /*
  "resource_access": {
    "sports-picks-clients": {
      "roles": [
        "Sports Clients Admin"
      ]
    },
  },
  */

    //@ts-ignore
    const reaource_access_roles =
      //@ts-ignore
      decoded.payload.resource_access?.['sports-picks-clients']?.roles;

    if (reaource_access_roles) {
      const is_admin = reaource_access_roles.includes('Sports Clients Admin');
      res.locals.is_admin = is_admin;

      //check if the header "Alternative_UUID is set if the user is an admin"
      if (is_admin) {
        console.log('Admin Incoming Request');
        console.log(req.headers);
        const alt_uuid = req.headers['alternative_uuid'];
        console.log("Alternative User's UUID", alt_uuid);
        if (alt_uuid) {
          console.log("Alternative User's UUID", alt_uuid);
          res.locals.user = alt_uuid;
          res.locals.spretending = true;
        }
      }
    }

    //const is_admin;

    //@ts-ignore
    if (decoded.payload.email) {
      //@ts-ignore
      res.locals.email = decoded.payload.email;
    }

    //also fill out name
    //@ts-ignore
    if (decoded.payload.name) {
      //@ts-ignore
      res.locals.name = decoded.payload.name;
    }

    //also fill out username
    //@ts-ignore
    if (decoded.payload.preferred_username) {
      //@ts-ignore
      res.locals.username = decoded.payload.preferred_username;
    }

    const pretending = res.locals.spretending;

    if (pretending) {
      next();
      return;
    }

    //create an object with the columns of the user
    const user_in_database = await db(TableNames.User_Table)
      .where('user_id', res.locals.user)
      .first();

    // Check if any fields have changed or if the user is not in the database
    if (
      !user_in_database ||
      user_in_database.username !== UserObject.username ||
      user_in_database.user_id !== UserObject.user_id ||
      new Date(user_in_database.last_login).getTime() + 2 * 60 * 1000 <
        new Date().getTime()
    ) {
      await db(TableNames.User_Table)
        .insert(UserObject)
        .onConflict('user_id')
        .merge(UserObject);
    }

    next();
  } catch (error) {
    res.status(401).send('invalid token...');
  }
};

app.use(auth_middleware);

import {
  getGroups,
  addGroup,
  deleteGroup,
  getGroup,
  joinGroup,
  getGroupUsers,
} from './routes/groups';

app.get('/api/v1/groups', getGroups);
app.get('/api/v1/groups/:group_id/users', getGroupUsers);
app.get('/api/v1/groups/:group_id', getGroup);
app.post('/api/v1/groups', addGroup);
app.post('/api/v1/groups/:group_id/users', joinGroup);
app.delete('/api/v1/groups/:group_id', deleteGroup);

//picks
import {
  getPicks,
  addPicks,
  getCurrentWeekPicks,
  calculateScores,
  calculateScoresHandler,
} from './routes/picks';
app.post('/api/v1/picks/:group_id', addPicks);
app.get('/api/v1/picks/:group_id', getCurrentWeekPicks);

import { scoresForWeekHandler, scoresForYearHandler } from './routes/scores';
app.get('/api/v1/scores/:group_id', scoresForYearHandler);
app.get('/api/v1/scores/:group_id/:week_id', scoresForWeekHandler);

// games

/**
Admin Routes:
Editing / Adding Years
Editing / Adding Weeks
Editing / Adding Games
*/

const checkIsAdmin: RequestHandler = (req, res, next) => {
  if (!res.locals.is_admin) {
    res.status(401).send('Not authorized');
    return;
  }

  next();
};

app.get('/api/v1/is_admin', (req, res) => {
  res.json({ is_admin: res.locals.is_admin });
});

app.get(
  '/api/v1/admin/automatic_updates',
  checkIsAdmin,
  handleAutomaticUpdates
);

app.get('/api/v1/years', getYears);
app.post('/api/v1/years', checkIsAdmin, addYear);
app.delete('/api/v1/years/:year_id', checkIsAdmin, deleteYear);

app.get('/api/v1/weeks/current_year', getWeekForCurrentYear);
app.get('/api/v1/weeks/:year_id', getWeeks);
app.post('/api/v1/weeks', checkIsAdmin, addWeeks);
app.delete('/api/v1/weeks/:week_id/:year_id', checkIsAdmin, deleteWeek);
app.put('/api/v1/weeks/:week_id', checkIsAdmin, deleteWeek);

//games
import {
  getGames,
  addGames,
  deleteGame,
  getCurrentWeekGames,
  submitFinalScore,
  getGamesByWeek,
} from './routes/games';
import { TableNames, UserTableColumns } from './tables';

app.get('/api/v1/games/weeks/:week_id', getGamesByWeek);
app.post('/api/v1/games', checkIsAdmin, addGames);
app.post('/api/v1/games/:game_id', checkIsAdmin, submitFinalScore);
app.delete('/api/v1/games/:game_id', checkIsAdmin, deleteGame);
app.get('/api/v1/games/current', getCurrentWeekGames);
app.get('/api/v1/games/:year_id/:week_id', getGames);

//groups
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
