import express from 'express';

import { Models } from '../server.js';

const model = express.Router();

const MODEL_LIST = {
    'face-detection': 'face_detection',
    'celebrity-face-detection': 'celeb_face_detection'
}

model.get('/:id', async (req, res) => {
    const id = req.params.id;

    const models = await Models().where('id', id);

    if (!models.length) {
        res.status(400).json({ error: 'Model not found' });
    }

    res.json(models[0]);
})

export { model, MODEL_LIST }