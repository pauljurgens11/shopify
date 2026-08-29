/**
 * The country list every customer form shares (C6). Owner: WS-C.
 *
 * Deliberately the same five countries the storefront ships to, in one place:
 * the address modal's `Country/region` select and the new-customer form's
 * phone-prefix select must never offer different countries.
 */
export type Country = {
  /** ISO-3166 alpha-2 — the `Select` value and the stored `countryCode`. */
  code: string;
  name: string;
  flag: string;
  /** E.164 calling code, kept with the `+`. */
  dialCode: string;
};

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
];

/** Options for the address modal's `Country/region` select. */
export const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  label: country.name,
  value: country.code,
}));

/**
 * Options for the narrow phone-prefix select. Shopify shows the flag alone;
 * we keep the dial code next to it so the value the field will save is
 * legible without opening the menu (US and CA both dial `+1`).
 */
export const PHONE_PREFIX_OPTIONS = COUNTRIES.map((country) => ({
  label: `${country.flag} ${country.dialCode}`,
  value: country.code,
}));

export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country.name]),
);

export const DIAL_CODES: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, country.dialCode]),
);
