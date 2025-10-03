const Router = require("@koa/router");
const router = new Router();
const { Op } = require('sequelize');
const { Property } = require('../models')

// -------------------------------------- METODO GET ---------------------------------------------
// obtener todas las propiedades
router.get('/', async (ctx) => {
  try {
    const { page = 1, limit = 25, price, location, date } = ctx.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (price) {
      where.price = { [Op.lte]: parseFloat(price) };
    }

    if (location) {
      where.location = { [Op.iLike]: `%${location}%` };
    }

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      where.timestamp = {
        [Op.between]: [start.toISOString(), end.toISOString()]
      };
    }


    const properties = await Property.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [['timestamp', 'DESC']],
    });

    ctx.body = {
      total: properties.count,
      page: parseInt(page),
      limit: parseInt(limit),
      results: properties.rows,
    };
    ctx.status = 200;

  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
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
// crear o actualizar propiedad
router.post('/', async (ctx) => {
  try {
    const { 
      name, price, currency, bedrooms, bathrooms, m2, location, img, url, is_project, timestamp
    } = ctx.request.body;

    let property = await Property.findOne({ where: { name } });

    if (property) {
      property.reservations = (property.reservations || 0) + 1;
      await property.save();
      console.log(`Propiedad existente actualizada: ${name}, reservations: ${property.reservations}`);
    } else {
      property = await Property.create({
        name, price, currency, bedrooms, bathrooms,m2, location, img,url, is_project, timestamp
      });
      console.log(`Propiedad creada: ${name}`);
    }

    ctx.status = 201;
    ctx.body = property;

  } catch (error) {
    console.error("Error al crear/actualizar propiedad:", error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

module.exports = router;


