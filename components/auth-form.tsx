"use client";

import { useActionState, useEffect, useMemo, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { socialSignIn } from "@/lib/auth-client";
import { signin, signup } from "@/server/users";
import {
  authAllowedFieldsByMode,
  authDefaultFieldsByMode,
  authRequiredFieldsByMode,
  loginSchema,
  signupSchema,
  type AuthField,
  type AuthFieldErrors,
  type AuthMode,
  type LoginInput,
  type SignupInput,
} from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AuthActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

const initialState: AuthActionState = { success: false };

type AuthFormProps = React.ComponentProps<"div"> & {
  mode: AuthMode;
  fields?: AuthField[];
};

type InternalFormProps = React.ComponentProps<"div"> & {
  fields?: AuthField[];
};

export function AuthForm({ mode, fields, className, ...props }: AuthFormProps) {
  if (mode === "signup") {
    return <SignupAuthForm fields={fields} className={className} {...props} />;
  }

  return <LoginAuthForm fields={fields} className={className} {...props} />;
}

function LoginAuthForm({ fields, className, ...props }: InternalFormProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(signin, initialState);

  const effectiveFields = useMemo(() => {
    const configured = fields?.length ? fields : authDefaultFieldsByMode.login;
    const requiredAndConfigured = Array.from(
      new Set([...authRequiredFieldsByMode.login, ...configured]),
    ) as AuthField[];

    return requiredAndConfigured.filter((field) =>
      authAllowedFieldsByMode.login.includes(field),
    );
  }, [fields]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const pending = isPending || isTransitionPending;

  useEffect(() => {
    if (!state.fieldErrors) {
      return;
    }

    for (const [fieldName, message] of Object.entries(state.fieldErrors)) {
      if (!message) {
        continue;
      }

      if (fieldName === "email" || fieldName === "password") {
        form.setError(fieldName as keyof LoginInput, {
          type: "server",
          message,
        });
      }
    }
  }, [form, state.fieldErrors]);

  const onSubmit = (values: LoginInput) => {
    const formData = new FormData();
    for (const field of effectiveFields) {
      if (field === "email" || field === "password") {
        formData.set(field, values[field]);
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  };

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
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {effectiveFields.includes("email") && (
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="m@example.com"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              {effectiveFields.includes("password") && (
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <div className="flex items-center">
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <a
                          href="#"
                          className="ml-auto text-sm underline-offset-4 hover:underline gap-2"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <Input
                        {...field}
                        id={field.name}
                        type="password"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Logging in..." : "Login"}
                </Button>
                <Button variant="outline" type="button" onClick={socialSignIn}>
                  Login with Google
                </Button>
                <FieldError className="text-center">{state.message}</FieldError>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SignupAuthForm({ fields, className, ...props }: InternalFormProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(signup, initialState);

  const effectiveFields = useMemo(() => {
    const configured = fields?.length ? fields : authDefaultFieldsByMode.signup;
    const requiredAndConfigured = Array.from(
      new Set([...authRequiredFieldsByMode.signup, ...configured]),
    ) as AuthField[];

    return requiredAndConfigured.filter((field) =>
      authAllowedFieldsByMode.signup.includes(field),
    );
  }, [fields]);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const pending = isPending || isTransitionPending;

  useEffect(() => {
    if (!state.fieldErrors) {
      return;
    }

    for (const [fieldName, message] of Object.entries(state.fieldErrors)) {
      if (!message) {
        continue;
      }

      if (
        fieldName === "name" ||
        fieldName === "email" ||
        fieldName === "password"
      ) {
        form.setError(fieldName as keyof SignupInput, {
          type: "server",
          message,
        });
      }
    }
  }, [form, state.fieldErrors]);

  const onSubmit = (values: SignupInput) => {
    const formData = new FormData();
    for (const field of effectiveFields) {
      formData.set(field, values[field]);
    }

    startTransition(() => {
      formAction(formData);
    });
  };

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
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {effectiveFields.includes("name") && (
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="text"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              {effectiveFields.includes("email") && (
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        placeholder="m@example.com"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              {effectiveFields.includes("password") && (
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <div className="flex items-center">
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <a
                          href="#"
                          className="ml-auto text-sm underline-offset-4 hover:underline gap-2"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <Input
                        {...field}
                        id={field.name}
                        type="password"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating account..." : "Sign up"}
                </Button>
                <Button variant="outline" type="button" onClick={socialSignIn}>
                  Sign up with Google
                </Button>
                <FieldError className="text-center">{state.message}</FieldError>
                <FieldDescription className="text-center">
                  Already have an account? <a href="/login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
