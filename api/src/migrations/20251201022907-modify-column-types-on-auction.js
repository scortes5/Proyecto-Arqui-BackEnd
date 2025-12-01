"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Auctions", "timestamp", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn("Auctions", "group_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      using: 'group_id::integer',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Auctions", "timestamp", {
      type: Sequelize.DATE,
      allowNull: false,
    });

    await queryInterface.changeColumn("Auctions", "group_id", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  }
};
