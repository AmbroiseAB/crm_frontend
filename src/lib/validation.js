import {getCountries, getCountryCallingCode, parsePhoneNumberFromString} from "libphonenumber-js";

export const PHONE_COUNTRIES = getCountries()
  .map((country) => [country, `+${getCountryCallingCode(country)}`, country])
  .sort(([first], [second]) => first.localeCompare(second));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,128}$/u;

export const normalizeName = (value) => value.trim().replace(/\s+/gu, " ");
export const normalizeEmail = (value) => value.trim().toLowerCase();
export const nameValidation = (label = "Name") => (value) => {
  const name = normalizeName(value || "");
  if (!name) return `${label} is required`;
  if (name.length < 2) return `${label} must be at least 2 characters`;
  if (name.length > 100) return `${label} cannot exceed 100 characters`;
  return NAME_PATTERN.test(name) || `${label} may contain letters, spaces, apostrophes, hyphens, and periods only`;
};
export const emailValidation = (required = false) => (value) => {
  const email = normalizeEmail(value || "");
  if (!email) return required ? "Email is required" : true;
  return (email.length <= 254 && EMAIL_PATTERN.test(email)) || "Please provide a valid email address";
};
export const passwordValidation = (value) => PASSWORD_PATTERN.test(value || "") || "Password must be 8-128 characters and include uppercase, lowercase, number, and special character";
export const phoneValidation = (country) => (value) => {
  if (!value?.trim()) return true;
  const parsed = parsePhoneNumberFromString(value.trim(), country);
  return parsed?.isValid() || "Please provide a valid phone number for the selected country";
};