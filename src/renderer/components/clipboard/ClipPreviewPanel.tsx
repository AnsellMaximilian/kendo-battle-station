import { Button, Chip } from "@progress/kendo-react-buttons";
import { MultiSelect, MultiSelectChangeEvent } from "@progress/kendo-react-dropdowns";
import type { ClipSummary } from "../../../shared/types";

interface ClipPreviewPanelProps {
  clip?: ClipSummary | null;
  availableTags: string[];
  onCopy: (clip: ClipSummary) => void;
  onDelete: (clip: ClipSummary) => void;
  onToggleFavorite: (clip: ClipSummary, nextFavorite: boolean) => void;
  onTagsChange: (clip: ClipSummary, tags: string[]) => void;
}

const ClipPreviewPanel = ({
  clip,
  availableTags,
  onCopy,
  onDelete,
  onToggleFavorite,
  onTagsChange,
}: ClipPreviewPanelProps) => {
  const handleFavoriteToggle = () => {
    if (!clip) {
      return;
    }
    onToggleFavorite(clip, !clip.favorite);
  };

  const handleCopyClick = () => {
    if (!clip) {
      return;
    }
    onCopy(clip);
  };

  const handleDeleteClick = () => {
    if (!clip) {
      return;
    }
    onDelete(clip);
  };

  const handleTagsChange = (event: MultiSelectChangeEvent) => {
    if (!clip) {
      return;
    }
    const value = (event.value ?? []) as string[];
    onTagsChange(clip, value);
  };

  if (!clip) {
    return (
      <div className="clipboard-preview clipboard-preview--empty">
        <h3>Select an item</h3>
        <p>Choose a clip from the history to inspect details, copy, or update tags.</p>
      </div>
    );
  }

  const formattedCreated = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(clip.createdAt);

  const formattedUpdated = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(clip.updatedAt);

  return (
    <div className="clipboard-preview">
      <div className="clipboard-preview__header">
        <div>
          <h3>
            {clip.type === "html"
              ? "HTML snippet"
              : clip.type === "image"
              ? "Image"
              : clip.type === "file"
              ? "File reference"
              : "Text snippet"}
          </h3>
          <p className="clipboard-preview__meta">Created {formattedCreated}</p>
        </div>
        <div className="clipboard-preview__actions">
          <Button
            look="flat"
            icon={clip.favorite ? "favorite" : "favorite-outline"}
            onClick={handleFavoriteToggle}
            title={clip.favorite ? "Remove from favorites" : "Mark as favorite"}
          >
            {clip.favorite ? "Favorited" : "Favorite"}
          </Button>
          <Button
            look="flat"
            icon="copy"
            onClick={handleCopyClick}
            title="Copy back to system clipboard"
          >
            Copy
          </Button>
          <Button look="flat" icon="trash" onClick={handleDeleteClick} title="Remove this clip">
            Delete
          </Button>
        </div>
      </div>

      <div className="clipboard-preview__content">
        {clip.type === "image" && clip.imagePreview ? (
          <img src={clip.imagePreview} alt="Clipboard capture" className="clipboard-preview__image" />
        ) : clip.type === "html" && clip.html ? (
          <div
            className="clipboard-preview__html"
            dangerouslySetInnerHTML={{ __html: clip.html }}
          />
        ) : (
          <pre className="clipboard-preview__text">{clip.text ?? clip.ocrText ?? "(empty)"}</pre>
        )}
        {clip.type === "file" && clip.filePath && (
          <div className="clipboard-preview__file">
            <span className="k-icon k-i-attachment" aria-hidden="true" />
            <span>{clip.filePath}</span>
          </div>
        )}
        {clip.ocrText && clip.type === "image" && (
          <div className="clipboard-preview__ocr">
            <h4>OCR text</h4>
            <pre>{clip.ocrText}</pre>
          </div>
        )}
      </div>

      <div className="clipboard-preview__footer">
        <div className="clipboard-preview__tags">
          <label htmlFor="clip-tags">Tags</label>
          <MultiSelect
            id="clip-tags"
            data={availableTags}
            allowCustom
            placeholder="Add tags"
            value={clip.tags}
            onChange={handleTagsChange}
          />
          {clip.tags.length > 0 && (
            <div className="clipboard-preview__tag-list">
              {clip.tags.map((tag) => (
                <Chip key={tag} text={tag} />
              ))}
            </div>
          )}
        </div>
        <div className="clipboard-preview__meta-grid">
          <div>
            <span className="clipboard-preview__meta-label">Updated</span>
            <span className="clipboard-preview__meta-value">{formattedUpdated}</span>
          </div>
          {clip.board && (
            <div>
              <span className="clipboard-preview__meta-label">Board</span>
              <span className="clipboard-preview__meta-value">{clip.board}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClipPreviewPanel;
