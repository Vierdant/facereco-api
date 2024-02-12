import express from 'express';
import validator from 'validator';
import jwt from 'jsonwebtoken';

const validate = express.Router();

validate.post('/register', (req, res) => {
    const { name, email, password, otherPassword } = req.body;

    res.json(
        {
            name: validator.isLength(name, {min: 3, max: 16}),
            email: validator.isEmail(email),
            password: validator.isStrongPassword(password, {
              minLength: 8,
              minLowercase: 1,
              minUppercase: 1,
              minNumbers: 1,
              minSymbols: 1 
            }),
            match: validator.equals(password, otherPassword)
        }
    );
})

validate.post('/token', (req, res) => {
    jwt.verify(req.body.token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.json({ error: err });
            return;
        }

        res.json(decoded);
    });
})

export { validate };