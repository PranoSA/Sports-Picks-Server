/**

Weeks route handler
*/

import { Request, Response } from 'express';

import db from '../db';

import { TableNames, WeekTableColumns, YearTableColumns } from '../tables';

type Week = {
  week_id: string;
  year_id: string;
  week_number: number;
  start_date: Date;
  end_date: Date;
};

const getCurrentYear = async () => {
  const date = new Date();
  const year = await db(TableNames.Year_Table)
    .where('start_date', '<=', date)
    .andWhere('end_date', '>=', date)
    .first();
  return year;
};

// GET weeks [for a year]
export const getWeeks = async (req: Request, res: Response): Promise<void> => {
  try {
    let { year_id } = req.params;

    if (!year_id) {
      //use the current year
      const year = await getCurrentYear();
      year_id = year.year_id;
    }

    const weeks = await db(TableNames.Week_Table)
      .select('*')
      .where({ year_id });
    res.status(200).json(weeks);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// Add Weeks [always be an array, even if it's just one]
export const addWeeks = async (req: Request, res: Response): Promise<void> => {
  try {
    const weeks = req.body;

    console.log('weeks', weeks);

    //check the proper properties exists for each week
    const validWeeks = weeks.every(
      (week: any) =>
        week[WeekTableColumns.week_id] &&
        week[WeekTableColumns.week_name] &&
        week[WeekTableColumns.start_date] &&
        week[WeekTableColumns.end_date] &&
        week[YearTableColumns.year_id]
    );

    if (!validWeeks) {
      res.status(400).json({ error: 'Invalid Week' });
      return;
    }

    if (!validWeeks) {
      res.status(400).json({ error: 'Invalid Week' });
      return;
    }

    const newWeeks = await db(TableNames.Week_Table)
      .insert(weeks)
      .returning('*');
    res.status(201).json(newWeeks);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// Delete Week
export const deleteWeek = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { week_id, year_id } = req.params;

    console.log('week_id', week_id);
    console.log('year_id', year_id);

    await db(TableNames.Week_Table).where({ week_id, year_id }).del();
    res.status(204).send();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// Edit Week
export const editWeek = async (req: Request, res: Response): Promise<void> => {
  try {
    const { week_id } = req.params;
    const { week_number, start_date, end_date } = req.body;
    const updatedWeek = await db(TableNames.Week_Table)
      .where({ week_id })
      .update({ week_number, start_date, end_date })
      .returning('*');
    res.status(200).json(updatedWeek);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

export const getWeekForCurrentYear = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const year = await getCurrentYear();
    const weeks = await db(TableNames.Week_Table).where(
      WeekTableColumns.year_id,
      year.year_id
    );
    res.status(200).json(weeks);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};
