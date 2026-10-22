"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { updateDisplayName, type ProfileState } from "@/app/cuenta/actions";
import { useUserState } from "@/components/user/UserStateProvider";
import ui from "@/styles/ui.module.css";
import styles from "./Auth.module.css";

export function ProfileForm({ initialName }: { initialName: string }) {
  const { setAccountName } = useUserState();
  const [state, action, pending] = useActionState(async (prev: ProfileState, form: FormData) => {
    const res = await updateDisplayName(prev, form);
    if (res.ok && res.name) setAccountName(res.name);
    return res;
  }, { ok: false, message: "" });

  return (
    <form action={action} className={styles.row}>
      <div>
        <label htmlFor="display-name" className={ui.label}>
          Nombre visible
        </label>
        <input
          id="display-name"
          name="displayName"
          defaultValue={initialName}
          required
          minLength={2}
          maxLength={40}
          autoComplete="nickname"
          className={ui.input}
        />
      </div>
      <button type="submit" className={ui.btnStrong} disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
      <p className={state.ok ? styles.ok : styles.error} role="status" style={{ flexBasis: "100%" }}>
        {state.message}
      </p>
    </form>
  );
}

export function SignOutButton() {
  const { signOut } = useUserState();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={ui.btnNeutral}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      {busy ? "Saliendo…" : "Salir"}
    </button>
  );
}
