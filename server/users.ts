"use server"

import { auth } from "@/lib/auth"
import { success } from "better-auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export type SignInState = {   //defining the type for the signin state
    success: boolean
    message?: string
}
export async function signin(
    prevstate: SignInState,
    formdata: FormData): Promise<SignInState> {
    try {
        const email = String(formdata.get("email") || "");
        const password = String(formdata.get("password") || "");

        console.log("Attempting signin for email:", email);

        const result = await auth.api.signInEmail({
            body: {
                email,
                password,

            },
            headers: await headers(), // Required for session cookies!
        })

        console.log("Signin result:", result);
        redirect("/dashboard");
    }
    catch (error: any) {
        // redirect() throws a NEXT_REDIRECT error - we need to re-throw it
        if (error?.message === 'NEXT_REDIRECT') {
            throw error;
        }

        console.error("Signin error - Full details:", {
            error,
            message: error?.message,
            status: error?.status,
            response: error?.response,
            body: error?.body
        });
        return { success: false, message: "Invalid Credentials" }
    }
}


export async function signup(formdata: FormData) {
    const name = String(formdata.get("name") || "");
    const email = String(formdata.get("email") || "");
    const password = String(formdata.get("password") || "");

    await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,

        },
    })
    redirect("/dashboard");
}
