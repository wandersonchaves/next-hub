import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-sm normal-case",
          }
        }}
        path="/login"
        routing="path"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
