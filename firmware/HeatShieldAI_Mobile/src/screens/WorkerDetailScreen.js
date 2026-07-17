import React from "react";
import WorkerDetailContent from "../components/WorkerDetailContent";
import { useAuth } from "../context/AuthContext";

// Supervisor drill-down route (pushed on top of the grid, so the stack
// navigator's native back button/gesture already handles "back to grid" --
// no custom back button needed here).
export default function WorkerDetailScreen({ route }) {
  const { profile } = useAuth();
  const { workerId } = route.params;
  return <WorkerDetailContent workerId={workerId} showManagement={profile?.role === "supervisor"} />;
}
