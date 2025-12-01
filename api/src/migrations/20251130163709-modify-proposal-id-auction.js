"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Eliminar columna existente
    await queryInterface.removeColumn("Auctions", "proposal_id");

    // 2. Crear columna nuevamente con tipo UUID nullable
    await queryInterface.addColumn("Auctions", "proposal_id", {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revertir: eliminar nueva columna
    await queryInterface.removeColumn("Auctions", "proposal_id");

    // Restaurar definición antigua (STRING)
    await queryInterface.addColumn("Auctions", "proposal_id", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
