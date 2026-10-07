"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type SaveResult = { success?: boolean; error?: string } | void;
export type EventSaveFn = () => Promise<SaveResult>;

type EventSaveContextValue = {
  register: (id: string, save: EventSaveFn) => () => void;
  saveAll: () => Promise<void>;
  pending: boolean;
  status: "idle" | "ok" | "error";
};

const EventSaveContext = createContext<EventSaveContextValue | null>(null);

export function useEventSaveRegistration(id: string, save: EventSaveFn) {
  const ctx = useContext(EventSaveContext);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!ctx || !id) return;
    return ctx.register(id, () => saveRef.current());
  }, [ctx, id]);

  return { hideInlineSave: Boolean(ctx) };
}

export function EventSaveProvider({ children }: { children: ReactNode }) {
  const saversRef = useRef(new Map<string, EventSaveFn>());
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const router = useRouter();

  const register = useCallback((id: string, save: EventSaveFn) => {
    saversRef.current.set(id, save);
    return () => {
      saversRef.current.delete(id);
    };
  }, []);

  const saveAll = useCallback(async () => {
    setPending(true);
    setStatus("idle");
    let failed = false;
    try {
      for (const save of saversRef.current.values()) {
        const result = await save();
        if (result && result.error) failed = true;
        else if (result && result.success === false) failed = true;
      }
      router.refresh();
      setStatus(failed ? "error" : "ok");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }, [router]);

  return (
    <EventSaveContext.Provider value={{ register, saveAll, pending, status }}>
      {children}
    </EventSaveContext.Provider>
  );
}

function FloatingEventSaveButton() {
  const ctx = useContext(EventSaveContext);
  const t = useTranslations("Admin");
  if (!ctx) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="pointer-events-auto flex items-center gap-3">
        {ctx.status === "ok" && !ctx.pending && (
          <span className="rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-spruce shadow-md">
            {t("saveAllDone")}
          </span>
        )}
        {ctx.status === "error" && !ctx.pending && (
          <span className="rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-danger shadow-md">
            {t("saveAllError")}
          </span>
        )}
        <button
          type="button"
          onClick={() => void ctx.saveAll()}
          disabled={ctx.pending}
          className="rounded-full bg-ember px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {ctx.pending ? t("saveAllPending") : t("saveSubmitCta")}
        </button>
      </div>
    </div>
  );
}

export function EventSaveShell({ children }: { children: ReactNode }) {
  return (
    <EventSaveProvider>
      {children}
      <div className="h-24" aria-hidden />
      <FloatingEventSaveButton />
    </EventSaveProvider>
  );
}

export async function submitRegisteredForm(
  form: HTMLFormElement | null,
  action: (prev: { error?: string; success?: boolean }, fd: FormData) => Promise<{ error?: string; success?: boolean }>,
): Promise<{ error?: string; success?: boolean }> {
  if (!form) return { error: "invalid" };
  if (!form.checkValidity()) {
    form.reportValidity();
    return { error: "invalid" };
  }
  return action({}, new FormData(form));
}
