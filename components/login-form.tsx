"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { useActionState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signin, SignInState } from "@/server/users"
import { socialSignIn } from "@/lib/auth-client"

const initialState: SignInState = {
  success: false
}
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const [state, formAction, isPending] = useActionState(
    signin,
    initialState
  )

  useEffect(() => {
    if (state.success) {
      // Redirect will be handled by server-side action
      // This effect can be used for additional client-side actions if needed
    }
  }, [state])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"

                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline gap-2 "
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" name="password" type="password" />
              </Field>
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Logging in..." : "Login"}
                </Button>
                <Button variant="outline" type="submit" onClick={socialSignIn}>
                  Login with Google
                </Button>
                {state.message && (
                  <p className="text-sm text-destructive text-center mt-2">{state.message}</p>
                )}
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
