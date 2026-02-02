import { describe, it } from "node:test";
import assert from "node:assert";

import config from "../../config";
// import i18n from ".";
import { getLangData, language_exists, label } from ".";
import { ts2date } from "./time";
import i18n_languages from "./languages.json";

describe("I18N Tests", () => {

    it("Checks i18n data exists for the default language", async () => {

        const i18n_data = getLangData(config.i18n.default_language);

        assert.equal(Object.keys(i18n_data).length === 0, false);

    });

    it("Returns an error for a non existent language", async () => {

        assert.equal(language_exists("xx"), false);

    });

    it("Checks is i18n data has all languages", async () => {

        for (const languages_data of i18n_languages) {

            const lang_code = languages_data[2] as string;

            assert.equal(language_exists(lang_code), true);

        }

    });

    it("Checks a label in all languages", async () => {

        assert.equal(label("en", "YES"), "Yes");
        assert.equal(label("es", "YES"), "Si");
        assert.equal(label("zh", "YES"), "是的");
        assert.equal(label("pt", "YES"), "Sim");
        assert.equal(label("fr", "YES"), "Oui");
        assert.equal(label("de", "YES"), "Ja");
        assert.equal(label("it", "YES"), "Sì");
        assert.equal(label("ko", "YES"), "네");
        assert.equal(label("ja", "YES"), "あり");
        assert.equal(label("he", "YES"), "כן");
        assert.equal(label("ru", "YES"), "Да");

    });

    it("Returns timestamp formated to date", async () => {

        const timestamp = 1612025044000;

        const date = ts2date({timestamp});

        assert.equal(date, "Saturday, January 30 2021, 13:44:04");

    });

    it("Checks Full ICU is on the server", async () => {

        const january = new Date(9e8);
        const spanish = new Intl.DateTimeFormat("es", { month: "long" });

        assert.equal(spanish.format(january), "enero");

    });

    it("Checks a label that is not on the i18n data", async () => {

        assert.equal(label("en", "13291887A9D75B55B1AABD87"), "[13291887A9D75B55B1AABD87]");

    });

});
