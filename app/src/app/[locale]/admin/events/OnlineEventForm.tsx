"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormField } from "@/components/FormField";
import { SelectField } from "@/components/SelectField";
import { createOnlineEventAction, updateOnlineEventAction, type OnlineActionState } from "./onlineEventActions";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export type OnlineEventDefaults = {
  year: number;
  dateISO: Date;
  challengeWindowEnd: Date;
  registrationDeadline: Date;
  status: string;
  isFeatured: boolean;
  price: number;
  maxSlots: number | null;
  coverImageUrl: string | null;
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Черновик" },
  { value: "OPEN", label: "Регистрация открыта" },
  { value: "CLOSED", label: "Регистрация закрыта" },
  { value: "COMPLETED", label: "Завершён" },
] as const;

type Props =
  | {
      mode: "create";
      locale: string;
      races: { id: string; name: string }[];
      onCreated?: (eventId: string) => void;
      submitLabel?: string;
    }
  | {
      mode: "edit";
      eventId: string;
      races: { id: string; name: string }[];
      currentRaceId: string;
      raceName: string;
      defaults: OnlineEventDefaults;
      submitLabel?: string;
    };

const initialState: OnlineActionState = {};

export function OnlineEventForm(props: Props) {
  const boundAction =
    props.mode === "create"
      ? createOnlineEventAction.bind(null, props.locale)
      : updateOnlineEventAction.bind(null, props.eventId);

  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const d = props.mode === "edit" ? props.defaults : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(d?.coverImageUrl ?? null);

  useEffect(() => {
    if (state.eventId && props.mode === "create" && props.onCreated) {
      props.onCreated(state.eventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.eventId]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-ember/25 bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ember/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-ember">
          Онлайн-челлендж
        </span>
      </div>

      {props.mode === "create" ? (
        <SelectField
          label="Трасса"
          name="raceId"
          required
          options={props.races.map((r) => ({ value: r.id, label: r.name }))}
        />
      ) : (
        <>
          <SelectField
            label="Трасса"
            name="raceId"
            required
            defaultValue={props.currentRaceId}
            options={props.races.map((r) => ({ value: r.id, label: r.name }))}
          />
          <FormField
            label="Переименовать трассу (опционально)"
            name="raceName"
            type="text"
            optional
            defaultValue={props.raceName}
          />
        </>
      )}

      <FormField
        label="Год"
        name="year"
        type="number"
        required
        defaultValue={d ? String(d.year) : undefined}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Дата начала"
          name="dateISO"
          type="date"
          required
          defaultValue={d ? toDateInputValue(d.dateISO) : undefined}
        />
        <FormField
          label="Дата окончания"
          name="challengeWindowEnd"
          type="date"
          required
          defaultValue={d?.challengeWindowEnd ? toDateInputValue(d.challengeWindowEnd) : undefined}
        />
      </div>
      <p className="mt-[-8px] text-xs text-ink-faint">
        Результаты Strava принимаются в этом диапазоне дат включительно.
      </p>

      <FormField
        label="Дедлайн регистрации"
        name="registrationDeadline"
        type="date"
        required
        defaultValue={d ? toDateInputValue(d.registrationDeadline) : undefined}
      />

      <SelectField
        label="Статус"
        name="status"
        required
        defaultValue={d?.status ?? "DRAFT"}
        options={[...STATUS_OPTIONS]}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Стоимость участия, ₸"
          name="price"
          type="number"
          required
          placeholder="например: 3000"
          defaultValue={d ? String(d.price) : undefined}
        />
        <FormField
          label="Макс. участников"
          name="maxSlots"
          type="number"
          optional
          placeholder="без лимита"
          defaultValue={d?.maxSlots != null ? String(d.maxSlots) : undefined}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={d?.isFeatured ?? false}
          className="h-4 w-4 cursor-pointer accent-ember"
        />
        <span className="font-semibold text-ink-soft">Показывать на главной странице</span>
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-baseline gap-1.5 font-semibold text-ink-soft">
          Обложка
          <span className="text-xs font-normal text-ink-faint">опционально</span>
        </span>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="обложка" className="h-32 w-full rounded-[var(--radius-s)] object-cover" />
        )}
        <input
          ref={fileInputRef}
          name="coverImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPreviewUrl(URL.createObjectURL(f));
          }}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-ember/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-ember"
        />
        {d?.coverImageUrl && (
          <input type="hidden" name="currentCoverImageUrl" value={d.coverImageUrl} />
        )}
        <span className="text-xs text-ink-faint">JPEG, PNG или WebP · макс. 5 МБ</span>
        {(state.error === "invalidType" || state.error === "tooLarge") && (
          <p className="text-xs text-danger">
            {state.error === "tooLarge" ? "Файл слишком большой (макс. 5 МБ)" : "Только JPEG, PNG или WebP"}
          </p>
        )}
      </div>

      {state.success && <p className="text-sm text-spruce">Сохранено</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">Проверьте заполненные поля</p>}
      {state.error === "duplicate" && (
        <p className="text-sm text-danger">Событие с таким годом для этой трассы уже существует</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? "…" : (props.submitLabel ?? (props.mode === "create" ? "Создать" : "Сохранить"))}
      </button>
    </form>
  );
}
