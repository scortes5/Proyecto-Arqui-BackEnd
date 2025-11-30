"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class GroupAppointment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  GroupAppointment.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      property_id: DataTypes.NUMBER,
      quantity: DataTypes.NUMBER,
      discount: DataTypes.NUMBER,
      price: DataTypes.NUMBER,
    },
    {
      sequelize,
      modelName: "GroupAppointment",
    }
  );
  return GroupAppointment;
};
