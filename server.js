import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import * as dotenv from 'dotenv';
import knex from 'knex';
import argon2 from 'argon2';

import { profile } from './routes/profile.js';
import { model } from './routes/model.js';
import { image } from './routes/image.js';
import { validate } from './routes/validate.js';

dotenv.config()

const postgres = knex({
    client: 'pg',
    connection: {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_STORE,
        ssl: {
            rejectUnauthorized: false
        }
    }
});

postgres.raw("SELECT 1").then(() => {
    console.log("PostgreSQL connected");
})
.catch((e) => {
    console.log("PostgreSQL not connected");
    console.error(e);
});

const Users = () => postgres('users');
const Logins = () => postgres('login');
const Models = () => postgres('models');
const Results = () => postgres('results');

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use('/profile', profile);
app.use('/model', model);
app.use('/image', image);
app.use('/validate', validate);

app.get('/', (req, res) => {
    res.send('API is a go');
})

app.post('/login', async (req, res) => {
    const {email, password} = req.body;

    const users = await Logins().select('id').select('hash').where('email', email);

    if (!users.length || !await argon2.verify(users[0].hash, password)) {
        res.status(400).json({ error: 'Failed login' });
        return;
    }

    const jwtToken = jwt.sign({
        id: users[0].id, email: users[0].email
    }, process.env.JWT_SECRET, { expiresIn: '1d' })

    res.json({ id: users[0].id, email: users[0].email, token: jwtToken});
})

app.post('/register', async (req, res) => {
    const {name, email, password} = req.body;

    const users = await Users().where('name', name).orWhere('email', email)

    if (users.length) {
        res.status(400).json({ error: 'name or email already taken' });
        return;
    }

    const hash = await argon2.hash(password);

    const modelList = await Models().select('id');

    const ratingBody = []

    for (const entry of modelList) {
        const body = {
            id: entry.id,
            positive: 0,
            negative: 0
        }

        ratingBody.push(body);
    }

    const user = { 
        name: name.toLowerCase(),
        display_name: name,
        email,
        ratings: JSON.stringify(ratingBody),
        joined_at: new Date()
    }

    const login = {
        email,
        hash
    }

    postgres.transaction(trx => {
        trx.insert(login).into('login')
        .then(async () => {
            const response = await trx('users')
                .returning('*')
                .insert(user);

            const jwtToken = jwt.sign({
                id: response[0].id, email: response[0].email
            }, process.env.JWT_SECRET, { expiresIn: '1d' })

            res.json({ id: response[0].id, email: response[0].email, token: jwtToken});
            })
        .then(trx.commit)
        .catch(trx.rollback)
    });
})

app.listen(process.env.PORT || 5000, () => {
    console.log('Server started')
})

function GetRating(positive, negative) {
    return ((positive + 1.9208) / (positive + negative) - 
        1.96 * Math.sqrt((positive * negative) / (positive + negative) + 0.9604) / 
        (positive + negative)) / (1 + 3.8416 / (positive + negative))
}

export { postgres, Users, Models, Results }