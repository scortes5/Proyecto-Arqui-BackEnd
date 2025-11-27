jest.mock("../src/models");


module.exports = {
  sequelize: {
    authenticate: jest.fn().mockResolvedValue()
  }
};
