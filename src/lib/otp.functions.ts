import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Mocked SMS OTP. Real SMS delivery plugs in behind the same functions later.
// In dev, the code is returned in the response so users can complete the flow
// without an SMS provider. In production, we do NOT leak the code.
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid phone number in international format (e.g. +919000000000)");

const requestSchema = z.object({ phone: phoneSchema });
const verifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPin } = await import("./pin.server");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = hashPin(code);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin.from("otp_codes").insert({
      phone: data.phone,
      code_hash,
      expires_at,
    });
    if (error) throw new Error(error.message);

    const isProd = process.env.NODE_ENV === "production";
    console.log(`[OTP] phone=${data.phone} code=${code} expires=${expires_at}`);
    return {
      ok: true,
      // Only expose the code outside production so the flow is testable.
      devCode: isProd ? undefined : code,
    };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPinHash } = await import("./pin.server");

    const { data: rows, error } = await supabaseAdmin
      .from("otp_codes")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("phone", data.phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) return { ok: false, reason: "No OTP requested for this number" as const };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, reason: "Code expired" as const };
    }
    if (row.attempts >= 5) return { ok: false, reason: "Too many attempts" as const };

    const good = verifyPinHash(data.code, row.code_hash);
    if (!good) {
      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false, reason: "Incorrect code" as const };
    }
    await supabaseAdmin
      .from("otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true as const };
  });
