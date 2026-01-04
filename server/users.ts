"use server"

import { auth } from "@/lib/auth"
import { success } from "better-auth"
import { redirect } from "next/navigation"

export type SignInState = {   //defining the type for the signin state
    success : boolean
    message? : string
}
export async function signin(
    prevstate : SignInState,
    formdata : FormData) : Promise<SignInState>{
        try{
            const email = String(formdata.get("email")||"");
            const password = String(formdata.get("password")||"");

            await auth.api.signInEmail({
                body : {
                    email,
                    password,   

                },
            })
            return{success:true}
        }
        catch(error){
            return {success : false, message: "Invalid Credentials"}
        }
    }
    

export async function signup(formdata : FormData){
    const name = String(formdata.get("name")||"");
    const email = String(formdata.get("email")||"");
    const password = String(formdata.get("password")||"");

    await auth.api.signUpEmail({
        body : {
            name,
            email,
            password,

        },
    })
    redirect("\dashboard");
}





