const dotenv = require('dotenv');
dotenv.config();

exports.config = {
    app_name: [process.env.NEW_RELIC_APP_NAME || 'G4MarketAPI'],
    license_key: process.env.NEW_RELIC_LICENSE_KEY,
    logging: {
        level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    },
    allow_all_headers: true,
    attributes: {
        exclude: ['request.headers.cookie', 'request.headers.authorization']
    }
}