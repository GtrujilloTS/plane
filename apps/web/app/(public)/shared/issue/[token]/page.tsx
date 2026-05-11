import { useParams } from "react-router";
import { PublicIssueView } from "@/custom/shared-issue/public-issue-view";

export const meta = () => [
  { title: "Issue compartido" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function SharedIssuePage() {
  const { token } = useParams<{ token: string }>();
  return <PublicIssueView token={token ?? ""} />;
}
