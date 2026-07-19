import { useEffect, useId, useState } from "react";
import { Plus } from "lucide-react";
import { validateImageFile } from "../api/images";

export type ImageFilePickerProps = {
  /** Field label above the dropzone / preview. */
  label?: string;
  /** Optional existing remote/local image shown when no file is selected. */
  existingPreview?: string;
  /** Called when user removes the image entirely (file + URL + existing). */
  onClearExisting?: () => void;
  /** Controlled image URL fallback (paste path). */
  urlValue: string;
  onUrlChange: (url: string) => void;
  /** Selected file for parent upload on submit. null when cleared. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Validation / pick error shown under the control. */
  error?: string;
  onErrorChange?: (error: string) => void;
  disabled?: boolean;
  /** When false, file input is disabled (URL still works). */
  canUpload?: boolean;
  compact?: boolean;
  urlLabel?: string;
  helpText?: string;
  /** input accept attribute */
  accept?: string;
};

/**
 * Validated optional image picker: file dropzone + local preview + URL fallback.
 * Does not upload — parent receives File and should upload on form submit.
 */
export function ImageFilePicker({
  label = "Photo",
  existingPreview = "",
  onClearExisting,
  urlValue,
  onUrlChange,
  file,
  onFileChange,
  error = "",
  onErrorChange,
  disabled = false,
  canUpload = true,
  compact = false,
  urlLabel = "Or image URL",
  helpText = "JPG, PNG, WebP, or GIF up to 8MB. Optional — leave blank for the default image.",
  accept = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif",
}: ImageFilePickerProps) {
  const fileInputId = useId();
  const [blobPreview, setBlobPreview] = useState("");

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
  const dropzoneClass = compact ? "image-upload-dropzone compact" : "image-upload-dropzone";
  const previewClass = compact ? "image-upload-preview compact" : "image-upload-preview";

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
    // Prefer uploaded file over a previous pasted URL until save
    onUrlChange("");
    setError("");
  }

  function clearAll() {
    onFileChange(null);
    onUrlChange("");
    onClearExisting?.();
    setError("");
  }

  return (
    <div className="image-upload-field">
      <span className="field-label">{label}</span>
      {preview ? (
        <div className={previewClass}>
          <img src={preview} alt="" />
          <div className="card-actions wrap">
            <label className="secondary file-button" htmlFor={fileInputId}>
              {canUpload ? "Replace photo" : "Choose photo"}
            </label>
            <button className="secondary" type="button" onClick={clearAll} disabled={disabled}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className={dropzoneClass} htmlFor={fileInputId}>
          <span className="action-card-icon">
            <Plus size={18} />
          </span>
          <strong>{canUpload ? "Upload a photo" : "Add a photo URL"}</strong>
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
      <label>
        <span className="field-label">{urlLabel}</span>
        <input
          value={urlValue}
          onChange={(event) => {
            onFileChange(null);
            onUrlChange(event.target.value);
            setError("");
          }}
          placeholder="https://… or leave blank for default"
          disabled={disabled}
        />
      </label>
      {error ? <p className="field-help error-text">{error}</p> : null}
    </div>
  );
}
