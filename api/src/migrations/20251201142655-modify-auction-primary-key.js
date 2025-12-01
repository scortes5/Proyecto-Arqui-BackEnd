"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Agregar columna id
    await queryInterface.addColumn("Auctions", "id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    });

    // 2. Quitar la primary key de auction_id
    // Sequelize no tiene método directo, así que usamos SQL crudo
    await queryInterface.sequelize.query(`
            ALTER TABLE "Auctions" DROP CONSTRAINT "Auctions_pkey";
        `);

    // 3. Establecer id como nueva primary key
    await queryInterface.sequelize.query(`
            ALTER TABLE "Auctions" ADD CONSTRAINT "Auctions_pkey" PRIMARY KEY ("id");
        `);
  },

  async down(queryInterface, Sequelize) {
    // 1. Quitar nueva primary key
    await queryInterface.sequelize.query(`
            ALTER TABLE "Auctions" DROP CONSTRAINT "Auctions_pkey";
        `);

    // 2. Restaurar auction_id como primary key
    await queryInterface.sequelize.query(`
            ALTER TABLE "Auctions" ADD CONSTRAINT "Auctions_pkey" PRIMARY KEY ("auction_id");
        `);

    // 3. Eliminar columna id
    await queryInterface.removeColumn("Auctions", "id");
  },
};
