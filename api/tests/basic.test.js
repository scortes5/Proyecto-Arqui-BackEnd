describe("API basic unit tests", () => {

  test("Math works", () => {
    expect(2 + 2).toBe(4);
  });

  test("Environment loads", () => {
    expect(process.env).not.toBeNull();
  });

});
