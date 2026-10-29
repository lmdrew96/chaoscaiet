import { redirect } from "next/navigation";
import { ownerFromCookies } from "@/lib/auth";
import { LoginForm } from "./login-form";

const LoginPage = async (): Promise<React.ReactNode> => {
  if (await ownerFromCookies()) redirect("/");
  return (
    <main className="mx-auto max-w-sm px-4 pt-[12vh]">
      <div className="card p-6">
        <h1 className="m-0 mb-5 font-serif text-2xl font-semibold">ChaosCaiet</h1>
        <LoginForm />
      </div>
    </main>
  );
};

export default LoginPage;
