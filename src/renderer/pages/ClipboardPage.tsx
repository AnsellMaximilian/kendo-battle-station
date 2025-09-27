import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import {
  MultiSelect,
  MultiSelectChangeEvent,
} from "@progress/kendo-react-dropdowns";
import {
  Notification,
  NotificationGroup,
} from "@progress/kendo-react-notification";
import {
  Grid,
  GridCellProps,
  GridColumn as Column,
  GridRowClickEvent,
} from "@progress/kendo-react-grid";
import {
  TabStrip,
  TabStripSelectEventArguments,
  TabStripTab,
} from "@progress/kendo-react-layout";

import { MetricCard } from "../components/dashboard/MetricCard";
import type { MetricCardProps } from "../components/dashboard/MetricCard";
import ClipPreviewPanel from "../components/clipboard/ClipPreviewPanel";
import type { ClipSummary } from "../../shared/types";

const typeTabs = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "image", label: "Images" },
  { id: "html", label: "HTML" },
  { id: "file", label: "Files" },
] as const;

interface NotificationMessage {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

interface GridRow extends ClipSummary {
  selected?: boolean;
  previewText: string;
  updatedLabel: string;
}

const stripHtml = (value: string | undefined) =>
  value ? value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

const toPreviewText = (clip: ClipSummary) => {
  if (clip.type === "html") {
    return stripHtml(clip.html) || stripHtml(clip.text) || "HTML snippet";
  }
  if (clip.type === "image") {
    return clip.ocrText || "Image";
  }
  if (clip.type === "file") {
    return clip.filePath ?? "File reference";
  }
  return clip.text?.replace(/\s+/g, " ").slice(0, 160) ?? "";
};

const typeIcons: Record<string, string> = {
  text: "k-i-file-txt",
  image: "k-i-image",
  html: "k-i-code",
  file: "k-i-attachment",
};

const TypeCell = (props: GridCellProps) => {
  const dataItem = props.dataItem as ClipSummary;
  const iconClass = typeIcons[dataItem.type] ?? "k-i-clipboard";
  const label = dataItem.type.charAt(0).toUpperCase() + dataItem.type.slice(1);
  return (
    <td {...props.tdProps}>
      <span className={`k-icon ${iconClass}`} aria-hidden="true" />
      <span className="clipboard-grid__type-label">{label}</span>
    </td>
  );
};

const TagsCell = (props: GridCellProps) => {
  const dataItem = props.dataItem as ClipSummary;
  if (!dataItem.tags.length) {
    return <td {...props.tdProps}>—</td>;
  }
  return (
    <td {...props.tdProps}>
      <div className="clipboard-grid__tags">
        {dataItem.tags.map((tag) => (
          <span key={tag} className="clipboard-grid__tag-chip">
            {tag}
          </span>
        ))}
      </div>
    </td>
  );
};

const DateCell = (props: GridCellProps) => {
  const dataItem = props.dataItem as GridRow;
  return <td {...props.tdProps}>{dataItem.updatedLabel}</td>;
};

export const ClipboardPage = () => {
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const pushNotification = useCallback((text: string, type: NotificationMessage["type"]) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, text, type }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const history = await window.api.clipboard.getHistory();
      setClips(history);
      if (history.length && !history.find((clip) => clip.id === selectedId)) {
        setSelectedId(history[0].id);
      }
    } catch (error) {
      console.error("Failed to load clipboard history", error);
      pushNotification("Failed to load clipboard history", "error");
    } finally {
      setLoading(false);
    }
  }, [pushNotification, selectedId]);

  useEffect(() => {
    void fetchHistory();
    const interval = window.setInterval(() => {
      void fetchHistory();
    }, 15000);
    return () => {
      window.clearInterval(interval);
    };
  }, [fetchHistory]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    clips.forEach((clip) => {
      clip.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [clips]);

  const activeType = typeTabs[activeTab]?.id ?? "all";

  const filteredClips = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const requiresAllTags = tagFilter.length > 0;

    return clips.filter((clip) => {
      if (activeType !== "all" && clip.type !== activeType) {
        return false;
      }
      if (requiresAllTags && !tagFilter.every((tag) => clip.tags.includes(tag))) {
        return false;
      }
      if (!term) {
        return true;
      }
      const haystack = [
        clip.text,
        clip.html,
        clip.ocrText,
        clip.tags.join(" "),
        clip.board,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clips, searchTerm, activeType, tagFilter]);

  const gridData = useMemo<GridRow[]>(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return filteredClips.map((clip) => ({
      ...clip,
      selected: clip.id === selectedId,
      previewText: toPreviewText(clip),
      updatedLabel: formatter.format(clip.updatedAt),
    }));
  }, [filteredClips, selectedId]);

  const selectedClip = useMemo(
    () => clips.find((clip) => clip.id === selectedId) ?? null,
    [clips, selectedId],
  );

  const summaryCards: MetricCardProps[] = useMemo(() => {
    const total = clips.length;
    const textCount = clips.filter((clip) => clip.type === "text").length;
    const imageCount = clips.filter((clip) => clip.type === "image").length;
    const favoriteCount = clips.filter((clip) => clip.favorite).length;
    return [
      {
        title: "Total items",
        value: total.toString(),
        helperText: "All captured records",
        icon: "clipboard",
      },
      {
        title: "Text snippets",
        value: textCount.toString(),
        helperText: "Plain and formatted text",
        icon: "file-txt",
      },
      {
        title: "Images",
        value: imageCount.toString(),
        helperText: "Screenshots & pasted images",
        icon: "image",
      },
      {
        title: "Favorites",
        value: favoriteCount.toString(),
        helperText: "Pinned for quick access",
        icon: "star",
      },
    ];
  }, [clips]);

  const handleRowClick = (event: GridRowClickEvent) => {
    const dataItem = event.dataItem as ClipSummary;
    setSelectedId(dataItem.id);
  };

  const handleCopy = async (clip: ClipSummary) => {
    try {
      await window.api.clipboard.copyToClipboard(clip.id);
      pushNotification("Copied to system clipboard", "success");
      void fetchHistory();
    } catch (error) {
      console.error("Failed to copy clip", error);
      pushNotification("Copy failed", "error");
    }
  };

  const handleDelete = async (clip: ClipSummary) => {
    if (!window.confirm("Delete this clip from history?")) {
      return;
    }
    try {
      await window.api.clipboard.delete(clip.id);
      pushNotification("Clip removed", "info");
      void fetchHistory();
    } catch (error) {
      console.error("Failed to delete clip", error);
      pushNotification("Delete failed", "error");
    }
  };

  const handleFavoriteToggle = async (clip: ClipSummary, favorite: boolean) => {
    try {
      await window.api.clipboard.upsert({ id: clip.id, favorite });
      pushNotification(favorite ? "Marked as favorite" : "Removed from favorites", "success");
      void fetchHistory();
    } catch (error) {
      console.error("Failed to update favorite", error);
      pushNotification("Update failed", "error");
    }
  };

  const handleTagsUpdate = async (clip: ClipSummary, tags: string[]) => {
    try {
      await window.api.clipboard.setTags(clip.id, tags);
      pushNotification("Tags updated", "success");
      void fetchHistory();
    } catch (error) {
      console.error("Failed to update tags", error);
      pushNotification("Tag update failed", "error");
    }
  };

  const handleTabSelect = (event: TabStripSelectEventArguments) => {
    setActiveTab(event.selected);
  };

  const handleRefresh = () => {
    void fetchHistory();
  };

  const handleTagFilterChange = (event: MultiSelectChangeEvent) => {
    setTagFilter((event.value ?? []) as string[]);
  };

  return (
    <div className="clipboard-page">
      <NotificationGroup className="clipboard-notifications">
        {notifications.map((item) => (
          <Notification
            key={item.id}
            type={{ style: item.type, icon: true }}
            closable={false}
          >
            {item.text}
          </Notification>
        ))}
      </NotificationGroup>

      <div className="clipboard-header">
        <div>
          <h1>Clipboard &amp; Snippets Studio</h1>
          <p className="clipboard-header__subtitle">
            Capture, tag, and reuse clipboard snippets from across your workspace.
          </p>
        </div>
        <div className="clipboard-header__actions">
          <Button icon="refresh" look="flat" onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="metrics-grid clipboard-metrics">
        {summaryCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="clipboard-filters">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.value ?? "")}
          placeholder="Search snippets, tags, or OCR text"
          prefixIcon="search"
        />
        <MultiSelect
          data={availableTags}
          placeholder="Filter by tag"
          allowCustom={false}
          value={tagFilter}
          onChange={handleTagFilterChange}
        />
      </div>

      <div className="clipboard-tabs">
        <TabStrip selected={activeTab} onSelect={handleTabSelect}>
          {typeTabs.map((tab) => (
            <TabStripTab key={tab.id} title={tab.label} />
          ))}
        </TabStrip>
      </div>

      <div className="clipboard-content">
        <div className="clipboard-grid-container">
          <Grid
            data={gridData}
            style={{ flex: 1 }}
            selectedField="selected"
            onRowClick={handleRowClick}
            rowHeight={56}
          >
            <Column field="type" title="Type" width="120px" cell={TypeCell} />
            <Column field="previewText" title="Preview" />
            <Column field="tags" title="Tags" width="180px" cell={TagsCell} />
            <Column field="updatedLabel" title="Updated" width="190px" cell={DateCell} />
          </Grid>
        </div>
        <div className="clipboard-preview-container">
          <ClipPreviewPanel
            clip={selectedClip}
            availableTags={availableTags}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onToggleFavorite={handleFavoriteToggle}
            onTagsChange={handleTagsUpdate}
          />
        </div>
      </div>
    </div>
  );
};



