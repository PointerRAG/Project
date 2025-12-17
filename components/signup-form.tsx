"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { signup } from "@/server/users"
import { signIn } from "@/lib/auth-client"
export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create a New Account</CardTitle>
          <CardDescription>
            Enter the details to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup}>
            <FieldGroup>
                <Field>
                <FieldLabel htmlFor="email">Name</FieldLabel>
                <Input
                  id="Name"
                  name="name"
                  type="text"
                  
                />
              </Field>
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
                <Input id="password" name="password" type="password"  />
              </Field>
              <Field>
                <Button type="submit">Signup</Button>
                <Button variant="outline" type="button" onClick={signIn}>
                  Signup with Google
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <a href="#">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
