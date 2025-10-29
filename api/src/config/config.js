const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  "development": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": `${process.env.DB_NAME}`,
    "host": process.env.DB_HOST,
    "dialect": "postgres",
    "pool": {
      "max": 20,
      "min": 0,
      "acquire": 60000,
      "idle": 10000
    }
  },
  "test": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": `${process.env.DB_NAME}_test`,
    "host": process.env.DB_HOST,
    "dialect": "postgres",
    "pool": {
      "max": 20,
      "min": 0,
      "acquire": 60000,
      "idle": 10000
    }
  },
  "production": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": `${process.env.DB_NAME}_production`,
    "host": process.env.DB_HOST,
    "dialect": "postgres",
    "pool": {
      "max": 20,
      "min": 0,
      "acquire": 60000,
      "idle": 10000
    }
  }
}

