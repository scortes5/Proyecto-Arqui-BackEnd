require('dotenv').config();

const MQTT_CONFIG = {
  brokerUrl: `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
  options: {
    clean: true,
    connectTimeout: 4000,
    clientId: process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 1000,
  },
  channels: {
    PROPERTIES_INFO: 'properties/info',
    PROPERTIES_REQUESTS: 'properties/requests',
    PROPERTIES_VALIDATION: 'properties/validation',
    PROPERTIES_AUCTIONS: 'properties/auctions'
  },
};

module.exports = MQTT_CONFIG;