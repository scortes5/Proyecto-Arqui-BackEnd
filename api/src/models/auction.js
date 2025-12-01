"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Auction extends Model {
        static associate(models) {
            // Si quieres asociarlo con propiedades o grupos, aquí va.
        }
    }

    Auction.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            auction_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
            },
            proposal_id: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: "",
            },
            url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            timestamp: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            quantity: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            group_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            operation: {
                type: DataTypes.ENUM("offer", "proposal", "acceptance", "rejection"),
                allowNull: false,
            },
            published: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            sequelize,
            modelName: "Auction",
        }
    );

    return Auction;
};
