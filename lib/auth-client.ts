import { createAuthClient } from "better-auth/react"
import { toast } from "sonner";
export const authClient = createAuthClient({
    baseURL: "http://localhost:3000"
})


export const socialSignIn = async () => {
  const {error} = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/dashboard"
  });
  if(error){
    toast.error("Sign in was not successful")
  }
};