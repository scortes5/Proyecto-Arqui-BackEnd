module.exports = {
  Property: {
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  },
  Appointment: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Wallet: {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  Suggestion: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(),
  },
};
