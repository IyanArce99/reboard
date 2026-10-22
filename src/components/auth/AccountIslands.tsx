"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { deleteAccountAction, updateDisplayName, type ProfileState } from "@/app/cuenta/actions";
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

export function DeleteAccount() {
  const { signOut } = useUserState();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) {
    return (
      <button type="button" className={ui.btnNeutral} onClick={() => setOpen(true)}>
        Borrar mi cuenta
      </button>
    );
  }
  return (
    <form
      className={styles.row}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const r = await deleteAccountAction(text);
        setBusy(false);
        if (!r.ok) {
          setError(r.message);
          return;
        }
        await signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="borrar" className={ui.label}>
          Escribe BORRAR para confirmar
        </label>
        <input id="borrar" className={ui.input} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      </div>
      <button type="submit" className={ui.btnStrong} disabled={busy || text.trim().toUpperCase() !== "BORRAR"}>
        {busy ? "Borrando…" : "Borrar definitivamente"}
      </button>
      <p className={styles.error} role="alert" style={{ flexBasis: "100%" }}>
        {error}
      </p>
    </form>
  );
}
