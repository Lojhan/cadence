import type {
  Archive,
  CadenceGateway,
  Position,
  Preferences,
  Song,
  StoredPreferences,
} from "@cadence/contracts";
import type { Session } from "@cadence/core";
import { parseChart, parseChord } from "@cadence/music";
import {
  Button,
  ChordTimeline,
  Dialog,
  DirectionalGroup,
  Fretboard,
  IconButton,
  PracticeDock,
  Select,
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
import {
  InputBoost,
  MicrophoneOptions,
  readInputBoost,
} from "./microphone-options.tsx";
import { MicrophoneSetup } from "./microphone-setup.tsx";
import { ProgressWrites } from "./progress-writes.ts";
import { SoundCheck } from "./sound-check.tsx";
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
  const [preferenceDraft, setPreferenceDraft] =
    useState<StoredPreferences | null>(null);
  const [preferenceError, setPreferenceError] = useState("");
  const library = useQuery({
    queryKey: ["library"],
    queryFn: gateway.library,
    initialData: initial.songs,
  });
  const preferences = useQuery({
    queryKey: ["preferences"],
    queryFn: gateway.preferences,
    initialData: initial.preferences,
    enabled: preferenceDraft === null,
  });
  const prefs = (preferenceDraft ?? preferences.data).values;
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
  const chord = parseChord(session.chords[session.index] ?? "C");
  const shape =
    chord.voicings.find((shape) => shape.id === prefs.voicings[chord.symbol]) ??
    chord.voicings[0];
  const listening =
    session.status === "listening" || session.status === "transitioning";
  const preferenceMutation = useMutation({
    scope: { id: "preferences" },
    // Attempt once even offline, so failed changes have an explicit retry path.
    networkMode: "always",
    retry: false,
    onMutate: async (values: StoredPreferences) => {
      setPreferenceDraft(values);
      await queryClient.cancelQueries({ queryKey: ["preferences"] });
    },
    mutationFn: (input: StoredPreferences) => gateway.savePreferences(input),
    onSuccess: (next, values) => {
      queryClient.setQueryData(["preferences"], next);
      setPreferenceDraft((draft) => (draft === values ? null : draft));
      setPreferenceError("");
    },
    onError: (error: Error) => setPreferenceError(error.message),
  });
  const restorePreferences = useMutation({
    scope: { id: "preferences" },
    networkMode: "always",
    retry: false,
    mutationFn: (_discarded: StoredPreferences) => gateway.preferences(),
    onSuccess: (next, discarded) => {
      queryClient.setQueryData(["preferences"], next);
      setPreferenceDraft((draft) => (draft === discarded ? null : draft));
      setPreferenceError("");
    },
    onError: (error: Error) => setPreferenceError(error.message),
  });
  const preferenceBusy =
    preferenceMutation.isPending || restorePreferences.isPending;
  const saveMutation = useMutation({
    mutationFn: () =>
      gateway.saveSong({
        title,
        chart,
        attribution,
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
      await preferenceMutation.mutateAsync({
        values: { ...prefs, lastSongId: song.id },
        revision: (preferenceDraft ?? preferences.data).revision,
      });
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
    preferenceMutation.mutate({
      values: { ...prefs, [name]: value },
      revision: (preferenceDraft ?? preferences.data).revision,
    });
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
        if (preferenceDraft)
          throw new Error("Save your settings before restoring an archive.");
        await gateway.importData(JSON.parse(contents));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["library"] }),
          queryClient.invalidateQueries({ queryKey: ["preferences"] }),
        ]);
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
      className={`app ${idle ? "is-idle" : ""} ${prefs.diagramSize === "large" ? "large-diagram" : ""} ${(progressSave.error || preferenceError || error) && !panel ? "has-notice" : ""}`}
    >
      <header className="toolbar idle-ui">
        <span className="wordmark">cadence</span>
        <div className="header-actions">
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
            <Moon className="moon-icon" />
            <Sun className="sun-icon" />
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
        className="practice-sequence"
        frameClassName="sequence-frame"
      >
        <section
          className={`stage ${session.status === "transitioning" ? "matched" : ""}`}
          aria-label="Practice stage"
        >
          <h1 className="chord">{chord.symbol}</h1>
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
          className="step-arrow previous idle-ui"
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
          className="step-arrow next idle-ui"
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
        onLibrary={() => openPanel("library")}
      />
      {devicesOpen ? (
        <div className="device-panel">
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
        </div>
      ) : null}
      {progressSave.error && !panel ? (
        <div className="toast" role="alert">
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
        <div className="toast" role="alert">
          <span>Settings haven’t saved. Keep this page open and retry.</span>
          <IconButton
            label="Retry saving settings"
            disabled={preferenceBusy}
            onClick={() =>
              preferenceDraft && preferenceMutation.mutate(preferenceDraft)
            }
          >
            <RotateCcw />
          </IconButton>
        </div>
      ) : error ? (
        <div className="toast" role="alert">
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
        <div className="panel-body">
          <p>You finished {activeSong.title}.</p>
          <div className="actions">
            <Button onClick={() => controller.restart()}>
              <RotateCcw />
              Repeat
            </Button>
            <Button className="primary" onClick={() => openPanel("library")}>
              <Library />
              Choose music
            </Button>
          </div>
        </div>
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
        <div className="panel-body">
          <p>The song and its saved position will be removed.</p>
          <div className="actions">
            <Button onClick={() => setConfirmDelete(null)}>Keep song</Button>
            <Button
              className="primary"
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
        </div>
      </Dialog>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
        title="Your practice"
      >
        <nav className="tabs" aria-label="Practice settings">
          {(
            [
              ["library", Library, "Music"],
              ["import", Upload, "Import"],
              ["settings", Settings2, "Setup"],
              ["account", UserRound, "Account"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              aria-current={panel === key ? "page" : undefined}
              onClick={() => {
                const tabs = ["library", "import", "settings", "account"];
                setTabDirection(
                  tabs.indexOf(key) >= tabs.indexOf(panel ?? "library")
                    ? 1
                    : -1,
                );
                setPanel(key);
                setFormError("");
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <DirectionalGroup
          transitionKey={panel ?? "closed"}
          direction={tabDirection}
          className="panel-body panel-motion"
          frameClassName="panel-frame"
        >
          {panel === "library" ? (
            <>
              <label className="field">
                <span>Search music</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search your library"
                />
              </label>
              {library.data
                .filter(
                  (song) =>
                    song.title.toLowerCase().includes(search.toLowerCase()) ||
                    song.chords.some((chord) =>
                      chord.toLowerCase().includes(search.toLowerCase()),
                    ),
                )
                .map((song) => (
                  <div className="song" key={song.id}>
                    <button
                      type="button"
                      className="song-select"
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
                          setChart(song.sourceChart || song.chords.join(" "));
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
                            setChart(song.sourceChart || song.chords.join(" "));
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
              <div className="actions">
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
              <label className="field">
                <span>Song title</span>
                <input
                  value={title}
                  maxLength={100}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Chord chart</span>
                <textarea
                  value={chart}
                  onChange={(event) => {
                    setChart(event.target.value);
                    setPreview([]);
                  }}
                  placeholder="C G Am F"
                />
              </label>
              <label className="field">
                <span>Attribution</span>
                <input
                  value={attribution}
                  maxLength={500}
                  onChange={(event) => setAttribution(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Or open a text / ChordPro file</span>
                <input
                  type="file"
                  accept=".txt,.cho,.chopro,.chordpro,text/plain"
                  onChange={(event) =>
                    void importFile(event.target.files?.[0], false)
                  }
                />
              </label>
              <p>
                Use chord names, bracketed chords in lyrics, or |: repeat
                sections :|. Unsupported chords are flagged before saving.
              </p>
              {preview.length ? (
                <section className="import-preview" aria-label="Import preview">
                  {preview.slice(0, 30).join(" · ")}
                  {preview.length > 30 ? " …" : ""}
                </section>
              ) : null}
              <div className="actions">
                <Button onClick={review}>Review chart</Button>
                <Button
                  className="primary"
                  disabled={
                    !preview.length || !title.trim() || saveMutation.isPending
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
                          songs: [{ title, chart, attribution }],
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
                onChange={(value) => setPreference("numbers", value === "true")}
              />
              <PreferenceRow
                title="Chord matching"
                detail="How carefully to check each strum"
                label="Chord matching"
                value={prefs.profile}
                disabled={preferenceBusy}
                choices={["gentle", "balanced", "precise"]}
                onChange={(value) =>
                  setPreference("profile", value as Preferences["profile"])
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
                onChange={(value) => setPreference("loop", value === "true")}
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
                  <div className="actions">
                    <Button
                      onClick={() =>
                        void gateway
                          .exportData()
                          .then(download)
                          .catch((error: Error) => setFormError(error.message))
                      }
                    >
                      <Download />
                      Export my data
                    </Button>
                  </div>
                  <label className="field">
                    <span>Restore a Cadence export</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(event) =>
                        void importFile(event.target.files?.[0], true)
                      }
                    />
                  </label>
                  <p>
                    Restore adds copies of the imported songs and replaces your
                    preferences.
                  </p>
                </>
              ))
            : null}
          {preferenceError ? (
            <div className="error" role="alert">
              <p>Settings haven’t saved. Your changes still apply here.</p>
              <Button
                disabled={preferenceBusy}
                onClick={() =>
                  preferenceDraft && preferenceMutation.mutate(preferenceDraft)
                }
              >
                <RotateCcw />
                Retry saving settings
              </Button>
              <Button
                disabled={preferenceBusy}
                onClick={() =>
                  preferenceDraft && restorePreferences.mutate(preferenceDraft)
                }
              >
                Use saved settings
              </Button>
              <p>Using saved settings replaces your unsaved changes.</p>
            </div>
          ) : null}
          {progressSave.error ? (
            <div className="error" role="alert">
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
                Using the saved position replaces unsaved progress and pauses
                the microphone.
              </p>
            </div>
          ) : null}
          {formError ? (
            <div className="error" role="alert">
              {formError}
            </div>
          ) : null}
        </DirectionalGroup>
      </Dialog>
    </main>
  );
}
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
    <div className="row">
      <strong>
        {title}
        <small>{detail}</small>
      </strong>
      <Select
        label={label}
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
