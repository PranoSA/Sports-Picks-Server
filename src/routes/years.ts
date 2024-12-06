/**
Route Handlers for Years
Dead Simple
*/

import { Request, Response } from 'express';

import db from '../db';

import { TableNames, YearTableColumns } from '../tables';

// GET years
export const getYears = async (req: Request, res: Response): Promise<void> => {
  try {
    const years = await db(TableNames.Year_Table).select('*');
    res.status(200).json(years);
  } catch (error) {
    // DO NOT Leak Sensitive Content
    res.status(500).json({ error: 'Server Error' });
  }
};

// PUT Years -> In The Future this will require an Admin Token
export const addYear = async (req: Request, res: Response): Promise<void> => {
  try {
    const new_years = req.body;
    // for each year, check the proper fields exist
    // if not, throw an error
    for (const year of new_years) {
      if (
        !year[YearTableColumns.year_id] ||
        !year[YearTableColumns.start_date] ||
        !year[YearTableColumns.end_date]
      ) {
        res.status(400).json({ error: 'Missing Fields' });
        return;
      }
    }

    // insert all the years
    const newYears = await db(TableNames.Year_Table)
      .insert(new_years)
      .returning('*');

    res.status(201).json(newYears);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server Error' });
  }
};

//Delete Year -> In The Future this will require an Admin Token
// I Don't really think I need an "Edit" Year
export const deleteYear = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { year_id } = req.params;
    const deleted = await db(TableNames.Year_Table)
      .where({ year_id })
      .del()
      .returning('*');
    res.status(201).json(deleted);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};
