import { Badge } from "./ui";

function SourceBadge({ source }) {
  return <Badge variant="muted">{source || "Source"}</Badge>;
}

export default SourceBadge;
