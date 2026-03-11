import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// server-side helper – require both URL and service role key because
// this endpoint needs elevated privileges (creating users, writing
// profiles).  Throw early if the variables are not configured so the
// error is obvious instead of bubbling up from SupabaseClient.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase configuration: make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment"
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name, subject, grade_level, school, region } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    // Create the user with the service role key so we can obtain the user id
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
    } as any);

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const userId = (createData as any)?.user?.id || (createData as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Failed to obtain user id" }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("profiles").insert([
      {
        id: userId,
        full_name: full_name || null,
        subject: subject || null,
        grade_level: grade_level || null,
        school: school || null,
        region: region || null,
      },
    ]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ userId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
