import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { HiArrowUpTray as Upload, HiPhoto as Photo, HiArrowPath as Loader2 } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { calculateAvatarCrop, validateAvatarFile } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const STOCK_AVATARS = [
  { name: "Orbit", background: "#18181b", accent: "#f4f4f5", detail: "#71717a" },
  { name: "Cobalt", background: "#172554", accent: "#60a5fa", detail: "#dbeafe" },
  { name: "Forest", background: "#052e16", accent: "#4ade80", detail: "#dcfce7" },
  { name: "Ember", background: "#431407", accent: "#fb923c", detail: "#ffedd5" },
  { name: "Plum", background: "#3b0764", accent: "#c084fc", detail: "#f3e8ff" },
  { name: "Lagoon", background: "#083344", accent: "#22d3ee", detail: "#cffafe" },
] as const;

export interface AvatarPickerProps {
  onUpload: (file: File) => Promise<string>;
  onUploaded: (url: string) => void | Promise<void>;
  onPendingChange?: (pending: boolean) => void;
  afterDropzone?: ReactNode;
  className?: string;
}

export function AvatarPicker({ onUpload, onUploaded, onPendingChange, afterDropzone, className }: AvatarPickerProps) {
  const inputId = useId();
  const controlId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  function chooseFile(file: File) {
    setError(null);
    const validationError = validateAvatarFile(file);
    if (validationError) return setError(validationError);
    setSourceFile(file);
    setSourceUrl(URL.createObjectURL(file));
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setCropOpen(true);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) chooseFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) chooseFile(file);
  }

  async function applyCrop() {
    if (!sourceFile) return;
    const saved = await persistAvatar(() => cropAvatar(sourceFile, zoom, offsetX, offsetY));
    if (saved) setCropOpen(false);
  }

  async function chooseStock(index: number) {
    await persistAvatar(() => createStockAvatar(index));
  }

  async function persistAvatar(createFile: () => File | Promise<File>): Promise<boolean> {
    if (processingRef.current) return false;
    processingRef.current = true;
    setPending(true);
    onPendingChange?.(true);
    setError(null);
    try {
      const file = await createFile();
      const url = await onUpload(file);
      await onUploaded(url);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this avatar.");
      return false;
    } finally {
      processingRef.current = false;
      setPending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <div data-slot="avatar-picker" className={cn("flex flex-col gap-3", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose an avatar image"
        onChange={onFile}
      />
      <div
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onDrop}
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-background/30 p-4 text-center transition-colors data-[dragging]:border-foreground/60 data-[dragging]:bg-secondary/50"
      >
        <Photo className="size-5 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">Drop an image here</p>
          <p className="text-xs text-muted-foreground">PNG, JPEG, WebP, or GIF under 2 MB</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()} className="min-w-36">
          {pending && !cropOpen ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
          {pending && !cropOpen ? "Saving…" : "Choose image"}
        </Button>
      </div>

      {afterDropzone}

      <div>
        <Label className="text-xs text-muted-foreground">Choose an abstract avatar</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {STOCK_AVATARS.map((avatar, index) => (
            <button
              key={avatar.name}
              type="button"
              aria-label={`Use ${avatar.name} stock avatar`}
              disabled={pending}
              onClick={() => void chooseStock(index)}
              className="relative size-11 overflow-hidden rounded-full border border-border/70 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              style={{ backgroundColor: avatar.background }}
            >
              <span className="absolute -left-2 top-1 size-8 rounded-full" style={{ backgroundColor: avatar.accent }} />
              <span className="absolute bottom-1 right-0 size-6 rotate-45 rounded-sm" style={{ backgroundColor: avatar.detail }} />
            </button>
          ))}
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Saving avatar" : ""}
      </span>
      {error && !cropOpen ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}

      <Dialog open={cropOpen} onOpenChange={(open) => !pending && setCropOpen(open)}>
        <DialogContent data-slot="avatar-crop-dialog">
          <DialogHeader>
            <DialogTitle>Crop your avatar</DialogTitle>
            <DialogDescription>Adjust the square crop. Your original file is not uploaded.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <CropPreview sourceUrl={sourceUrl} zoom={zoom} offsetX={offsetX} offsetY={offsetY} />
            <CropRange id={`${controlId}-zoom`} label="Zoom" min={1} max={3} step={0.05} value={zoom} onChange={setZoom} />
            <CropRange id={`${controlId}-horizontal`} label="Horizontal position" min={-100} max={100} value={offsetX} onChange={setOffsetX} />
            <CropRange id={`${controlId}-vertical`} label="Vertical position" min={-100} max={100} value={offsetY} onChange={setOffsetY} />
            {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setCropOpen(false)}>Cancel</Button>
            <Button type="button" disabled={pending} onClick={() => void applyCrop()} className="min-w-32">
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Save avatar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CropRange({ id, label, value, onChange, ...props }: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        {...props}
      />
    </div>
  );
}

function CropPreview({ sourceUrl, zoom, offsetX, offsetY }: {
  sourceUrl: string | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceUrl) return;
    const image = new Image();
    let active = true;
    image.onload = () => {
      if (!active) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawCrop(context, image, image.naturalWidth, image.naturalHeight, canvas.width, zoom, offsetX, offsetY);
    };
    image.src = sourceUrl;
    return () => {
      active = false;
      image.onload = null;
      image.src = "";
    };
  }, [sourceUrl, zoom, offsetX, offsetY]);

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={512}
      role="img"
      aria-label="Avatar crop preview"
      className="mx-auto size-64 rounded-full border border-border/70 bg-secondary"
    />
  );
}

async function cropAvatar(file: File, zoom: number, offsetX: number, offsetY: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image editing is unavailable in this browser.");

  drawCrop(context, bitmap, bitmap.width, bitmap.height, size, zoom, offsetX, offsetY);
  bitmap.close();

  const blob = await canvasBlob(canvas, "image/webp", 0.9);
  return new File([blob], "avatar.webp", { type: "image/webp" });
}

function drawCrop(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  size: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const { x, y, width, height } = calculateAvatarCrop(
    sourceWidth,
    sourceHeight,
    size,
    zoom,
    offsetX,
    offsetY,
  );
  context.drawImage(image, x, y, width, height);
}

async function createStockAvatar(index: number): Promise<File> {
  const avatar = STOCK_AVATARS[index % STOCK_AVATARS.length]!;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Avatar creation is unavailable in this browser.");
  context.fillStyle = avatar.background;
  context.fillRect(0, 0, 512, 512);
  context.fillStyle = avatar.accent;
  context.beginPath();
  context.arc(150, 150, 180, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = avatar.detail;
  context.translate(380, 380);
  context.rotate(Math.PI / 4);
  context.fillRect(-110, -110, 220, 220);
  const blob = await canvasBlob(canvas, "image/webp", 0.9);
  return new File([blob], `stock-avatar-${index + 1}.webp`, { type: "image/webp" });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the avatar image.")), type, quality);
  });
}
