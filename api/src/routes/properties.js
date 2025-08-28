const Router = require("@koa/router");
const router = new Router();
const { Op } = require('sequelize');
const { Property } = require('../models')

// -------------------------------------- METODO GET ---------------------------------------------
// obtener todas las propiedades
router.get('/', async (ctx) => {
    try {
        const properties = await Property.findAll();

        if (properties.length === 0) {
          ctx.status = 404;
          ctx.body = { error: 'Property not found' };
          return;
        }

        ctx.body = properties;
        ctx.status = 200;

      } catch (error) {
        ctx.status = 500;
        ctx.body = { error: error };
      }
});

// Obtener una propiedad por su id
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    const property = await Property.findOne({ where: { id } });

    if (!property) {
      ctx.status = 404;
      ctx.body = { error: 'Property not found' };
      return;
    }

    ctx.body = property;
    ctx.status = 200;


    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: error };
    }
});

// -------------------------------------- METODO POST ---------------------------------------------
// crear una nueva propiedad
router.post('/', async (ctx) => {
  try {
    const { 
      name, price, currency, bedrooms, bathrooms, m2, location, img, url, is_project, timestamp
    } = ctx.request.body;

    const newProperty = await Property.create({
      name, price, currency, bedrooms, bathrooms, m2, location, img, url, is_project, timestamp
    });

    ctx.status = 201;
    ctx.body = newProperty;

  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;

