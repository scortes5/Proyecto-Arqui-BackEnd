'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("Properties", "reservations", {
      type: Sequelize.INTEGER,
      defaultValue: 1,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Properties', 'reservations');

  }
};
