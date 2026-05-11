import { Outlet } from "react-router";

export default function SharedIssueLayout() {
  return (
    <div className="h-full overflow-y-auto bg-canvas text-primary">
      <Outlet />
    </div>
  );
}
