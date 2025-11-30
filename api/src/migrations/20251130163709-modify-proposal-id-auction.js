"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("Auctions", "proposal_id", {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revertimos a como estaba antes (UUIDV4 + NOT NULL)
    await queryInterface.changeColumn("Auctions", "proposal_id", {
      type: Sequelize.UUID,
      allowNull: false,
      defaultValue: Sequelize.literal("uuid_generate_v4()"),
    });
  },
};
