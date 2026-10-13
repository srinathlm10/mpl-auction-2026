import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Signed in is not enough – the email must be on the admins allow-list.
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

  return (
    <>
      <AdminNav email={user.email} />
      <main className="container-page py-6 sm:py-8">{children}</main>
    </>
  );
}
