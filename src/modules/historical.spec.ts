import { jest } from "@jest/globals";

import historical from "./historical.js";
import { testSymbols } from "../../tests/symbols.js";

import testYf from "../../tests/testYf.js";
import { consoleSilent, consoleRestore } from "../../tests/console.js";

const yf = testYf({ historical });

describe("historical", () => {
  // See also common module tests in moduleExec.spec.js

  const symbolsToSkip = ["BEKE", "BFLY", "SIMP", "^VXAPL" /* Not Found */];
  const symbols = testSymbols.filter((s) => symbolsToSkip.indexOf(s) === -1);
  it.each(symbols)("passes validation for symbol '%s'", async (symbol) => {
    await yf.historical(
      symbol,
      {
        period1: "2020-01-01",
        period2: "2020-01-03",
      },
      { devel: `historical-${symbol}-2020-01-01-to-2020-01-03.json` }
    );
  });

  it("throws if period1,period2 are the same", async () => {
    await expect(
      yf.historical("TSLA", { period1: "2022-02-22", period2: "2022-02-22" })
    ).rejects.toThrow(/cannot share the same value/);
  });

  describe("transformWith", () => {
    const yf = { _moduleExec: jest.fn(), historical };
    // @ts-ignore: TODO
    yf.historical("symbol", { period1: "required-but-not-used" });
    // @ts-ignore: TODO
    const { transformWith } = yf._moduleExec.mock.calls[0][0].query;

    it("uses today's date as default for period2", () => {
      const now = new Date();
      const options = transformWith({ period1: "2020-01-01" });
      expect(options.period2).toBeDefined();
      expect(options.period2).toBe(Math.floor(now.getTime() / 1000));
    });
  });

  // #208
  describe("null values", () => {
    if (process.env.FETCH_DEVEL !== "nocache")
      it("strips all-null rows", async () => {
        const createHistoricalPromise = () =>
          yf.historical(
            "EURGBP=X",
            {
              period1: 1567728000,
              period2: 1570665600,
            },
            // Not a "fake" but seems fixed in newer Yahoo requests
            // so let's test against our previously saved cache.
            { devel: "historical-EURGBP-nulls.saved.fake.json" }
          );

        await expect(createHistoricalPromise()).resolves.toBeDefined();

        const result = await createHistoricalPromise();

        // Without stripping, it's about 25 rows.
        expect(result.length).toBe(5);

        // No need to really check there are no nulls in the data, as
        // validation handles that for us automatically.
      });

    if (process.env.FETCH_DEVEL !== "nocache")
      it("throws on a row with some nulls", () => {
        consoleSilent();
        return expect(
          yf
            .historical(
              "EURGBP=X",
              { period1: 1567728000, period2: 1570665600 },
              { devel: "historical-EURGBP-nulls.fake.json" }
            )
            .finally(consoleRestore)
        ).rejects.toThrow("SOME (but not all) null values");
      });
  });
});
