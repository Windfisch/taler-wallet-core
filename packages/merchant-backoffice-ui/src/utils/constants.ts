/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/

//https://tools.ietf.org/html/rfc8905
export const PAYTO_REGEX = /^payto:\/\/[a-zA-Z][a-zA-Z0-9-.]+(\/[a-zA-Z0-9\-\.\~\(\)@_%:!$&'*+,;=]*)*\??((amount|receiver-name|sender-name|instruction|message)=[a-zA-Z0-9\-\.\~\(\)@_%:!$'*+,;=]*&?)*$/
export const PAYTO_WIRE_METHOD_LOOKUP = /payto:\/\/([a-zA-Z][a-zA-Z0-9-.]+)\/.*/

export const AMOUNT_REGEX = /^[a-zA-Z][a-zA-Z]*:[0-9][0-9,]*\.?[0-9,]*$/

export const INSTANCE_ID_LOOKUP = /\/instances\/([^/]*)\/?$/

export const AMOUNT_ZERO_REGEX = /^[a-zA-Z][a-zA-Z]*:0$/

export const CROCKFORD_BASE32_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+[*~$=U]*$/

export const URL_REGEX = /^((https?:)(\/\/\/?)([\w]*(?::[\w]*)?@)?([\d\w\.-]+)(?::(\d+))?)\/$/

// how much rows we add every time user hit load more
export const PAGE_SIZE = 20
// how bigger can be the result set
// after this threshold, load more with move the cursor
export const MAX_RESULT_SIZE = PAGE_SIZE * 2 - 1;

// how much we will wait for all request, in seconds
export const DEFAULT_REQUEST_TIMEOUT = 10;

export const MAX_IMAGE_SIZE = 1024 * 1024;

export const INSTANCE_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.@-]+$/

export const COUNTRY_TABLE = {
  AE: "U.A.E.",
  AF: "Afghanistan",
  AL: "Albania",
  AM: "Armenia",
  AN: "Netherlands Antilles",
  AR: "Argentina",
  AT: "Austria",
  AU: "Australia",
  AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina",
  BD: "Bangladesh",
  BE: "Belgium",
  BG: "Bulgaria",
  BH: "Bahrain",
  BN: "Brunei Darussalam",
  BO: "Bolivia",
  BR: "Brazil",
  BT: "Bhutan",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Canada",
  CG: "Congo",
  CH: "Switzerland",
  CI: "Cote d'Ivoire",
  CL: "Chile",
  CM: "Cameroon",
  CN: "People's Republic of China",
  CO: "Colombia",
  CR: "Costa Rica",
  CS: "Serbia and Montenegro",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  DO: "Dominican Republic",
  DZ: "Algeria",
  EC: "Ecuador",
  EE: "Estonia",
  EG: "Egypt",
  ER: "Eritrea",
  ES: "Spain",
  ET: "Ethiopia",
  FI: "Finland",
  FO: "Faroe Islands",
  FR: "France",
  GB: "United Kingdom",
  GD: "Caribbean",
  GE: "Georgia",
  GL: "Greenland",
  GR: "Greece",
  GT: "Guatemala",
  HK: "Hong Kong",
  // HK: "Hong Kong S.A.R.",
  HN: "Honduras",
  HR: "Croatia",
  HT: "Haiti",
  HU: "Hungary",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IN: "India",
  IQ: "Iraq",
  IR: "Iran",
  IS: "Iceland",
  IT: "Italy",
  JM: "Jamaica",
  JO: "Jordan",
  JP: "Japan",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KH: "Cambodia",
  KR: "South Korea",
  KW: "Kuwait",
  KZ: "Kazakhstan",
  LA: "Laos",
  LB: "Lebanon",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  LY: "Libya",
  MA: "Morocco",
  MC: "Principality of Monaco",
  MD: "Moldava",
  // MD: "Moldova",
  ME: "Montenegro",
  MK: "Former Yugoslav Republic of Macedonia",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolia",
  MO: "Macau S.A.R.",
  MT: "Malta",
  MV: "Maldives",
  MX: "Mexico",
  MY: "Malaysia",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NZ: "New Zealand",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PH: "Philippines",
  PK: "Islamic Republic of Pakistan",
  PL: "Poland",
  PR: "Puerto Rico",
  PT: "Portugal",
  PY: "Paraguay",
  QA: "Qatar",
  RE: "Reunion",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SE: "Sweden",
  SG: "Singapore",
  SI: "Slovenia",
  SK: "Slovak",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SV: "El Salvador",
  SY: "Syria",
  TH: "Thailand",
  TJ: "Tajikistan",
  TM: "Turkmenistan",
  TN: "Tunisia",
  TR: "Turkey",
  TT: "Trinidad and Tobago",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Ukraine",
  US: "United States",
  UY: "Uruguay",
  VA: "Vatican",
  VE: "Venezuela",
  VN: "Viet Nam",
  YE: "Yemen",
  ZA: "South Africa",
  ZW: "Zimbabwe"
}

