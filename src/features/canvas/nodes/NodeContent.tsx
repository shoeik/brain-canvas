import { classifyContent, getYouTubeId, linkLabel, youTubeThumbnail, youTubeWatchUrl } from "../../../lib/content";

/**
 * Read-only rendering of a node's content. The displayed form is *derived*
 * from the content string (text / link / youtube / image) rather than stored,
 * keeping the node model type-less. New content kinds slot in here.
 */
export default function NodeContent({ content }: { content: string }) {
  const kind = classifyContent(content);

  if (!content.trim()) {
    return <span style={{ opacity: 0.35 }}>ダブルクリックで編集</span>;
  }

  switch (kind) {
    case "image":
      return <img className="brain-node__image" src={content.trim()} alt="" draggable={false} />;

    case "youtube": {
      const id = getYouTubeId(content)!;
      return (
        <a
          className="brain-node__yt"
          href={youTubeWatchUrl(id)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={youTubeThumbnail(id)} alt="YouTube thumbnail" draggable={false} />
          <span className="brain-node__yt-badge">▶</span>
        </a>
      );
    }

    case "link":
      return (
        <a
          className="brain-node__link"
          href={content.trim()}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {linkLabel(content)}
        </a>
      );

    default:
      return <div className="brain-node__text">{content}</div>;
  }
}
