import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters")
  .regex(
    /^[\p{L}\p{M}' -]+$/u,
    "Name can only include letters, spaces, apostrophes, and hyphens",
  );

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .transform((value) => value.toLowerCase())
  .pipe(z.email("Please enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(70, "Password must be at most 70 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type AuthFormValues = SignupInput;
export type AuthField = keyof AuthFormValues;
export type AuthMode = "login" | "signup";

export const authAllowedFieldsByMode: Record<AuthMode, AuthField[]> = {
  login: ["email", "password"],
  signup: ["name", "email", "password"],
};

export const authDefaultFieldsByMode: Record<AuthMode, AuthField[]> = {
  login: ["email", "password"],
  signup: ["name", "email", "password"],
};

export const authRequiredFieldsByMode: Record<AuthMode, AuthField[]> = {
  login: ["email", "password"],
  signup: ["name", "email", "password"],
};

export function parseLoginFormData(formData: FormData) {
  return loginSchema.safeParse({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
}

export function parseSignupFormData(formData: FormData) {
  return signupSchema.safeParse({
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
}

export type AuthFieldErrors = Partial<Record<keyof SignupInput, string>>;

export function getFirstFieldErrors(error: z.ZodError): AuthFieldErrors {
  const fieldErrors: AuthFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field as keyof SignupInput]) {
      fieldErrors[field as keyof SignupInput] = issue.message;
    }
  }

  return fieldErrors;
}
