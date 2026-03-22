import { AuthForm } from "@/components/auth-form";

export default function Page() {
  return (
    <div className="h-dvh w-full overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-6 md:p-10 py-12">
        <div className="w-full max-w-sm">
          <AuthForm mode="login" />
        </div>
      </div>
    </div>
  );
}
