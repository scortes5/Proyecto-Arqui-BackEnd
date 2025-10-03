'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.renameColumn('Properties', 'is_proyect', 'is_project');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.renameColumn('Properties', 'is_project', 'is_proyect');
  }
};
