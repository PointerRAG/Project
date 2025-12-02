"use server"

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function signin(formdata : FormData){
    const email = String(formdata.get("email")||"");
    const password = String(formdata.get("password")||"");
   
    try{
        await auth.api.signInEmail({
        body : {
            email,
            password,   

        },
    })
    }
    catch(error : any){
        console.error(error);
        return{error: "Login failed"};
    }
    redirect("/dashboard")
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





