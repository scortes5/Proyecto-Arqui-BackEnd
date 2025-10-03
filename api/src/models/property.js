'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Property extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Property.init({
    name: DataTypes.STRING,
    price: DataTypes.FLOAT,
    currency: DataTypes.STRING,
    bedrooms: DataTypes.STRING,
    bathrooms: DataTypes.STRING,
    m2: DataTypes.STRING,
    location: DataTypes.STRING,
    img: DataTypes.STRING,
    url: DataTypes.STRING,
    is_project: {               
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reservations: {               
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    timestamp: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Property',
  });
  return Property;
};