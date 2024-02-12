import express from 'express';

import { ClarifaiStub, grpc } from 'clarifai-nodejs-grpc';
import { postgres, Results, Models } from '../server.js';
import { MODEL_LIST } from './model.js';

const image = express.Router();
const stub = ClarifaiStub.grpc();

image.get('/result/:id', async (req, res) => {
    const id = req.params.id;

    const result = await Results().where('id', id);

    if (!result.length) {
        res.status(400).json({ error: 'Model not found' });
    }

    res.json(result[0]);
})

image.post('/:model', (req, res) => {
    const PAT = process.env.CLARIFAI_PAT;
    const USER_ID = process.env.CLARIFAI_USER_ID;
    const APP_ID = process.env.CLARIFAI_APP_ID;
    const MODEL_ID = req.params.model;
    const USER_NAME = req.body.username;
    const IMAGE_URL = req.body.imageUrl;

    const metadata = new grpc.Metadata();
    metadata.set("authorization", "Key " + PAT);

    stub.PostModelOutputs(
        {
            user_app_id: {
                "user_id": USER_ID,
                "app_id": APP_ID
            },
            model_id: MODEL_ID,
            inputs: [
                {
                    data: {
                        image: {
                            url: IMAGE_URL
                        }
                    }
                }
            ]
        },
        metadata,
        (error, response) => {
            if (error) {
                throw new Error(error);
            }
    
            if (response.status.code !== 10000) {
                throw new Error("Post model outputs failed, status: " + response.status.description);
            }
            
            const uid = generateUID();

            postgres.transaction(trx => {
                const data = {
                    id: uid,
                    name: USER_NAME || null,
                    result: response,
                    created_at: new Date()
                }
        
                trx.insert(data).into('results')
                .then(() => {
                    trx('models')
                    .where('id', MODEL_LIST[MODEL_ID])
                    .increment('uses', 1)
                    .then(() => {});
                })
                .then(trx.commit)
                .catch(trx.rollback)
            });

            res.json({ id: uid, response: response});
        }
    );
})

const generateUID = () => {
    const uid = Date.now().toString(36) + Math.random().toString(36).substring(2, 12).padStart(12, 0);
    if (Results().where('id', uid).length) {
        generateUID();
        return;
    }

    return uid;
}

export { image }