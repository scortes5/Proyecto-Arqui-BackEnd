const request = require("supertest");
jest.mock("../src/models"); // <- evita conectar Sequelize real

const app = require("../app");

// Mock del modelo Property
const Property = require("../src/models").Property;

describe("API Endpoints", () => {

  test("GET /prueba debe responder 200 y texto", async () => {
    const response = await request(app.callback()).get("/prueba");
    
    expect(response.status).toBe(200);
    expect(response.text).toBe("testeando un endpoint pipipi");
  });

  test("GET /properties/:id debe retornar una propiedad", async () => {
    Property.findOne.mockResolvedValue({
      id: 1,
      name: "Casa 1"
    });

    const response = await request(app.callback()).get("/properties/1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", 1);
  });

});

