import type {
  Archive,
  CadenceGateway,
  Position,
  Preferences,
  Song,
  StoredPreferences,
} from "@cadence/contracts";
import type { Session } from "@cadence/core";
import {
  getTuningPreset,
  parseChart,
  parseChord,
  TUNING_PRESETS,
} from "@cadence/music";
import {
  Button,
  ChordTimeline,
  Dialog,
  DialogBody,
  DirectionalGroup,
  Field,
  Fretboard,
  IconButton,
  Input,
  PracticeDock,
  ScrollArea,
  Select,
  Tabs,
  TabsContent,
  Textarea,
} from "@cadence/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Library,
  Moon,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PracticeController } from "./controller.ts";
import { useMicrophoneCheck } from "./microphone-check.ts";
import {
  InputBoost,
  MicrophoneOptions,
  readInputBoost,
} from "./microphone-options.tsx";
import { MicrophoneSetup } from "./microphone-setup.tsx";
import {
  createPreferenceWriter,
  type PreferenceWriteState,
} from "./preference-writes.ts";
import { ProgressWrites } from "./progress-writes.ts";
import { SoundCheck } from "./sound-check.tsx";
import { useTuner } from "./tuner.ts";
import { TuningPage } from "./tuning-page.tsx";

export { readInputBoost, TuningPage, useMicrophoneCheck, useTuner };
export type InitialData = {
  songs: Song[];
  preferences: StoredPreferences;
  position: Position | null;
};
type Panel = "library" | "import" | "settings" | "account";
function download(data: Archive) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "cadence.json";
  link.click();
  URL.revokeObjectURL(url);
}
export function PracticeApp({
  gateway,
  initial,
  account,
}: {
  gateway: CadenceGateway;
  initial: InitialData;
  account?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [preferenceState, setPreferenceState] = useState<PreferenceWriteState>({
    values: initial.preferences.values,
    status: "idle",
    error: "",
    dirty: false,
  });
  const [preferenceWriter] = useState(() =>
    createPreferenceWriter(gateway, initial.preferences, setPreferenceState),
  );
  useEffect(() => () => preferenceWriter.dispose(), [preferenceWriter]);
  const library = useQuery({
    queryKey: ["library"],
    queryFn: gateway.library,
    initialData: initial.songs,
  });
  const prefs = preferenceState.values;
  const preferenceError =
    preferenceState.status === "error" ? preferenceState.error : "";
  const [stepDirection, setStepDirection] = useState(1);
  const [tabDirection, setTabDirection] = useState(1);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState("");
  const [boostDb, setBoostDb] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [idle, setIdle] = useState(false);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [chart, setChart] = useState("");
  const [attribution, setAttribution] = useState("");
  const [editing, setEditing] = useState<Song | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [recoveringProgress, setRecoveringProgress] = useState(false);
  const [progressRecoveryError, setProgressRecoveryError] = useState("");
  const appElement = useRef<HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const positions = useRef(
    new Map<string, number>(
      initial.position
        ? [[initial.position.songId, initial.position.revision]]
        : [],
    ),
  );
  const [progressWrites] = useState(
    () =>
      new ProgressWrites<Session>(async (session) => {
        const position = await gateway.savePosition({
          songId: session.songId,
          songRevision: session.revision,
          index: session.index,
          completed: session.status === "completed",
          revision: positions.current.get(session.songId) ?? 0,
        });
        positions.current.set(position.songId, position.revision);
      }),
  );
  const progressSave = useSyncExternalStore(
    progressWrites.subscribe,
    progressWrites.getSnapshot,
    progressWrites.getSnapshot,
  );
  const selecting = useRef(0);
  const firstSong =
    initial.songs.find(
      (song) => song.id === initial.preferences.values.lastSongId,
    ) ??
    initial.songs.find((song) => song.id === "catalog:four") ??
    initial.songs[0];
  if (!firstSong) throw new Error("No practice music available");
  const fallbackSong: Song = firstSong;
  const [controller] = useState(() => {
    const instance = new PracticeController(
      firstSong,
      initial.preferences.values.loop,
      (session) => progressWrites.enqueue(session),
    );
    if (initial.position) instance.replace(firstSong, initial.position.index);
    return instance;
  });
  const { session, busy, error } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const activeSong =
    library.data.find((song) => song.id === session.songId) ?? firstSong;
  const chord = parseChord(
    session.chords[session.index] ?? "C",
    prefs.tuning || "standard",
  );
  const recommendedPreset = getTuningPreset(activeSong.tuning || "standard");
  const currentPreset = getTuningPreset(prefs.tuning || "standard");
  const tuningMismatch = recommendedPreset.id !== currentPreset.id;
  const shape =
    chord.voicings.find((shape) => shape.id === prefs.voicings[chord.symbol]) ??
    chord.voicings[0];
  const listening =
    session.status === "listening" || session.status === "transitioning";
  const preferenceBusy = preferenceState.status === "saving";
  const saveMutation = useMutation({
    mutationFn: () =>
      gateway.saveSong({
        title,
        chart,
        attribution,
        tuning: editing?.tuning ?? "standard",
        ...(editing ? { id: editing.id, revision: editing.revision } : {}),
      }),
    onSuccess: async (song) => {
      await queryClient.invalidateQueries({ queryKey: ["library"] });
      setEditing(null);
      setTitle("");
      setChart("");
      setPreview([]);
      await selectSong(song);
    },
    onError: (error: Error) => setFormError(error.message),
  });
  useEffect(
    () =>
      controller.subscribeMeter(() => {
        appElement.current?.style.setProperty(
          "--signal",
          String(Math.min(1, controller.getMeter().level * 8)),
        );
      }),
    [controller],
  );
  useEffect(() => {
    try {
      const savedDevice = localStorage.getItem("cadence-device") ?? "";
      setDevice(savedDevice);
      setBoostDb(readInputBoost(savedDevice));
      setSetupComplete(localStorage.getItem("cadence-setup") === "1");
    } catch {}
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        prefs.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : prefs.theme;
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("cadence-theme", prefs.theme);
      } catch {}
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [prefs.theme]);
  useEffect(() => {
    controller.loop(prefs.loop);
  }, [controller, prefs.loop]);
  useEffect(() => {
    if (session.status !== "transitioning") return;
    const timer = setTimeout(
      () => {
        setStepDirection(1);
        controller.finish(session.epoch);
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350,
    );
    return () => clearTimeout(timer);
  }, [controller, session.status, session.epoch]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      if (!panel && !setupOpen && !devicesOpen)
        timer = setTimeout(() => {
          if (!document.activeElement?.matches(":focus-visible")) setIdle(true);
        }, 4000);
    };
    for (const event of ["pointermove", "pointerdown", "keydown", "focusin"])
      window.addEventListener(event, wake, { passive: true });
    wake();
    return () => {
      clearTimeout(timer);
      for (const event of ["pointermove", "pointerdown", "keydown", "focusin"])
        window.removeEventListener(event, wake);
    };
  }, [panel, setupOpen, devicesOpen]);
  useEffect(() => {
    controller.activate();
    const onHide = () => {
      if (document.hidden) controller.pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      selecting.current++;
      controller.dispose();
    };
  }, [controller]);
  useEffect(() => {
    const refresh = () => {
      void controller
        .devices()
        .then(setDevices)
        .catch(() => {});
    };
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", refresh);
  }, [controller]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        panel ||
        setupOpen ||
        devicesOpen ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLButtonElement
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!setupComplete && !listening) {
          controller.pause();
          setSetupOpen(true);
        } else void controller.toggle(device, prefs.profile, boostDb);
      }
      if (event.key === "ArrowRight") {
        setStepDirection(1);
        controller.navigate(session.index + 1);
      }
      if (event.key === "ArrowLeft") {
        setStepDirection(-1);
        controller.navigate(session.index - 1);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    controller,
    panel,
    setupOpen,
    setupComplete,
    boostDb,
    listening,
    devicesOpen,
    device,
    prefs.profile,
    session.index,
  ]);
  function openPanel(next: Panel) {
    controller.pause();
    setDevicesOpen(false);
    setFormError("");
    setPanel(next);
  }
  async function useSavedPosition() {
    if (recoveringProgress || progressSave.saving) return;
    const songId = controller.getSnapshot().session.songId;
    const pending = progressWrites.pendingFor(songId);
    if (!pending) return;
    const request = ++selecting.current;
    controller.pause();
    setRecoveringProgress(true);
    setProgressRecoveryError("");
    try {
      const songs = await gateway.library();
      const song =
        songs.find((song) => song.id === songId) ??
        songs.find((song) => song.id === "catalog:four") ??
        songs[0];
      if (!song) throw new Error("No saved music is available.");
      const position = await gateway.position(song.id);
      if (request !== selecting.current) return;
      if (position && position.songRevision !== song.revision)
        throw new Error("The music changed while loading. Try again.");
      if (!progressWrites.discard(songId, pending))
        throw new Error("Your position changed while loading. Try again.");
      positions.current.set(song.id, position?.revision ?? 0);
      queryClient.setQueryData(["library"], songs);
      controller.replace(song, position?.index ?? 0);
      if (song.id !== songId)
        controller.setError("This song was removed. Default music is ready.");
      setFormError("");
      setPanel(null);
    } catch (error) {
      if (request === selecting.current)
        setProgressRecoveryError(
          error instanceof Error
            ? error.message
            : "Could not load saved progress. Try again.",
        );
    } finally {
      setRecoveringProgress(false);
    }
  }
  async function selectSong(song: Song) {
    const request = ++selecting.current;
    controller.pause();
    try {
      if (!(await progressWrites.settled())) {
        setFormError("Retry saving your progress before changing songs.");
        return;
      }
      const position = await gateway.position(song.id);
      if (request !== selecting.current) return;
      positions.current.set(song.id, position?.revision ?? 0);
      controller.replace(song, position?.index ?? 0);
      if (!(await preferenceWriter.update({ lastSongId: song.id })))
        throw new Error(preferenceWriter.getState().error);
      setPanel(null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not load the song",
      );
    }
  }
  async function removeSong(song: Song) {
    try {
      await gateway.deleteSong(song.id, song.revision);
      await queryClient.invalidateQueries({ queryKey: ["library"] });
      setConfirmDelete(null);
      if (song.id === session.songId) {
        const fallback =
          library.data.find((item) => item.id === "catalog:four") ??
          fallbackSong;
        await selectSong(fallback);
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not delete the song",
      );
    }
  }
  function setPreference<K extends keyof Preferences>(
    name: K,
    value: Preferences[K],
  ) {
    void preferenceWriter.update({ [name]: value });
  }
  function changeBoost(value: number) {
    controller.pause();
    setBoostDb(value);
    try {
      localStorage.setItem(`cadence-input-boost:${device}`, String(value));
    } catch {}
  }
  async function toggleDevices() {
    controller.pause();
    setDevicesOpen(!devicesOpen);
    try {
      setDevices(await controller.devices());
    } catch (error) {
      controller.setError(
        error instanceof Error ? error.message : "No microphone available",
      );
    }
  }
  function review() {
    try {
      setPreview(parseChart(chart).chords);
      setFormError("");
    } catch (error) {
      setPreview([]);
      setFormError(error instanceof Error ? error.message : "Invalid chart");
    }
  }
  async function importFile(file: File | undefined, archive: boolean) {
    if (!file) return;
    if (file.size > (archive ? 10_485_760 : 1_048_576)) {
      setFormError("This file is too large.");
      return;
    }
    try {
      const contents = await file.text();
      if (archive) {
        if (preferenceState.dirty)
          throw new Error("Save your settings before restoring an archive.");
        await gateway.importData(JSON.parse(contents));
        await queryClient.invalidateQueries({ queryKey: ["library"] });
        if (!(await preferenceWriter.discard()))
          throw new Error(preferenceWriter.getState().error);
        setFormError("");
      } else {
        setChart(contents);
        setPreview([]);
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to import this file",
      );
    }
  }
  return (
    <main
      ref={appElement}
      className={`app relative h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,var(--glow),var(--paper)_70%)] text-foreground ${idle ? "is-idle" : ""} ${prefs.diagramSize === "large" ? "large-diagram" : ""}`}
    >
      <header className="toolbar idle-ui absolute inset-x-0 top-0 z-2 flex items-center justify-between px-8 py-[26px] transition-[opacity,visibility] duration-650 [.is-idle_&]:pointer-events-none [.is-idle_&]:invisible [.is-idle_&]:opacity-0 max-[600px]:px-6 max-[600px]:py-[22px] short-landscape:px-6 short-landscape:py-3">
        <span className="wordmark font-[Georgia,serif] text-[25px] tracking-[-1px]">
          cadence
        </span>
        <div className="header-actions flex gap-2">
          <IconButton
            label="Switch color theme"
            disabled={preferenceBusy}
            onClick={() =>
              setPreference(
                "theme",
                document.documentElement.dataset.theme === "dark"
                  ? "light"
                  : "dark",
              )
            }
          >
            <Moon className="moon-icon dark:hidden" />
            <Sun className="sun-icon hidden dark:block" />
          </IconButton>
          <IconButton
            label="Open settings"
            onClick={() => openPanel("settings")}
          >
            <SlidersHorizontal />
          </IconButton>
        </div>
      </header>
      <DirectionalGroup
        transitionKey={`${session.sessionId}:${session.index}`}
        direction={stepDirection}
        className="practice-sequence pointer-events-none absolute inset-0"
        frameClassName="sequence-frame pointer-events-none absolute inset-0 data-[current=false]:pointer-events-none"
      >
        <section
          className={`stage flex h-[calc(100%-190px)] items-center justify-center gap-[clamp(40px,10vw,170px)] px-[70px] pt-[86px] max-[600px]:h-[calc(100%-180px-env(safe-area-inset-bottom))] max-[600px]:flex-col max-[600px]:gap-[18px] max-[600px]:px-5 max-[600px]:pt-[72px] max-[600px]:pb-2 short-landscape:h-[calc(100%-140px)] short-landscape:flex-row short-landscape:gap-[65px] short-landscape:px-[60px] short-landscape:pt-[35px] ${session.status === "transitioning" ? "matched animate-match" : ""}`}
          aria-label="Practice stage"
        >
          <h1 className="chord min-w-[1.45em] pr-[0.08em] text-center font-[Georgia,serif] text-[clamp(110px,19vw,270px)] leading-none tracking-[-0.085em] [.matched_&]:text-[var(--success)] max-[600px]:min-w-0 max-[600px]:text-[clamp(76px,23vw,108px)] short-landscape:text-[130px]">
            {chord.symbol}
          </h1>
          {shape ? (
            <Fretboard
              shape={shape}
              symbol={chord.symbol}
              hand={prefs.hand}
              numbers={prefs.numbers}
            />
          ) : null}
        </section>
        <ChordTimeline chords={session.chords} index={session.index} />
      </DirectionalGroup>
      {session.index > 0 ? (
        <button
          type="button"
          className="step-arrow previous idle-ui absolute top-[calc((100%-130px)/2+30px)] left-8 grid size-[52px] -translate-y-1/2 place-items-center border-0 bg-transparent text-muted-foreground transition-[opacity,visibility] duration-650 hover:text-primary active:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [.is-idle_&]:pointer-events-none [.is-idle_&]:invisible [.is-idle_&]:opacity-0 max-[600px]:top-[calc((100%-122px)/2+28px)] max-[600px]:left-2 max-[600px]:size-11 short-landscape:left-8"
          aria-label="Previous chord"
          onClick={() => {
            setStepDirection(-1);
            controller.navigate(session.index - 1);
          }}
        >
          <ChevronLeft />
        </button>
      ) : null}
      {session.index < session.chords.length - 1 ? (
        <button
          type="button"
          className="step-arrow next idle-ui absolute top-[calc((100%-130px)/2+30px)] right-8 grid size-[52px] -translate-y-1/2 place-items-center border-0 bg-transparent text-muted-foreground transition-[opacity,visibility] duration-650 hover:text-primary active:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [.is-idle_&]:pointer-events-none [.is-idle_&]:invisible [.is-idle_&]:opacity-0 max-[600px]:top-[calc((100%-122px)/2+28px)] max-[600px]:right-2 max-[600px]:size-11 short-landscape:right-8"
          aria-label="Next chord"
          onClick={() => {
            setStepDirection(1);
            controller.navigate(session.index + 1);
          }}
        >
          <ChevronRight />
        </button>
      ) : null}
      {setupOpen ? (
        <MicrophoneSetup
          hand={prefs.hand}
          device={device}
          devices={devices}
          profile={prefs.profile}
          boostDb={boostDb}
          onBoost={changeBoost}
          saving={preferenceBusy}
          onHand={(hand) => setPreference("hand", hand)}
          onDevice={(id) => {
            setDevice(id);
            setBoostDb(readInputBoost(id));
            try {
              localStorage.setItem("cadence-device", id);
            } catch {}
          }}
          onAccess={() => {
            void controller
              .devices()
              .then(setDevices)
              .catch(() => {});
          }}
          onClose={() => setSetupOpen(false)}
          onComplete={() => {
            setSetupComplete(true);
            setSetupOpen(false);
            try {
              localStorage.setItem("cadence-setup", "1");
            } catch {}
          }}
        />
      ) : null}
      <PracticeDock
        listening={listening}
        busy={busy}
        devicesOpen={devicesOpen}
        onToggle={() => {
          setDevicesOpen(false);
          if (!setupComplete && !listening) {
            controller.pause();
            setSetupOpen(true);
            return;
          }
          void controller
            .toggle(device, prefs.profile, boostDb)
            .then(async () => setDevices(await controller.devices()))
            .catch((error: unknown) =>
              controller.setError(
                error instanceof Error
                  ? error.message
                  : "Could not list microphone inputs",
              ),
            );
        }}
        onDevices={() => void toggleDevices()}
        deviceContent={
          <>
            <label htmlFor="input-device">Microphone input</label>
            <Select
              id="input-device"
              disabled={busy}
              label="Microphone input"
              value={device}
              onChange={(event) => {
                controller.pause();
                setDevice(event.target.value);
                setBoostDb(readInputBoost(event.target.value));
                try {
                  localStorage.setItem("cadence-device", event.target.value);
                } catch {}
                void controller
                  .prepare(
                    event.target.value,
                    prefs.profile,
                    readInputBoost(event.target.value),
                  )
                  .then(() => controller.devices())
                  .then(setDevices)
                  .catch(() => {});
              }}
            >
              <MicrophoneOptions device={device} devices={devices} />
            </Select>
            <InputBoost value={boostDb} onChange={changeBoost} />
          </>
        }
        onLibrary={() => openPanel("library")}
        onTuner={() => {
          window.location.href = "/tuning";
        }}
        tuningMismatch={tuningMismatch}
        tuningTitle={
          tuningMismatch
            ? `Tuning mismatch: song recommends ${recommendedPreset.name} (${currentPreset.name} active)`
            : "Guitar tuner"
        }
      />
      {progressSave.error && !panel ? (
        <div
          className="toast absolute top-[82px] left-1/2 z-4 flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-[var(--white)] px-3 py-2 text-[13px] max-[600px]:top-[72px]"
          role="alert"
        >
          <span>
            {progressRecoveryError ||
              "Progress hasn’t saved. Keep this page open."}
          </span>
          <IconButton
            label="Retry saving progress"
            disabled={progressSave.saving || recoveringProgress}
            onClick={() => {
              setProgressRecoveryError("");
              void progressWrites.retry();
            }}
          >
            <RotateCcw />
          </IconButton>
          <IconButton
            label="Use saved position"
            disabled={progressSave.saving || recoveringProgress}
            onClick={() => void useSavedPosition()}
          >
            <Download />
          </IconButton>
        </div>
      ) : preferenceError && !panel ? (
        <div
          className="toast absolute top-[82px] left-1/2 z-4 flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-[var(--white)] px-3 py-2 text-[13px] max-[600px]:top-[72px]"
          role="alert"
        >
          <span>Settings haven’t saved. Keep this page open and retry.</span>
          <IconButton
            label="Retry saving settings"
            disabled={preferenceBusy}
            onClick={() => void preferenceWriter.retry()}
          >
            <RotateCcw />
          </IconButton>
        </div>
      ) : error ? (
        <div
          className="toast absolute top-[82px] left-1/2 z-4 flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-[var(--white)] px-3 py-2 text-[13px] max-[600px]:top-[72px]"
          role="alert"
        >
          {error}
          <IconButton
            label="Dismiss message"
            onClick={() => controller.setError("")}
          >
            <X />
          </IconButton>
        </div>
      ) : null}
      <Dialog
        open={session.status === "completed"}
        onOpenChange={(open) => {
          if (!open) controller.pause();
        }}
        title="A little better, every time."
      >
        <DialogBody>
          <p>You finished {activeSong.title}.</p>
          <div className="actions mt-6 flex flex-wrap gap-2.5">
            <Button onClick={() => controller.restart()}>
              <RotateCcw />
              Repeat
            </Button>
            <Button
              className="primary !border-foreground !bg-foreground !text-[var(--white)] hover:!bg-primary hover:!text-background"
              onClick={() => openPanel("library")}
            >
              <Library />
              Choose music
            </Button>
          </div>
        </DialogBody>
      </Dialog>

      <div className="sr-only" aria-live="polite">
        {chord.symbol}, chord {session.index + 1} of {session.chords.length}
      </div>
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title="Delete this song?"
      >
        <DialogBody>
          <p>The song and its saved position will be removed.</p>
          <div className="actions mt-6 flex flex-wrap gap-2.5">
            <Button onClick={() => setConfirmDelete(null)}>Keep song</Button>
            <Button
              className="primary !border-foreground !bg-foreground !text-[var(--white)] hover:!bg-primary hover:!text-background"
              onClick={() => {
                const song = library.data.find(
                  (song) => song.id === confirmDelete,
                );
                if (song) void removeSong(song);
              }}
            >
              Confirm delete
            </Button>
          </div>
        </DialogBody>
      </Dialog>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
        title="Your practice"
      >
        <Tabs
          label="Practice settings"
          className="h-[min(740px,calc(100dvh-140px))] shrink-0"
          listClassName="tabs mx-7 mb-6 max-[480px]:mx-5 max-[480px]:mb-6 max-[480px]:[&_[data-slot=tabs-trigger]]:min-h-[60px] max-[480px]:[&_[data-slot=tabs-trigger]]:flex-col max-[480px]:[&_[data-slot=tabs-trigger]]:gap-1.5 max-[480px]:[&_[data-slot=tabs-trigger]]:px-[3px] max-[480px]:[&_[data-slot=tabs-trigger]]:py-2.5 max-[480px]:[&_[data-slot=tabs-trigger]]:text-[11px]"
          value={panel ?? "library"}
          options={[
            { value: "library", label: "Music", icon: Library },
            { value: "import", label: "Import", icon: Upload },
            { value: "settings", label: "Setup", icon: Settings2 },
            { value: "account", label: "Account", icon: UserRound },
          ]}
          onChange={(value) => {
            const tabs = ["library", "import", "settings", "account"];
            setTabDirection(
              tabs.indexOf(value) >= tabs.indexOf(panel ?? "library") ? 1 : -1,
            );
            setPanel(value as Panel);
            setFormError("");
          }}
        >
          <TabsContent
            value={panel ?? "library"}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ScrollArea
              scrollKey={panel ?? "library"}
              viewportClassName="panel-body px-7 pb-7 max-[480px]:px-5 max-[480px]:pb-6 [&_h2]:mb-5 [&_h2]:font-[Georgia,serif] [&_h2]:text-[30px] [&_h2]:leading-[1.15] [&_h2]:tracking-[-0.7px] max-[480px]:[&_h2]:text-[28px] [&_p]:mb-5 [&_p]:text-sm [&_p]:leading-[1.65] [&_p]:text-muted-foreground"
            >
              <DirectionalGroup
                transitionKey={panel ?? "closed"}
                direction={tabDirection}
                className="panel-motion grid min-h-0"
                frameClassName="panel-frame col-start-1 row-start-1 min-w-0 data-[current=false]:pointer-events-none"
              >
                {panel === "library" ? (
                  <>
                    <Field label="Search music">
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search your library"
                      />
                    </Field>
                    {library.data
                      .filter(
                        (song) =>
                          song.title
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          song.chords.some((chord) =>
                            chord.toLowerCase().includes(search.toLowerCase()),
                          ),
                      )
                      .map((song) => (
                        <div
                          className="song flex items-center gap-3 border-b border-border"
                          key={song.id}
                        >
                          <button
                            type="button"
                            className="song-select min-h-[72px] flex-1 border-0 bg-transparent py-[18px] text-left text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_strong]:text-[15px] [&_strong]:font-medium [&_small]:mt-[7px] [&_small]:block [&_small]:text-xs [&_small]:leading-normal [&_small]:text-muted-foreground"
                            onClick={() => void selectSong(song)}
                          >
                            <strong>{song.title}</strong>
                            <small>
                              {song.catalog ? "Default · " : "Your music · "}
                              {song.chords.slice(0, 8).join(" · ")}
                              {song.chords.length > 8 ? " …" : ""}
                            </small>
                          </button>
                          {song.catalog ? (
                            <IconButton
                              label={`Copy ${song.title}`}
                              onClick={() => {
                                setEditing(null);
                                setTitle(`${song.title} copy`);
                                setChart(
                                  song.sourceChart || song.chords.join(" "),
                                );
                                setAttribution(song.attribution);
                                setPreview([]);
                                setPanel("import");
                              }}
                            >
                              <Copy />
                            </IconButton>
                          ) : (
                            <>
                              <IconButton
                                label={`Edit ${song.title}`}
                                onClick={() => {
                                  setEditing(song);
                                  setTitle(song.title);
                                  setChart(
                                    song.sourceChart || song.chords.join(" "),
                                  );
                                  setAttribution(song.attribution);
                                  setPreview([]);
                                  setPanel("import");
                                }}
                              >
                                <Settings2 />
                              </IconButton>
                              <IconButton
                                label={`Delete ${song.title}`}
                                onClick={() => setConfirmDelete(song.id)}
                              >
                                <Trash2 />
                              </IconButton>
                            </>
                          )}
                        </div>
                      ))}
                    <div className="actions mt-6 flex flex-wrap gap-2.5">
                      <Button
                        onClick={() => {
                          controller.restart();
                          setPanel(null);
                        }}
                      >
                        <RotateCcw />
                        Restart {activeSong.title}
                      </Button>
                    </div>
                  </>
                ) : null}
                {panel === "import" ? (
                  <>
                    <Field label="Song title">
                      <Input
                        value={title}
                        maxLength={100}
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </Field>
                    <Field label="Chord chart">
                      <Textarea
                        value={chart}
                        onChange={(event) => {
                          setChart(event.target.value);
                          setPreview([]);
                        }}
                        placeholder="C G Am F"
                      />
                    </Field>
                    <Field label="Attribution">
                      <Input
                        value={attribution}
                        maxLength={500}
                        onChange={(event) => setAttribution(event.target.value)}
                      />
                    </Field>
                    <Field label="Or open a text / ChordPro file">
                      <Input
                        type="file"
                        accept=".txt,.cho,.chopro,.chordpro,text/plain"
                        onChange={(event) =>
                          void importFile(event.target.files?.[0], false)
                        }
                      />
                    </Field>
                    <p>
                      Use chord names, bracketed chords in lyrics, or |: repeat
                      sections :|. Unsupported chords are flagged before saving.
                    </p>
                    {preview.length ? (
                      <section
                        className="import-preview my-4 font-[Georgia,serif] text-2xl leading-[1.6] [overflow-wrap:anywhere]"
                        aria-label="Import preview"
                      >
                        {preview.slice(0, 30).join(" · ")}
                        {preview.length > 30 ? " …" : ""}
                      </section>
                    ) : null}
                    <div className="actions mt-6 flex flex-wrap gap-2.5">
                      <Button onClick={review}>Review chart</Button>
                      <Button
                        className="primary !border-foreground !bg-foreground !text-[var(--white)] hover:!bg-primary hover:!text-background"
                        disabled={
                          !preview.length ||
                          !title.trim() ||
                          saveMutation.isPending
                        }
                        onClick={() => saveMutation.mutate()}
                      >
                        Save music
                      </Button>
                      {editing ? (
                        <Button
                          onClick={() => {
                            setEditing(null);
                            setTitle("");
                            setChart("");
                            setPreview([]);
                          }}
                        >
                          Cancel edit
                        </Button>
                      ) : null}
                      {editing ? (
                        <>
                          <Button
                            onClick={() => {
                              setTitle(`${title} copy`);
                              setEditing(null);
                            }}
                          >
                            <Copy />
                            Save as a copy
                          </Button>
                          <Button
                            onClick={() =>
                              download({
                                version: 1,
                                preferences: prefs,
                                songs: [
                                  {
                                    title,
                                    chart,
                                    attribution,
                                    tuning: editing?.tuning ?? "standard",
                                  },
                                ],
                              })
                            }
                          >
                            <Download />
                            Export this song
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}
                {panel === "settings" ? (
                  <>
                    <PreferenceRow
                      title="Guitar tuning"
                      detail="Active guitar tuning for chord voicings"
                      label="Guitar tuning"
                      value={prefs.tuning || "standard"}
                      disabled={preferenceBusy}
                      choices={TUNING_PRESETS.map((p) => p.id)}
                      labels={TUNING_PRESETS.map((p) => p.name)}
                      onChange={(value) => setPreference("tuning", value)}
                    />
                    <div className={preferenceRowClassName}>
                      <strong>
                        Instrument tuner
                        <small>Open interactive guitar tuner</small>
                      </strong>
                      <a
                        href="/tuning"
                        className="pill inline-flex min-h-[46px] items-center justify-center justify-self-start gap-[9px] rounded-[30px] border border-border bg-[var(--white)] px-[18px] py-3 text-[13px] hover:bg-accent hover:text-foreground active:bg-accent active:text-foreground min-[700px]:justify-self-end"
                      >
                        Open tuner
                      </a>
                    </div>
                    <PreferenceRow
                      title="Handedness"
                      detail="Mirror the fretboard"
                      label="Handedness"
                      value={prefs.hand}
                      disabled={preferenceBusy}
                      choices={["right", "left"]}
                      onChange={(value) =>
                        setPreference("hand", value as Preferences["hand"])
                      }
                    />
                    <PreferenceRow
                      title="Finger numbers"
                      detail="A little guidance on each string"
                      label="Finger numbers"
                      value={String(prefs.numbers)}
                      disabled={preferenceBusy}
                      choices={["true", "false"]}
                      labels={["Show", "Hide"]}
                      onChange={(value) =>
                        setPreference("numbers", value === "true")
                      }
                    />
                    <PreferenceRow
                      title="Chord matching"
                      detail="How carefully to check each strum"
                      label="Chord matching"
                      value={prefs.profile}
                      disabled={preferenceBusy}
                      choices={["gentle", "balanced", "precise"]}
                      onChange={(value) =>
                        setPreference(
                          "profile",
                          value as Preferences["profile"],
                        )
                      }
                    />
                    <PreferenceRow
                      title="At the end"
                      detail="Practice at your own pace"
                      label="At the end"
                      value={String(prefs.loop)}
                      disabled={preferenceBusy}
                      choices={["true", "false"]}
                      labels={["Repeat", "Finish"]}
                      onChange={(value) =>
                        setPreference("loop", value === "true")
                      }
                    />
                    <PreferenceRow
                      title="Appearance"
                      detail="Choose your light"
                      label="Appearance"
                      value={prefs.theme}
                      disabled={preferenceBusy}
                      choices={["system", "light", "dark"]}
                      onChange={(value) =>
                        setPreference("theme", value as Preferences["theme"])
                      }
                    />
                    <PreferenceRow
                      title="Diagram size"
                      detail="A closer look at the strings"
                      label="Diagram size"
                      value={prefs.diagramSize}
                      disabled={preferenceBusy}
                      choices={["standard", "large"]}
                      onChange={(value) =>
                        setPreference(
                          "diagramSize",
                          value as Preferences["diagramSize"],
                        )
                      }
                    />
                    {chord.voicings.length > 1 ? (
                      <PreferenceRow
                        title={`${chord.symbol} fingering`}
                        detail="Recognition checks pitch content"
                        label="Fingering"
                        value={shape?.id ?? ""}
                        disabled={preferenceBusy}
                        choices={chord.voicings.map((shape) => shape.id)}
                        labels={chord.voicings.map((shape) =>
                          shape.id.endsWith(":open")
                            ? "Open position"
                            : `Fret ${shape.baseFret}`,
                        )}
                        onChange={(value) =>
                          setPreference("voicings", {
                            ...prefs.voicings,
                            [chord.symbol]: value,
                          })
                        }
                      />
                    ) : null}
                    <SoundCheck
                      key={`${device}:${prefs.profile}:${boostDb}`}
                      device={device}
                      profile={prefs.profile}
                      boostDb={boostDb}
                      onBoost={changeBoost}
                    />
                  </>
                ) : null}
                {panel === "account"
                  ? (account ?? (
                      <>
                        <div className="actions mt-6 flex flex-wrap gap-2.5">
                          <Button
                            onClick={() =>
                              void gateway
                                .exportData()
                                .then(download)
                                .catch((error: Error) =>
                                  setFormError(error.message),
                                )
                            }
                          >
                            <Download />
                            Export my data
                          </Button>
                        </div>
                        <Field label="Restore a Cadence export">
                          <Input
                            type="file"
                            accept=".json,application/json"
                            onChange={(event) =>
                              void importFile(event.target.files?.[0], true)
                            }
                          />
                        </Field>
                        <p>
                          Restore adds copies of the imported songs and replaces
                          your preferences.
                        </p>
                      </>
                    ))
                  : null}
                {preferenceError ? (
                  <div
                    className="error my-3 text-[13px] leading-normal text-[#ae563d] empty:hidden"
                    role="alert"
                  >
                    <p>
                      Settings haven’t saved. Your changes still apply here.
                    </p>
                    <Button
                      disabled={preferenceBusy}
                      onClick={() => void preferenceWriter.retry()}
                    >
                      <RotateCcw />
                      Retry saving settings
                    </Button>
                    <Button
                      disabled={preferenceBusy}
                      onClick={() => void preferenceWriter.discard()}
                    >
                      Use saved settings
                    </Button>
                    <p>Using saved settings replaces your unsaved changes.</p>
                  </div>
                ) : null}
                {progressSave.error ? (
                  <div
                    className="error my-3 text-[13px] leading-normal text-[#ae563d] empty:hidden"
                    role="alert"
                  >
                    <p>{progressRecoveryError || "Progress hasn’t saved."}</p>
                    <Button
                      disabled={progressSave.saving || recoveringProgress}
                      onClick={async () => {
                        setProgressRecoveryError("");
                        if (await progressWrites.retry()) setFormError("");
                      }}
                    >
                      <RotateCcw />
                      Retry saving progress
                    </Button>
                    <Button
                      disabled={progressSave.saving || recoveringProgress}
                      onClick={() => void useSavedPosition()}
                    >
                      <Download />
                      Use saved position
                    </Button>
                    <p>
                      Using the saved position replaces unsaved progress and
                      pauses the microphone.
                    </p>
                  </div>
                ) : null}
                {formError ? (
                  <div
                    className="error my-3 text-[13px] leading-normal text-[#ae563d] empty:hidden"
                    role="alert"
                  >
                    {formError}
                  </div>
                ) : null}
              </DirectionalGroup>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Dialog>
    </main>
  );
}
const preferenceRowClassName =
  "row grid min-w-0 grid-cols-1 gap-3 border-b border-border py-[18px] min-[700px]:grid-cols-[minmax(0,1fr)_180px] min-[700px]:items-center min-[700px]:gap-6 min-[700px]:py-5 [&_strong]:min-w-0 [&_strong]:text-sm [&_strong]:font-medium [&_small]:mt-[5px] [&_small]:block [&_small]:text-xs [&_small]:leading-normal [&_small]:text-muted-foreground";

function PreferenceRow({
  title,
  detail,
  label,
  value,
  choices,
  labels,
  disabled,
  onChange,
}: {
  title: string;
  detail: string;
  label: string;
  value: string;
  choices: string[];
  labels?: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={preferenceRowClassName}>
      <strong>
        {title}
        <small>{detail}</small>
      </strong>
      <Select
        label={label}
        wrapperClassName="w-full"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {choices.map((choice, index) => (
          <option value={choice} key={choice}>
            {labels?.[index] ?? choice[0]?.toUpperCase() + choice.slice(1)}
          </option>
        ))}
      </Select>
    </div>
  );
}
