import { z } from "zod";

// Phone validation (accepts standard formats, length between 8 and 15 digits)
export const phoneSchema = z
  .string()
  .min(1, { message: "Phone number is required" })
  .refine(
    (val) => {
      const clean = val.replace(/\D/g, "");
      return clean.length >= 8 && clean.length <= 15;
    },
    { message: "Phone number must contain between 8 and 15 digits" }
  );

// Aadhaar validation (must be exactly 12 digits if provided, or empty if optional)
export const aadhaarSchema = z.string().refine(
  (val) => {
    if (!val) return true; // Optional choice
    const clean = val.replace(/\D/g, "");
    return clean.length === 12;
  },
  { message: "Aadhaar number must be exactly 12 digits" }
);

// Date of Birth validation (valid YYYY-MM-DD format and must not be in the future)
export const dobSchema = z.string().refine(
  (val) => {
    if (!val) return true; // Optional dob
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    return date <= new Date(); // cannot be in the future
  },
  { message: "Date of birth cannot be in the future" }
);

// Age validation (integer between 0 and 120)
export const ageSchema = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const parsed = parseInt(String(val), 10);
    return isNaN(parsed) ? val : parsed;
  },
  z
    .number()
    .int({ message: "Age must be a whole number" })
    .min(0, { message: "Age cannot be negative" })
    .max(120, { message: "Age cannot exceed 120 years" })
);

// Patient name validation
export const nameSchema = z
  .string()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name is too long" })
  .refine(
    (val) => {
      // Must contain at least some alphabets or characters (non-only space/numbers)
      return val.trim().length > 0;
    },
    { message: "Name cannot be empty" }
  );

// Complete patient registration schema
export const patientRegistrationSchema = z.object({
  fullName: nameSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  age: ageSchema,
  gender: z.string().min(1, { message: "Gender is required" }),
  contactNumber: phoneSchema,
  email: z.string().email({ message: "Invalid email address" }).or(z.literal("")),
  address: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  isGovEmployee: z.boolean().optional(),
  photoUrl: z.string().optional(),
  uniqueId: z.string().optional(),
  preferredLanguage: z.enum(["english", "telugu"]),
  preexistingConditions: z.string().optional(),
  currentSymptoms: z.string().optional(),
  consentGiven: z.boolean().refine(val => val === true, {
    message: "You must consent to registration data storage to proceed",
  }),
  consentTimestamp: z.string().optional(),
  consentVersion: z.string().optional(),
});
