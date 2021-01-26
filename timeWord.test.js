const timeWord = require("./timeWord");

describe("#timeword", () => {
  test("works: is a function", () => {
    expect(typeof timeWord).toBe("function");
  });

  test("works: edge cases noon and midnight", () => {
    expect(timeWord("12:00")).toBe("noon");
    expect(timeWord("00:00")).toBe("midnight");
  });

  test("works: begins with 0", () => {
    expect(timeWord("02:31")).toBe("two thirty one am");
  });

  test("works: begins with 1", () => {
    expect(timeWord("16:46")).toBe("four fourty six pm");
  });

  test("works: edge case 12 in 2nd part", () => {
    expect(timeWord("16:12")).toBe("four twelve pm");
  });

  test("works: edge case 00 in 2nd part", () => {
    expect(timeWord("06:00")).toBe("six o'clock am");
  });

  test("works: edge case 0 in 2nd part", () => {
    expect(timeWord("16:02")).toBe("four oh two pm");
  });

  test("works: twelve oh nine", () => {
    expect(timeWord("12:09")).toBe("twelve oh nine pm");
  });
});
