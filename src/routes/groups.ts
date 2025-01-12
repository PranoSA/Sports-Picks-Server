import db from '../db';

import { Request, Response } from 'express';

import {
  TableNames,
  GroupTableColumns,
  GroupUserTableColumns,
} from '../tables';

const current_year = null;

const getCurrentYear = async () => {
  if (current_year) {
    return current_year;
  }

  const date = new Date();
  //fetch from the year table
  const year = await db(TableNames.Year_Table)
    .where('start_date', '<=', date)
    .andWhere('end_date', '>=', date)
    .first();
  return year;
};

const getGroups = async (req: Request, res: Response) => {
  //get uiser id from the req.locals
  const user_id = res.locals.user;

  //get groups where groupuser table has the user id
  const groups = await db(TableNames.Group_Table)
    .join(
      TableNames.Group_User_Table,
      `${TableNames.Group_Table}.${GroupTableColumns.group_id}`,
      `${TableNames.Group_User_Table}.${GroupUserTableColumns.group_id}`
    )
    .where(GroupUserTableColumns.user_id, user_id)
    .select('*');
  console.log('groups', groups);

  res.json(groups);
};

const addGroup = async (req: Request, res: Response) => {
  const group = req.body;

  //jsonify the bets
  if (group.bets) {
    group.bets = JSON.stringify(group.bets);
  }

  //ensure all the necessary fields are present
  if (!group.group_name) {
    res.sendStatus(400);
    return;
  }

  //start a transaction to
  //1. insert the group
  //2. Insert the group user with the attribute of admin

  //start the transaction
  const trx = await db.transaction();

  try {
    //insert the group
    const { year_id } = await getCurrentYear();
    console.log('year_id', year_id);

    const new_group = {
      ...group,
      year_id,
    };

    console.log('new_group', new_group);

    const [group_id] = await trx(TableNames.Group_Table)
      .insert(new_group)
      .returning(GroupTableColumns.group_id);

    console.log('group_id', group_id);

    const id_of_group = group_id[GroupTableColumns.group_id];

    //insert the group user
    await trx(TableNames.Group_User_Table).insert({
      group_id: id_of_group,
      user_id: res.locals.user,
      user_name: res.locals.name,
      user_email: res.locals.email,
      position: 'admin',
    });

    //commit the transaction
    await trx.commit();
    res.sendStatus(201);
  } catch (error) {
    //rollback the transaction
    await trx.rollback();
    console.error(error);
    res.sendStatus(500);
  }

  //
};

const deleteGroup = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  await db(TableNames.Group_Table)
    .where(GroupTableColumns.group_id, group_id)
    .del();
  res.sendStatus(200);
};

const getGroup = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const group = await db(TableNames.Group_Table)
    .where(GroupTableColumns.group_id, group_id)
    .first();
  res.json(group);
};

//get group users for a group
const getGroupUsers = async (req: Request, res: Response) => {
  const { group_id } = req.params;

  const group_users = await db(TableNames.Group_User_Table)
    .where(GroupUserTableColumns.group_id, group_id)
    .select('*');

  //ensure the fetcher is a member of the group
  const user_id = res.locals.user;

  const is_member = group_users.some(
    (group_user) => group_user.user_id === user_id
  );

  if (!is_member) {
    res.sendStatus(403);
    return;
  }

  res.json(group_users);
};

//join group
const joinGroup = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const user_id = res.locals.user;
  try {
    //ensure the user is not already a member of the group
    const is_member = await db(TableNames.Group_User_Table)
      .where({
        group_id,
        user_id,
      })
      .first();

    if (is_member) {
      console.log(
        'User is already a member of the group',
        is_member,
        user_id,
        group_id
      );
      //set "Already a member" status
      res.sendStatus(409);
      return;
    }

    await db(TableNames.Group_User_Table).insert({
      group_id,
      user_id,
      user_name: res.locals.name,
      user_email: res.locals.email,
      position: 'member',
    });

    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
};

export { getGroups, addGroup, deleteGroup, getGroup, getGroupUsers, joinGroup };
