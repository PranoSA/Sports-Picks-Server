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
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.get('/api/v1/admin/automatic_updates', handleAutomaticUpdates);

app.get('/api/v1/years', getYears);
app.post('/api/v1/years', addYear);
app.delete('/api/v1/years/:year_id', deleteYear);

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
    //res.locals.email = decoded.payload.

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

    next();
  } catch (error) {
    console.log('Error verifying token 2', error);
    res.status(401).send('invalid token...');
  }
};

app.use(auth_middleware);

app.get('/api/v1/weeks/current_year', getWeekForCurrentYear);
app.get('/api/v1/weeks/:year_id', getWeeks);
app.post('/api/v1/weeks', addWeeks);
app.delete('/api/v1/weeks/:week_id/:year_id', deleteWeek);
app.put('/api/v1/weeks/:week_id', deleteWeek);

//games
import {
  getGames,
  addGames,
  deleteGame,
  getCurrentWeekGames,
  submitFinalScore,
} from './routes/games';

app.post('/api/v1/games', addGames);
app.post('/api/v1/games/:game_id', submitFinalScore);
app.delete('/api/v1/games/:game_id', deleteGame);
app.get('/api/v1/games/current', getCurrentWeekGames);
app.get('/api/v1/games/:year_id/:week_id', getGames);
//groups

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
