import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
