import express from 'express';

import { Users } from '../server.js';

const profile = express.Router();

profile.get('/:id', async (req, res) => {
    const id = req.params.id;

    const users = await Users().where('id', id).orWhere('name', id);

    if (!users.length) {
        res.status(400).json({ error: 'User not found' });
    }

    res.json(users[0]);
})

export { profile };