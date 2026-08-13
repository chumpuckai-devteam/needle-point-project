import { DragEvent, useEffect, useId, useState } from "react";
import { Plus } from "lucide-react";
import { IMAGE_ACCEPT, MEDIA_HELP, validateImageFile } from "../api/images";

export type ImageFilePickerProps = {
  /** Field label above the dropzone / preview. */
  label?: string;
  /** Optional existing remote/local image shown when no file is selected. */
  existingPreview?: string;
  /** Called when user removes the image entirely (file + URL + existing). */
  onClearExisting?: () => void;
  /**
   * Optional controlled URL (legacy). Prefer upload-only — when showUrlField is false
   * this is only used as a fallback preview string from parent state.
   */
  urlValue?: string;
  onUrlChange?: (url: string) => void;
  /** Selected file for parent upload on submit. null when cleared. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Validation / pick error shown under the control. */
  error?: string;
  onErrorChange?: (error: string) => void;
  disabled?: boolean;
  /** When false, file input is disabled. */
  canUpload?: boolean;
  compact?: boolean;
  /** @deprecated URL paste is off by default for product posts. */
  showUrlField?: boolean;
  urlLabel?: string;
  helpText?: string;
  /** input accept attribute */
  accept?: string;
};

/**
 * Validated optional image picker: file dropzone + local preview.
 * Does not upload — parent receives File and should upload on form submit.
 */
export function ImageFilePicker({
  label = "Photo",
  existingPreview = "",
  onClearExisting,
  urlValue = "",
  onUrlChange,
  file,
  onFileChange,
  error = "",
  onErrorChange,
  disabled = false,
  canUpload = true,
  compact = false,
  showUrlField = false,
  urlLabel = "Or image URL",
  helpText = MEDIA_HELP.photo,
  accept = IMAGE_ACCEPT,
}: ImageFilePickerProps) {
  const fileInputId = useId();
  const [blobPreview, setBlobPreview] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setBlobPreview("");
      return;
    }
    const next = URL.createObjectURL(file);
    setBlobPreview(next);
    return () => {
      URL.revokeObjectURL(next);
    };
  }, [file]);

  const preview = blobPreview || urlValue.trim() || existingPreview;
  const dropzoneClass = ["image-upload-dropzone", compact ? "compact" : "", dragging ? "is-dragging" : ""]
    .filter(Boolean)
    .join(" ");
  const previewClass = compact ? "image-upload-preview compact" : "image-upload-preview";
  const dropEnabled = canUpload && !disabled;

  function setError(message: string) {
    onErrorChange?.(message);
  }

  function pickFile(next: File | null) {
    if (!next) return;
    const invalid = validateImageFile(next);
    if (invalid) {
      setError(invalid);
      return;
    }
    onFileChange(next);
    onUrlChange?.("");
    setError("");
  }

  function clearAll() {
    onFileChange(null);
    onUrlChange?.("");
    onClearExisting?.();
    setError("");
    setDragging(false);
  }

  function onDragEnter(event: DragEvent) {
    if (!dropEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }

  function onDragOver(event: DragEvent) {
    if (!dropEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDragLeave(event: DragEvent) {
    if (!dropEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setDragging(false);
  }

  function onDrop(event: DragEvent) {
    if (!dropEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const next = event.dataTransfer.files?.[0] ?? null;
    pickFile(next);
  }

  return (
    <div className="image-upload-field">
      <span className="field-label">{label}</span>
      {preview ? (
        <div
          className={previewClass}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <img src={preview} alt="" />
          <div className="card-actions wrap">
            <label className="secondary file-button" htmlFor={fileInputId}>
              {canUpload ? "Replace photo" : "Choose photo"}
            </label>
            <button className="secondary" type="button" onClick={clearAll} disabled={disabled}>
              Remove
            </button>
          </div>
          {dragging && dropEnabled ? <p className="field-help">Drop to replace photo</p> : null}
        </div>
      ) : (
        <label
          className={dropzoneClass}
          htmlFor={fileInputId}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <span className="action-card-icon">
            <Plus size={18} />
          </span>
          <strong>{canUpload ? "Upload a photo" : "Sign in to upload"}</strong>
          <span>{helpText}</span>
        </label>
      )}
      <input
        id={fileInputId}
        type="file"
        accept={accept}
        className="visually-hidden"
        disabled={disabled || !canUpload}
        onChange={(event) => {
          pickFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      {showUrlField ? (
        <label>
          <span className="field-label">{urlLabel}</span>
          <input
            value={urlValue}
            onChange={(event) => {
              onFileChange(null);
              onUrlChange?.(event.target.value);
              setError("");
            }}
            placeholder="https://… or leave blank for default"
            disabled={disabled}
          />
        </label>
      ) : null}
      {error ? <p className="field-help error-text">{error}</p> : null}
    </div>
  );
}
