// This file is auto-generated, do not modify.
// Generated from v0.2.0-151-g2ae958d on Thu, 14 Apr 2022 20:38:58 +0200
// To re-generate, run contrib/gen-ts.sh from the main anastasis code base.

export const anastasisData = {
  providersList: {
    license: "GPLv3+",
    "SPDX-License-Identifier": "GPL3.0-or-later",
    anastasis_provider: [
      {
        url: "https://v1.anastasis.taler.net/",
        name: "Bern University of Applied Sciences, Switzerland",
      },
      {
        url: "https://v1.anastasis.codeblau.de/",
        name: "Codeblau GmbH, Germany",
      },
      {
        url: "https://v1.anastasis.openw3b.org/",
        name: "Openw3b Foundation, India",
      },
      {
        url: "https://v1.anastasis.lu/",
        name: "Anastasis SARL, Luxembourg",
      },
      {
        url: "https://v1.anastasis.taler.net/",
        restricted: "xx",
      },
      {
        url: "https://v1.anastasis.lu/",
        restricted: "xx",
      },
      {
        url: "http://localhost:8086/",
        restricted: "xx",
      },
      {
        url: "http://localhost:8087/",
        restricted: "xx",
      },
      {
        url: "http://localhost:8088/",
        restricted: "xx",
      },
      {
        url: "http://localhost:8089/",
        restricted: "xx",
      },
    ],
  },
  countriesList: {
    license: "GPLv3+",
    "SPDX-License-Identifier": "GPL3.0-or-later",
    countries: [
      {
        code: "al",
        name: "Albania",
        continent: "Europe",
        name_i18n: {
          de_DE: "Albanien",
          en_UK: "Albania",
        },
        call_code: "+355",
      },
      {
        code: "be",
        name: "Belgium",
        continent: "Europe",
        name_i18n: {
          de_DE: "Belgien",
          en_UK: "Belgium",
        },
        call_code: "+32",
      },
      {
        code: "ch",
        name: "Switzerland",
        continent: "Europe",
        name_i18n: {
          de_DE: "Schweiz",
          de_CH: "Schwiiz",
          fr_FR: "Suisse",
          en_UK: "Swiss",
        },
        call_code: "+41",
      },
      {
        code: "cz",
        name: "Czech Republic",
        continent: "Europe",
        name_i18n: {
          en_UK: "Czech Republic",
        },
        call_code: "+420",
      },
      {
        code: "de",
        name: "Germany",
        continent: "Europe",
        continent_i18n: { de_DE: "Europa" },
        name_i18n: {
          de_DE: "Deutschland",
          de_CH: "Deutschland",
          fr_FR: "Allemagne",
          en_UK: "Germany",
        },
        call_code: "+49",
      },
      {
        code: "dk",
        name: "Denmark",
        continent: "Europe",
        continent_i18n: { de_DE: "Europa" },
        name_i18n: {
          en_UK: "Denmark",
        },
        call_code: "+45",
      },
      {
        code: "es",
        name: "Spain",
        continent: "Europe",
        continent_i18n: { es_ES: "Europa" },
        name_i18n: {
          es_ES: "España",
        },
        call_code: "+44",
      },
      {
        code: "fr",
        name: "France",
        continent: "Europe",
        name_i18n: {
          de_DE: "Frankreich",
          fr_FR: "La France",
        },
        call_code: "+33",
      },
      {
        code: "in",
        name: "India",
        continent: "India",
        continent_i18n: { en_EN: "India" },
        name_i18n: {
          de_DE: "Indien",
          de_CH: "Indien",
          fr_FR: "l'Inde",
          en_UK: "India",
        },
        call_code: "+91",
      },
      {
        code: "it",
        name: "Italy",
        continent: "Europe",
        name_i18n: {
          de_DE: "Italien",
          en_UK: "Italy",
        },
        call_code: "+39",
      },
      {
        code: "jp",
        name: "Japan",
        continent: "Asia",
        continent_i18n: { en_EN: "Japan" },
        name_i18n: {
          de_DE: "Japan",
          de_CH: "Japan",
          en_UK: "Japan",
        },
        call_code: "+81",
      },
      {
        code: "nl",
        name: "Netherlands",
        continent: "Europe",
        name_i18n: {
          de_DE: "Niederlande",
          nl_NL: "Nederland",
          en_UK: "Netherlands",
        },
        call_code: "+31",
      },
      {
        code: "sk",
        name: "Slovakia",
        continent: "Europe",
        name_i18n: {
          en_UK: "Slovakia",
        },
        call_code: "+421",
      },
      {
        code: "us",
        name: "United States of America (USA)",
        continent: "North America",
        continent_i18n: { de_DE: "Nordamerika" },
        name_i18n: {
          de_DE: "Vereinigte Staaten von Amerika (USA)",
          de_CH: "Vereinigte Staaten von Amerika (USA)",
          fr_FR: "États-Unis d'Amérique (USA)",
          en_UK: "United States of America (USA)",
        },
        call_code: "+1",
      },
      {
        code: "xx",
        name: "Testland",
        continent: "Demoworld",
        name_i18n: {
          de_DE: "Testlandt",
          de_CH: "Testlandi",
          fr_FR: "Testpais",
          en_UK: "Testland",
        },
        call_code: "+00",
      },
    ].sort((a, b) => a.name > b.name ? 1 : (a.name < b.name ? -1 : 0)),
  },
  countryDetails: {
    al: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "nid_number",
          label: "Numri i Identitetit",
          label_i18n: {
            en: "Identity Number",
            al: "Numri i Identitetit",
          },
          widget: "anastasis_gtk_ia_nid_al",
          uuid: "256e5d30-d65e-481b-9ac4-55f5ac03b24a",
          "validation-regex":
            "^[0-9A-T][0-9](((0|5)[0-9])|10|11|51|52)[0-9]{3}[A-W]$",
          "validation-logic": "AL_NID_check",
        },
      ],
    },
    be: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "nrn_number",
          label: "National Register Number",
          label_i18n: {
            en: "National Register Number",
          },
          widget: "anastasis_gtk_ia_nid_be",
          uuid: "0452f99a-06f7-48bd-8ac0-2e4ed9a24560",
          "validation-regex": "^[0-9]{11}$",
          "validation-logic": "BE_NRN_check",
        },
      ],
    },
    ch: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "ahv_number",
          label: "AHV number",
          label_i18n: {
            de_DE: "AHV-Nummer",
            de_CH: "AHV-Nummer",
          },
          widget: "anastasis_gtk_ia_ahv",
          uuid: "1da87570-ba16-4f62-8a7e-cbda92f51591",
          "validation-regex":
            "^(756)\\.[0-9]{4}\\.[0-9]{4}\\.[0-9]{2}|(756)[0-9]{10}$",
          "validation-logic": "CH_AHV_check",
          autocomplete: "???.????.????.??",
        },
      ],
    },
    cz: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "birth_number",
          label: "Birth Number",
          label_i18n: {
            en: "Birth Number",
            cz: "rodné číslo",
          },
          widget: "anastasis_gtk_ia_birthnumber_cz",
          uuid: "03e3a05b-1192-44f1-ac36-7425512eee1a",
          "validation-regex":
            "^[0-9]{2}(((0|2|5|7)[0-9])|10|11|31|32|51|52|81|82)/[0-9]{3}[0-9]?$",
          "validation-logic": "CZ_BN_check",
        },
      ],
    },
    de: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "social_security_number",
          label: "Social security number",
          label_i18n: {
            de_DE: "Deutsche Sozialversicherungsnummer",
            en: "German Social security number",
          },
          widget: "anastasis_gtk_ia_ssn_de",
          uuid: "d5e2aa79-1c88-4cf4-a4d2-252508b38e05",
          "validation-regex": "^[0-9]{8}[[:upper:]][0-9]{3}$",
          "validation-logic": "DE_SVN_check",
          optional: true,
        },
        {
          type: "string",
          name: "tax_number",
          label: "Taxpayer identification number",
          label_i18n: {
            de_DE: "Steuerliche Identifikationsnummer",
            en: "German taxpayer identification number",
          },
          widget: "anastasis_gtk_ia_tin_de",
          uuid: "dae48f85-e3ff-47a4-a4a3-ed981ed8c3c6",
          "validation-regex": "^[0-9]{11}$",
          "validation-logic": "DE_TIN_check",
        },
      ],
    },
    dk: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "cpr_number",
          label: "CPR-nummer",
          label_i18n: {
            en: "CPR Number",
            dk: "CPR-nummer",
          },
          widget: "anastasis_gtk_ia_cpr_dk",
          uuid: "38f13a4d-4302-4ada-ada1-c3ff4a8ff689",
          "validation-regex":
            "^(0[1-9]|[1-2][0-9]|30|31)((0[1-9]|10|11|12))[0-9]{2}-[0-9A-Z]{4}$",
        },
      ],
    },
    es: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "tax_number",
          label: "Tax number",
          label_i18n: {
            es_ES: "Número de Identificación Fiscal (DNI, NIE)",
          },
          widget: "anastasis_gtk_ia_es_dni",
          uuid: "ac8bd865-6be8-445c-b650-6a18eef16a49",
          "validation-regex": "^[0-9MXYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$",
          "validation-logic": "ES_DNI_check",
        },
        {
          type: "string",
          name: "ssn_number",
          label: "Social security number",
          label_i18n: {
            es_ES: "Número de Seguridad Social",
          },
          widget: "anastasis_gtk_ia_es_ssn",
          uuid: "22396a19-f3bb-497e-b63a-961fd639140e",
          "validation-regex": "^[0-9]{11}$",
        },
      ],
    },
    fr: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "social_security_number",
          label: "Code Insee",
          label_i18n: {
            fr_FR: "Code Insee",
            en: "INSEE code",
          },
          widget: "anastasis_gtk_ia_insee_fr",
          uuid: "2f36a81c-3f6d-41f3-97ee-9c885bc41873",
          "validation-regex": "^[0-9]{15}$",
          "validation-logic": "FR_INSEE_check",
        },
      ],
    },
    in: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "aadhar_number",
          label: "Aadhar number",
          label_i18n: {
            en: "Aadhar number",
          },
          widget: "anastasis_gtk_ia_aadhar_in",
          uuid: "55afe97a-98bc-48d1-bb37-a9658be3fdc9",
          "validation-regex": "^[2-9]{1}[0-9]{3}\\s[0-9]{4}\\s[0-9]{4}$",
          "validation-logic": "IN_AADHAR_check",
        },
      ],
    },
    it: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "fiscal_code",
          label: "Codice fiscale",
          label_i18n: {
            it: "Codice fiscale",
            en: "Fiscal code",
          },
          widget: "anastasis_gtk_ia_cf_it",
          uuid: "88f53c51-52ad-4d63-a163-ec042589f925",
          "validation-regex":
            "^[[:upper:]]{6}[0-9]{2}[A-EHLMPRT](([0-24-6][0-9])|(30|31|70|71))[A-MZ][0-9]{3}[A-Z]$",
          "validation-logic": "IT_CF_check",
        },
      ],
    },
    jp: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "my_number",
          label: "My number",
          label_i18n: {
            en: "My number",
            jp: "マイナンバー",
          },
          widget: "anastasis_gtk_ia_my_jp",
          uuid: "90848f42-a83e-4226-8186-329696c14152",
          "validation-regex": "^[0-9]{12}$",
        },
      ],
    },
    nl: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "social_security_number",
          label: "Citizen Service Number",
          label_i18n: {
            nl_NL: "Burgerservicenummer (BSN)",
            en: "Citizen Service Number",
          },
          widget: "anastasis_gtk_ia_ssn_nl",
          uuid: "b6bf1f14-1f85-4afb-af21-f54b88490bdc",
          "validation-regex": "^[1-9][0-9]{8}$",
          "validation-logic": "NL_BSN_check",
        },
      ],
    },
    sk: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "birth_number",
          label: "Birth Number",
          label_i18n: {
            en: "Birth Number",
            sk: "rodné číslo",
          },
          widget: "anastasis_gtk_ia_birthnumber_sk",
          uuid: "1cd372fe-2cea-4928-9f29-66f2bdd8555c",
          "validation-regex":
            "^[0-9]{2}(((0|2|5|7)[0-9])|10|11|31|32|51|52|81|82)/[0-9]{3}[0-9]?$",
          "validation-logic": "CZ_BN_check",
        },
      ],
    },
    us: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "birthplace",
          label: "Birthplace",
          widget: "anastasis_gtk_ia_birthplace",
          uuid: "4c822e8e-89c6-11eb-95c4-8b077ad8489f",
        },
        {
          type: "string",
          name: "social_security_number",
          label: "Social security number",
          label_i18n: {
            en: "US Social security number",
          },
          widget: "anastasis_gtk_ia_ssn_us",
          uuid: "310a138c-b0b7-4985-b8b8-d00e765e9f9b",
          "validation-regex": "^[0-9]{3}-[0-9]{2}-[0-9]{4}$",
          autocomplete: "???-??-????",
        },
      ],
    },
    xx: {
      license: "GPLv3+",
      "SPDX-License-Identifier": "GPL3.0-or-later",
      restricted: "xx",
      required_attributes: [
        {
          type: "string",
          name: "full_name",
          label: "Full name",
          widget: "anastasis_gtk_ia_full_name",
          uuid: "9e8f463f-575f-42cb-85f3-759559997331",
        },
        {
          type: "date",
          name: "birthdate",
          label: "Birthdate",
          widget: "anastasis_gtk_ia_birthdate",
          uuid: "83d655c7-bdb6-484d-904e-80c1058c8854",
        },
        {
          type: "string",
          name: "prime_number",
          label: "Prime number",
          widget: "anastasis_gtk_xx_prime",
          uuid: "39190a95-cacb-4412-8bae-1f7da3f980b4",
          "validation-regex": "^[0-9]+$",
          "validation-logic": "XY_PRIME_check",
          optional: true,
        },
        {
          type: "string",
          name: "sq_number",
          label: "Square number",
          widget: "anastasis_gtk_xx_square",
          uuid: "ed790bca-89bf-11eb-96f2-233996cf644e",
          "validation-regex": "^[0-9]+$",
          "validation-logic": "XX_SQUARE_check",
        },
      ],
    },
  },
};
