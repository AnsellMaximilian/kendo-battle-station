import { App, clipboard, ipcMain, nativeImage } from "electron";
import Store from "electron-store";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { CHANNELS } from "../../shared/channels";
import type {
  Clip,
  ClipSummary,
  ClipType,
  ClipUpsert,
} from "../../shared/types";

interface ClipStoreData {
  clips: Record<string, Clip>;
}

interface ClipboardContent {
  type: ClipType;
  text?: string;
  html?: string;
  imageDataUrl?: string;
  imageBuffer?: Buffer;
  filePath?: string;
  hash: string;
}

const emptyHash = "__empty__";

class ClipboardRepository {
  private store: Store<ClipStoreData>;
  private clips: Record<string, Clip>;
  private hashIndex = new Map<string, string>();
  private clipsDir: string;

  constructor(private readonly userDataDir: string) {
    this.store = new Store<ClipStoreData>({ name: "clipboard" });
    this.clips = this.store.get("clips", {});
    this.clipsDir = path.join(this.userDataDir, "clips");

    for (const clip of Object.values(this.clips)) {
      if (clip.hash) {
        this.hashIndex.set(clip.hash, clip.id);
      }
    }
  }

  async ensureDirectories() {
    await fs.mkdir(this.clipsDir, { recursive: true });
  }

  getAll(): ClipSummary[] {
    return Object.values(this.clips).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  findById(id: string): Clip | undefined {
    return this.clips[id];
  }

  findByHash(hash: string): Clip | undefined {
    const id = this.hashIndex.get(hash);
    return id ? this.clips[id] : undefined;
  }

  async createClip(content: ClipboardContent): Promise<Clip> {
    const now = Date.now();
    const id = randomUUID();
    let imagePath: string | undefined;
    const imagePreview = content.imageDataUrl;

    if (content.type === "image" && content.imageBuffer) {
      await this.ensureDirectories();
      imagePath = path.join(this.clipsDir, `${id}.png`);
      try {
        await fs.writeFile(imagePath, content.imageBuffer);
      } catch (error) {
        console.error("Failed to persist clipboard image", error);
        imagePath = undefined;
      }
    }

    const clip: Clip = {
      id,
      type: content.type,
      createdAt: now,
      updatedAt: now,
      text: content.text,
      html: content.html,
      imagePath,
      imagePreview,
      filePath: content.filePath,
      tags: [],
      favorite: false,
      hash: content.hash,
    };

    this.clips[id] = clip;
    if (content.hash && content.hash !== emptyHash) {
      this.hashIndex.set(content.hash, id);
    }
    this.persist();
    return clip;
  }

  async refreshClip(existing: Clip, replacement?: Partial<ClipboardContent>) {
    const now = Date.now();
    const clip = this.clips[existing.id];
    if (!clip) {
      return;
    }
    clip.updatedAt = now;
    if (replacement?.text) {
      clip.text = replacement.text;
    }
    if (replacement?.html) {
      clip.html = replacement.html;
    }
    if (replacement?.imageBuffer && replacement.hash) {
      await this.ensureDirectories();
      const imagePath = path.join(this.clipsDir, `${clip.id}.png`);
      try {
        await fs.writeFile(imagePath, replacement.imageBuffer);
        clip.imagePath = imagePath;
        clip.imagePreview = replacement.imageDataUrl;
        clip.hash = replacement.hash;
        this.hashIndex.set(replacement.hash, clip.id);
      } catch (error) {
        console.error("Failed to refresh clipboard image", error);
      }
    }
    this.persist();
  }

  async deleteClip(id: string) {
    const clip = this.clips[id];
    if (!clip) {
      return;
    }
    if (clip.imagePath) {
      try {
        await fs.unlink(clip.imagePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn("Failed to delete clip image", error);
        }
      }
    }
    if (clip.hash) {
      this.hashIndex.delete(clip.hash);
    }
    delete this.clips[id];
    this.persist();
  }

  async setTags(id: string, tags: string[]) {
    const clip = this.clips[id];
    if (!clip) {
      throw new Error("Clip not found");
    }
    clip.tags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
    clip.updatedAt = Date.now();
    this.persist();
  }

  async upsert(upsert: ClipUpsert) {
    const clip = this.clips[upsert.id];
    if (!clip) {
      throw new Error("Clip not found");
    }
    if (typeof upsert.text === "string") {
      clip.text = upsert.text;
    }
    if (typeof upsert.html === "string") {
      clip.html = upsert.html;
    }
    if (Array.isArray(upsert.tags)) {
      clip.tags = Array.from(
        new Set(upsert.tags.map((tag) => tag.trim()).filter(Boolean)),
      );
    }
    if (typeof upsert.favorite === "boolean") {
      clip.favorite = upsert.favorite;
    }
    if (typeof upsert.board === "string" || upsert.board === null) {
      clip.board = upsert.board ?? undefined;
    }
    if (typeof upsert.ocrText === "string" || upsert.ocrText === null) {
      clip.ocrText = upsert.ocrText ?? undefined;
    }
    clip.updatedAt = Date.now();
    this.persist();
  }

  private persist() {
    this.store.set("clips", this.clips);
  }
}

class ClipboardWatcher {
  private timer: NodeJS.Timer | undefined;
  private suppressHash: string | undefined;

  constructor(private readonly repository: ClipboardRepository) {}

  start() {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.captureClipboard();
    }, 800);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  suppress(hash: string | undefined) {
    this.suppressHash = hash;
  }

  private async captureClipboard() {
    try {
      const content = this.readClipboard();
      if (!content) {
        return;
      }
      if (content.hash && content.hash === this.suppressHash) {
        this.suppressHash = undefined;
        return;
      }

      const existing = content.hash ? this.repository.findByHash(content.hash) : undefined;
      if (existing) {
        await this.repository.refreshClip(existing, content);
        return;
      }
      await this.repository.createClip(content);
    } catch (error) {
      console.error("Clipboard capture failed", error);
    }
  }

  private readClipboard(): ClipboardContent | null {
    const availableFormats = clipboard.availableFormats();

    const image = clipboard.readImage();
    if (availableFormats.some((format) => format.startsWith("image")) && !image.isEmpty()) {
      const png = image.toPNG();
      return {
        type: "image",
        imageBuffer: png,
        imageDataUrl: image.toDataURL(),
        hash: computeHash(Buffer.concat([Buffer.from("image"), png])),
      };
    }

    const html = clipboard.readHTML();
    const text = clipboard.readText();

    if (html && html.trim().length > 0 && html !== text) {
      return {
        type: "html",
        html,
        text: text || undefined,
        hash: computeHash(`html:${html}`),
      };
    }

    if (text && text.trim().length > 0) {
      return {
        type: "text",
        text,
        hash: computeHash(`text:${text}`),
      };
    }

    return null;
  }
}

const computeHash = (input: string | Buffer): string => {
  if (typeof input === "string" && input.length === 0) {
    return emptyHash;
  }
  if (Buffer.isBuffer(input) && input.byteLength === 0) {
    return emptyHash;
  }
  const hash = createHash("sha1");
  hash.update(input);
  return hash.digest("hex");
};

const getClipHash = (clip: Clip): string | undefined => {
  if (clip.hash && clip.hash !== emptyHash) {
    return clip.hash;
  }
  switch (clip.type) {
    case "text":
      return computeHash(`text:${clip.text ?? ""}`);
    case "html":
      return computeHash(`html:${clip.html ?? clip.text ?? ""}`);
    case "image":
      return clip.imagePath ? computeHash(`image-path:${clip.imagePath}`) : undefined;
    default:
      return undefined;
  }
};

const writeClipToClipboard = async (
  clip: Clip,
  repository: ClipboardRepository,
): Promise<string | undefined> => {
  switch (clip.type) {
    case "text":
      if (clip.text) {
        clipboard.writeText(clip.text);
      }
      break;
    case "html":
      clipboard.write({
        html: clip.html ?? clip.text ?? "",
        text: clip.text ?? clip.html ?? "",
      });
      break;
    case "image": {
      if (clip.imagePath) {
        try {
          const fileImage = nativeImage.createFromPath(clip.imagePath);
          if (!fileImage.isEmpty()) {
            clipboard.writeImage(fileImage);
            break;
          }
        } catch (error) {
          console.warn("Failed to load clip image from disk", error);
        }
      }
      if (clip.imagePreview) {
        const previewImage = nativeImage.createFromDataURL(clip.imagePreview);
        if (!previewImage.isEmpty()) {
          clipboard.writeImage(previewImage);
        }
      }
      break;
    }
    default:
      if (clip.text) {
        clipboard.writeText(clip.text);
      }
  }
  await repository.refreshClip(clip);
  return getClipHash(clip);
};

export const initializeClipboardFeature = async (application: App) => {
  const repository = new ClipboardRepository(application.getPath("userData"));
  await repository.ensureDirectories();
  const watcher = new ClipboardWatcher(repository);
  watcher.start();

  application.on("before-quit", () => {
    watcher.stop();
  });

  ipcMain.handle(CHANNELS.CLIPBOARD.GET_HISTORY, () => repository.getAll());

  ipcMain.handle(CHANNELS.CLIPBOARD.COPY, async (_event, id: string) => {
    const clip = repository.findById(id);
    if (!clip) {
      throw new Error("Clip not found");
    }
    const hash = await writeClipToClipboard(clip, repository);
    watcher.suppress(hash);
  });

  ipcMain.handle(CHANNELS.CLIPBOARD.DELETE, async (_event, id: string) => {
    await repository.deleteClip(id);
  });

  ipcMain.handle(CHANNELS.CLIPBOARD.UPSERT, async (_event, upsert: ClipUpsert) => {
    await repository.upsert(upsert);
    return upsert.id;
  });

  ipcMain.handle(
    CHANNELS.CLIPBOARD.SET_TAGS,
    async (_event, payload: { id: string; tags: string[] }) => {
      await repository.setTags(payload.id, payload.tags);
    },
  );

  ipcMain.handle(CHANNELS.CLIPBOARD.OCR_IMAGE, () => {
    throw new Error("OCR not implemented yet");
  });
};

