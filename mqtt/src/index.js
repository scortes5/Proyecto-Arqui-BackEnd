require('dotenv').config();

const brokerUrl = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;
const mqtt = require('mqtt')
const options = {
  // Clean session
  clean: true,
  connectTimeout: 4000,
  // Authentication
  clientId: process.env.MQTT_CLIENT_ID,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
}
const client  = mqtt.connect(brokerUrl, options)

client.on('connect', function () {
  console.log('Connected')
  // Subscribe to a topic
  client.subscribe(process.env.MQTT_TOPIC, function (err) {
    if (!err) {
      // Publish a message to a topic
      client.publish('test', 'Hello mqtt')
    }
  })
})


client.on('message', async (topic, message) => {
  try {
    const raw = message.toString();
    const parsed = JSON.parse(raw);

    const response = await fetch(`${process.env.API_URL}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`🏠 Propiedad enviada a la API: id: ${result.id}. ${result.name}`);
  } catch (err) {
    console.error('Error al enviar propiedad a la API:', err.message);
  }
});


