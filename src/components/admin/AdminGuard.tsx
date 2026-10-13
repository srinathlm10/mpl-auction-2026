import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { signOut } from "@/app/admin/actions";

/**
 * Wraps every admin screen: needs Supabase, a signed-in user, and that user's
 * email in the `admins` table. (The database enforces the same rule, so this is
 * for a friendly message, not the only protection.)
 */
export async function AdminGuard({ children }: { children: (user: { email?: string }) => React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main className="container-page flex min-h-[70vh] items-center justify-center py-10">
        <div className="card max-w-md p-8 text-center">
          <h1 className="font-display text-3xl font-bold uppercase">Not authorised</h1>
          <p className="mt-2 text-muted">
            {user.email} is signed in but is not on the admin list. Add the email to the <code>admins</code> table in Supabase.
          </p>
          <form action={signOut} className="mt-5">
            <button type="submit" className="btn-primary">Sign out</button>
          </form>
        </div>
      </main>
    );
  }

  return <>{children({ email: user.email })}</>;
}
