"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getFirstFieldErrors,
  parseLoginFormData,
  parseSignupFormData,
  type AuthFieldErrors,
} from "@/lib/validation/auth";

export type SignInState = {
  //defining the type for the signin state
  success: boolean;
  message?: string;
  fieldErrors?: AuthFieldErrors;
};
export async function signin(
  prevstate: SignInState,
  formdata: FormData,
): Promise<SignInState> {
  try {
    const parsed = parseLoginFormData(formdata);

    if (!parsed.success) {
      return {
        success: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: getFirstFieldErrors(parsed.error),
      };
    }

    const { email, password } = parsed.data;

    console.log("Attempting signin for email:", email);

    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(), // Required for session cookies!
    });

    console.log("Signin result:", result);
    redirect("/chat");
  } catch (error: any) {
    // redirect() throws a NEXT_REDIRECT error - we need to re-throw it
    if (error?.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error("Signin error - Full details:", {
      error,
      message: error?.message,
      status: error?.status,
      response: error?.response,
      body: error?.body,
    });
    return { success: false, message: "Invalid credentials" };
  }
}

export type SignUpState = {
  success: boolean;
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

export async function signup(
  prevstate: SignUpState,
  formdata: FormData,
): Promise<SignUpState> {
  const parsed = parseSignupFormData(formdata);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: getFirstFieldErrors(parsed.error),
    };
  }

  const { name, email, password } = parsed.data;

  try {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });
    redirect("/chat");
  } catch (error: any) {
    console.error("Signup error - Full details:", {
      error,
      message: error?.message,
      status: error?.status,
      response: error?.response,
      body: error?.body,
    });

    return {
      success: false,
      message: "Could not create account. Please try again.",
    };
  }
}
