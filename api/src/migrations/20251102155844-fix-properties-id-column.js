"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Paso 1: Eliminar registros con id nulo
    await queryInterface.sequelize.query(
      'DELETE FROM "Properties" WHERE id IS NULL;'
    );

    // Paso 2: Crear la secuencia para el autoincrement
    await queryInterface.sequelize.query(
      'CREATE SEQUENCE IF NOT EXISTS "Properties_id_seq";'
    );

    // Paso 3: Actualizar el valor de la secuencia al máximo existente (CORREGIDO)
    await queryInterface.sequelize.query(
      'SELECT setval(\'"Properties_id_seq"\', COALESCE((SELECT MAX(id) FROM "Properties"), 0), true);'
    );

    // Paso 4: Modificar la columna id
    await queryInterface.changeColumn("Properties", "id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
    });

    // Paso 5: Agregar el default con la secuencia
    await queryInterface.sequelize.query(
      'ALTER TABLE "Properties" ALTER COLUMN id SET DEFAULT nextval(\'"Properties_id_seq"\');'
    );

    // Paso 6: Asociar la secuencia a la columna
    await queryInterface.sequelize.query(
      'ALTER SEQUENCE "Properties_id_seq" OWNED BY "Properties".id;'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "Properties" ALTER COLUMN id DROP DEFAULT;'
    );

    await queryInterface.sequelize.query(
      'ALTER TABLE "Properties" DROP CONSTRAINT IF EXISTS "Properties_pkey";'
    );

    await queryInterface.changeColumn("Properties", "id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      'DROP SEQUENCE IF EXISTS "Properties_id_seq" CASCADE;'
    );
  },
};
