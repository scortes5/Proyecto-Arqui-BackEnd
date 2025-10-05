'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('Appointments', 'user_id', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.changeColumn('Wallets', 'user_id', {
      type: Sequelize.STRING,
      allowNull: false
    });

  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('Appointments', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true
    });
    await queryInterface.changeColumn('Wallets', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false
    });
  }
};
