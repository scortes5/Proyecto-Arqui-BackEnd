'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Appointment.init({
    request_id: {
      type: DataTypes.UUID,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      primaryKey: true
    },
    group_id: DataTypes.STRING,
    property_url: DataTypes.STRING,
    status: DataTypes.ENUM("PENDING", "ACCEPTED", "REJECTED", "ERROR", "OK"),
    reason: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Appointment',
  });
  return Appointment;
};